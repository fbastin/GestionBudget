from fastapi import FastAPI, Depends, HTTPException, Request, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from typing import List, Optional
from . import models, database, schemas
import csv
import io
import re
from datetime import datetime

app = FastAPI(title='Finance Manager API')

# The frontend is served locally by Vite, which moves to 5174, 5175... when 5173 is busy
ALLOWED_ORIGIN_REGEX = r'http://(localhost|127\.0\.0\.1)(:\d+)?'

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.middleware('http')
async def reject_cross_site_writes(request: Request, call_next):
    # CORS only hides responses from other websites: browsers still send their "simple" requests
    # (e.g. a CSV upload form), so writes coming from any other origin are refused here
    origin = request.headers.get('origin')
    if request.method not in ('GET', 'HEAD', 'OPTIONS') and origin is not None and not re.fullmatch(ALLOWED_ORIGIN_REGEX, origin):
        return JSONResponse(status_code=403, content={'detail': 'Origin not allowed'})
    return await call_next(request)

@app.exception_handler(IntegrityError)
def handle_integrity_error(request: Request, exc: IntegrityError):
    # Raised by the unique snapshot indexes when two requests write the same item and date at once
    return JSONResponse(status_code=409, content={'detail': 'Conflit avec une modification simultanée, veuillez réessayer.'})

database.init_db()

def apply_bank_impact(db: Session, bank_id: Optional[int], amount: float, date, multiplier: int = 1, asset_id: Optional[int] = None):
    """
    Apply or reverse (multiplier=-1) the impact of a payment/expense.
    If asset_id is provided, it is used directly.
    Otherwise, if bank_id is provided, we try to find the 'main' asset of that bank.
    """
    impact = amount * multiplier
    target_asset = None

    if asset_id:
        target_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    elif bank_id:
        bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
        if bank:
            if bank.assets:
                # Priority 1: Type matches 'Banque', 'Cash', 'Liquidités'
                target_asset = next((a for a in bank.assets if a.type in ['Banque', 'Cash', 'Liquidités', 'Checking', 'Chèque']), None)
                if not target_asset:
                    # Priority 2: Name matches bank name
                    target_asset = next((a for a in bank.assets if bank.name.lower() in a.name.lower()), None)
                if not target_asset:
                    # Priority 3: First asset
                    target_asset = bank.assets[0]
            else:
                # No assets, update the bank balance column directly
                bank.balance -= impact
                return

    if target_asset:
        # Update snapshots of the target asset
        snapshots = db.query(models.Snapshot).filter(models.Snapshot.asset_id == target_asset.id, models.Snapshot.date >= date).all()
        for s in snapshots:
            s.amount -= impact
        
        if multiplier > 0:
            exact = db.query(models.Snapshot).filter(models.Snapshot.asset_id == target_asset.id, models.Snapshot.date == date).first()
            if not exact:
                latest = db.query(models.Snapshot).filter(models.Snapshot.asset_id == target_asset.id, models.Snapshot.date < date).order_by(models.Snapshot.date.desc()).first()
                base = latest.amount if latest else 0
                db.add(models.Snapshot(date=date, asset_id=target_asset.id, amount=base - impact))

def resolve_liability_id(db: Session, liability_id: Optional[int], credit_id: Optional[int]) -> Optional[int]:
    """Debt affected by a transaction: the one chosen directly, otherwise the one behind the credit."""
    if liability_id:
        return liability_id
    if credit_id:
        credit = db.query(models.Credit).filter(models.Credit.id == credit_id).first()
        if credit:
            return credit.liability_id
    return None

def apply_liability_impact(db: Session, liability_id: Optional[int], delta: float, date, create_snapshot: bool = True):
    """Add delta to the debt's snapshots from date onwards and, when applying, make sure one exists at date."""
    if not liability_id:
        return
    snapshots = db.query(models.Snapshot).filter(models.Snapshot.liability_id == liability_id, models.Snapshot.date >= date).all()
    for s in snapshots:
        s.amount += delta
    if create_snapshot:
        exact = db.query(models.Snapshot).filter(models.Snapshot.liability_id == liability_id, models.Snapshot.date == date).first()
        if not exact:
            latest = db.query(models.Snapshot).filter(models.Snapshot.liability_id == liability_id, models.Snapshot.date < date).order_by(models.Snapshot.date.desc()).first()
            base = latest.amount if latest else 0
            db.add(models.Snapshot(date=date, liability_id=liability_id, amount=base + delta))

def apply_expense(db: Session, expense, multiplier: int = 1):
    """Apply (multiplier=1) or reverse (-1) an expense: it leaves the bank account and adds to the debt."""
    if expense.bank_id:
        apply_bank_impact(db, expense.bank_id, expense.amount, expense.date, multiplier, asset_id=expense.asset_id)
    liability_id = resolve_liability_id(db, expense.liability_id, expense.credit_id)
    apply_liability_impact(db, liability_id, expense.amount * multiplier, expense.date, create_snapshot=multiplier > 0)

def apply_payment(db: Session, payment, multiplier: int = 1):
    """Apply (multiplier=1) or reverse (-1) a payment: it leaves the bank account and repays the capital of the debt."""
    if payment.bank_id:
        apply_bank_impact(db, payment.bank_id, payment.amount, payment.date, multiplier, asset_id=payment.asset_id)
    liability_id = resolve_liability_id(db, payment.liability_id, payment.credit_id)
    capital = payment.amount - (payment.interest or 0)
    apply_liability_impact(db, liability_id, -capital * multiplier, payment.date, create_snapshot=multiplier > 0)

@app.get('/')
def read_root():
    return {'message': 'Welcome to your Finance Manager API'}

@app.get('/assets')
def get_assets(db: Session = Depends(database.get_db)):
    assets = db.query(models.Asset).all()
    result = []
    for a in assets:
        snapshots = db.query(models.Snapshot).filter(models.Snapshot.asset_id == a.id).order_by(models.Snapshot.date.asc(), models.Snapshot.id.asc()).all()
        investments = db.query(models.Investment).filter(models.Investment.asset_id == a.id).all()
        result.append({
            'id': a.id,
            'name': a.name,
            'type': a.type,
            'location': a.location,
            'details': a.details,
            'bank_id': a.bank_id,
            'snapshots': [{'id': s.id, 'date': str(s.date), 'amount': float(s.amount)} for s in snapshots],
            'investments': [{
                'id': i.id,
                'symbol': i.symbol,
                'quantity': i.quantity,
                'average_cost': i.average_cost,
                'current_price': i.current_price,
                'asset_id': i.asset_id
            } for i in investments]
        })
    return result

@app.get('/investments', response_model=List[schemas.Investment])
def get_investments(db: Session = Depends(database.get_db)):
    return db.query(models.Investment).all()

@app.post('/investments', response_model=schemas.Investment)
def create_investment(investment: schemas.InvestmentCreate, db: Session = Depends(database.get_db)):
    db_investment = models.Investment(**investment.model_dump())
    db.add(db_investment)
    db.commit()
    db.refresh(db_investment)
    return db_investment

@app.patch('/investments/{investment_id}', response_model=schemas.Investment)
def update_investment(investment_id: int, investment_update: schemas.InvestmentUpdate, db: Session = Depends(database.get_db)):
    db_investment = db.query(models.Investment).filter(models.Investment.id == investment_id).first()
    if not db_investment:
        raise HTTPException(status_code=404, detail='Investment not found')
    update_data = investment_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_investment, key, value)
    db.commit()
    db.refresh(db_investment)
    return db_investment

@app.delete('/investments/{investment_id}')
def delete_investment(investment_id: int, db: Session = Depends(database.get_db)):
    db_investment = db.query(models.Investment).filter(models.Investment.id == investment_id).first()
    if not db_investment:
        raise HTTPException(status_code=404, detail='Investment not found')
    db.delete(db_investment)
    db.commit()
    return {'message': 'Investment deleted'}

@app.post('/assets', response_model=schemas.Asset)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(database.get_db)):
    db_asset = models.Asset(**asset.model_dump())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@app.patch('/assets/{asset_id}', response_model=schemas.Asset)
def update_asset(asset_id: int, asset_update: schemas.AssetUpdate, db: Session = Depends(database.get_db)):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail='Asset not found')
    update_data = asset_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == 'details' and db_asset.details and value:
            merged_details = dict(db_asset.details)
            merged_details.update(value)
            setattr(db_asset, key, merged_details)
        else:
            setattr(db_asset, key, value)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@app.delete('/assets/{asset_id}')
def delete_asset(asset_id: int, db: Session = Depends(database.get_db)):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail='Asset not found')
    db.delete(db_asset)
    db.commit()
    return {'message': 'Asset deleted'}

@app.get('/liabilities')
def get_liabilities(db: Session = Depends(database.get_db)):
    liabilities = db.query(models.Liability).all()
    result = []
    for l in liabilities:
        snapshots = db.query(models.Snapshot).filter(models.Snapshot.liability_id == l.id).order_by(models.Snapshot.date.asc(), models.Snapshot.id.asc()).all()
        credits = db.query(models.Credit).filter(models.Credit.liability_id == l.id).all()
        result.append({
            'id': l.id,
            'name': l.name,
            'type': l.type,
            'snapshots': [{'id': s.id, 'date': str(s.date), 'amount': float(s.amount)} for s in snapshots],
            'credits': [{'name': c.name, 'type': c.type, 'limit': c.limit} for c in credits]
        })
    return result

@app.post('/liabilities', response_model=schemas.Liability)
def create_liability(liability: schemas.LiabilityCreate, db: Session = Depends(database.get_db)):
    db_liability = models.Liability(**liability.model_dump())
    db.add(db_liability)
    db.commit()
    db.refresh(db_liability)
    return db_liability

@app.patch('/liabilities/{liability_id}', response_model=schemas.Liability)
def update_liability(liability_id: int, liability_update: schemas.LiabilityUpdate, db: Session = Depends(database.get_db)):
    db_liability = db.query(models.Liability).filter(models.Liability.id == liability_id).first()
    if not db_liability:
        raise HTTPException(status_code=404, detail='Liability not found')
    update_data = liability_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_liability, key, value)
    db.commit()
    db.refresh(db_liability)
    return db_liability

@app.delete('/liabilities/{liability_id}')
def delete_liability(liability_id: int, db: Session = Depends(database.get_db)):
    db_liability = db.query(models.Liability).filter(models.Liability.id == liability_id).first()
    if not db_liability:
        raise HTTPException(status_code=404, detail='Liability not found')
    db.delete(db_liability)
    db.commit()
    return {'message': 'Liability deleted'}

@app.post('/snapshots', response_model=schemas.SnapshotBase)
def create_snapshot(snapshot: schemas.SnapshotCreate, db: Session = Depends(database.get_db)):
    try:
        return save_snapshot(db, snapshot)
    except IntegrityError:
        # A concurrent identical request (e.g. a double click) created this snapshot first: retrying updates it instead
        db.rollback()
        return save_snapshot(db, snapshot)

def save_snapshot(db: Session, snapshot: schemas.SnapshotCreate):
    # Check if a snapshot already exists for this item on this date
    existing = None
    if snapshot.asset_id:
        existing = db.query(models.Snapshot).filter(models.Snapshot.asset_id == snapshot.asset_id, models.Snapshot.date == snapshot.date).first()
    elif snapshot.liability_id:
        existing = db.query(models.Snapshot).filter(models.Snapshot.liability_id == snapshot.liability_id, models.Snapshot.date == snapshot.date).first()
    
    if existing:
        delta = snapshot.amount - existing.amount
        existing.amount = snapshot.amount
        
        # Propagate to future
        if snapshot.asset_id:
            future = db.query(models.Snapshot).filter(models.Snapshot.asset_id == snapshot.asset_id, models.Snapshot.date > snapshot.date).all()
        else:
            future = db.query(models.Snapshot).filter(models.Snapshot.liability_id == snapshot.liability_id, models.Snapshot.date > snapshot.date).all()
        for s in future:
            s.amount += delta
            
        db.commit()
        db.refresh(existing)
        return existing
    
    # New snapshot: propagate delta relative to the state at that date
    if snapshot.asset_id:
        prev = db.query(models.Snapshot).filter(models.Snapshot.asset_id == snapshot.asset_id, models.Snapshot.date < snapshot.date).order_by(models.Snapshot.date.desc()).first()
        base = prev.amount if prev else 0
        delta = snapshot.amount - base
        future = db.query(models.Snapshot).filter(models.Snapshot.asset_id == snapshot.asset_id, models.Snapshot.date > snapshot.date).all()
    else:
        prev = db.query(models.Snapshot).filter(models.Snapshot.liability_id == snapshot.liability_id, models.Snapshot.date < snapshot.date).order_by(models.Snapshot.date.desc()).first()
        base = prev.amount if prev else 0
        delta = snapshot.amount - base
        future = db.query(models.Snapshot).filter(models.Snapshot.liability_id == snapshot.liability_id, models.Snapshot.date > snapshot.date).all()
        
    for s in future:
        s.amount += delta
        
    db_snapshot = models.Snapshot(**snapshot.model_dump())
    db.add(db_snapshot)
    db.commit()
    db.refresh(db_snapshot)
    return db_snapshot

@app.delete('/snapshots/{snapshot_id}')
def delete_snapshot(snapshot_id: int, db: Session = Depends(database.get_db)):
    db_snapshot = db.query(models.Snapshot).filter(models.Snapshot.id == snapshot_id).first()
    if not db_snapshot:
        raise HTTPException(status_code=404, detail='Snapshot not found')
    
    if db_snapshot.asset_id:
        prev = db.query(models.Snapshot).filter(models.Snapshot.asset_id == db_snapshot.asset_id, models.Snapshot.date < db_snapshot.date).order_by(models.Snapshot.date.desc()).first()
        base = prev.amount if prev else 0
        delta = db_snapshot.amount - base
        future = db.query(models.Snapshot).filter(models.Snapshot.asset_id == db_snapshot.asset_id, models.Snapshot.date > db_snapshot.date).all()
    else:
        prev = db.query(models.Snapshot).filter(models.Snapshot.liability_id == db_snapshot.liability_id, models.Snapshot.date < db_snapshot.date).order_by(models.Snapshot.date.desc()).first()
        base = prev.amount if prev else 0
        delta = db_snapshot.amount - base
        future = db.query(models.Snapshot).filter(models.Snapshot.liability_id == db_snapshot.liability_id, models.Snapshot.date > db_snapshot.date).all()

    for s in future:
        s.amount -= delta

    db.delete(db_snapshot)
    db.commit()
    return {'message': 'Snapshot deleted'}

@app.get('/banks', response_model=List[schemas.Bank])
def get_banks(db: Session = Depends(database.get_db)):
    return db.query(models.Bank).all()

@app.post('/banks', response_model=schemas.Bank)
def create_bank(bank: schemas.BankCreate, db: Session = Depends(database.get_db)):
    db_bank = models.Bank(**bank.model_dump())
    db.add(db_bank)
    db.commit()
    db.refresh(db_bank)
    return db_bank

@app.patch('/banks/{bank_id}', response_model=schemas.Bank)
def update_bank(bank_id: int, bank_update: schemas.BankUpdate, db: Session = Depends(database.get_db)):
    db_bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
    if not db_bank:
        raise HTTPException(status_code=404, detail='Bank not found')
    update_data = bank_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_bank, key, value)
    db.commit()
    db.refresh(db_bank)
    return db_bank

def ensure_no_transactions(db: Session, column: str, value: int, label: str):
    """Refuse to delete an account still used by transactions: their impact could no longer be reversed."""
    count = sum(db.query(model).filter(getattr(model, column) == value).count() for model in (models.Expense, models.Payment))
    if count:
        raise HTTPException(status_code=409, detail=f"Impossible de supprimer {label} : {count} transaction(s) y sont liées. Supprimez-les ou changez leur compte d'abord.")

@app.delete('/banks/{bank_id}')
def delete_bank(bank_id: int, db: Session = Depends(database.get_db)):
    db_bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
    if not db_bank:
        raise HTTPException(status_code=404, detail='Bank not found')
    ensure_no_transactions(db, 'bank_id', bank_id, 'cette banque')
    db.delete(db_bank)
    db.commit()
    return {'message': 'Bank deleted'}

@app.get('/credits', response_model=List[schemas.Credit])
def get_credits(db: Session = Depends(database.get_db)):
    return db.query(models.Credit).all()

@app.post('/credits', response_model=schemas.Credit)
def create_credit(credit: schemas.CreditCreate, db: Session = Depends(database.get_db)):
    db_credit = models.Credit(**credit.model_dump())
    db.add(db_credit)
    db.commit()
    db.refresh(db_credit)
    return db_credit

@app.patch('/credits/{credit_id}', response_model=schemas.Credit)
def update_credit(credit_id: int, credit_update: schemas.CreditUpdate, db: Session = Depends(database.get_db)):
    db_credit = db.query(models.Credit).filter(models.Credit.id == credit_id).first()
    if not db_credit:
        raise HTTPException(status_code=404, detail='Credit not found')
    update_data = credit_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_credit, key, value)
    db.commit()
    db.refresh(db_credit)
    return db_credit

@app.delete('/credits/{credit_id}')
def delete_credit(credit_id: int, db: Session = Depends(database.get_db)):
    db_credit = db.query(models.Credit).filter(models.Credit.id == credit_id).first()
    if not db_credit:
        raise HTTPException(status_code=404, detail='Credit not found')
    ensure_no_transactions(db, 'credit_id', credit_id, 'ce crédit')
    db.delete(db_credit)
    db.commit()
    return {'message': 'Credit deleted'}

@app.get('/contributions', response_model=List[schemas.Contribution])
def get_contributions(db: Session = Depends(database.get_db)):
    return db.query(models.Contribution).all()

@app.post('/contributions', response_model=schemas.Contribution)
def create_contribution(contribution: schemas.ContributionCreate, db: Session = Depends(database.get_db)):
    db_contribution = models.Contribution(**contribution.model_dump())
    db.add(db_contribution)
    db.commit()
    db.refresh(db_contribution)
    return db_contribution

@app.patch('/contributions/{contribution_id}', response_model=schemas.Contribution)
def update_contribution(contribution_id: int, contribution_update: schemas.ContributionUpdate, db: Session = Depends(database.get_db)):
    db_contribution = db.query(models.Contribution).filter(models.Contribution.id == contribution_id).first()
    if not db_contribution:
        raise HTTPException(status_code=404, detail='Contribution not found')
    update_data = contribution_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_contribution, key, value)
    db.commit()
    db.refresh(db_contribution)
    return db_contribution

@app.delete('/contributions/{contribution_id}')
def delete_contribution(contribution_id: int, db: Session = Depends(database.get_db)):
    db_contribution = db.query(models.Contribution).filter(models.Contribution.id == contribution_id).first()
    if not db_contribution:
        raise HTTPException(status_code=404, detail='Contribution not found')
    db.delete(db_contribution)
    db.commit()
    return {'message': 'Contribution deleted'}

@app.get('/history', response_model=List[schemas.HistoryItem])
def get_history(db: Session = Depends(database.get_db)):
    # Fetch all dates with activity
    all_dates = db.query(models.Snapshot.date).distinct().order_by(models.Snapshot.date).all()
    all_dates = [d[0] for d in all_dates]
    
    if not all_dates:
        return []
        
    all_assets = db.query(models.Asset).all()
    all_liabilities = db.query(models.Liability).all()
    all_snapshots = db.query(models.Snapshot).order_by(models.Snapshot.date.asc()).all()
    
    history = []
    
    # State tracking
    asset_balances = {a.id: 0.0 for a in all_assets}
    # Initial asset values from details if available
    for a in all_assets:
        if a.details and isinstance(a.details, dict) and 'value' in a.details and a.details['value'] is not None:
            asset_balances[a.id] = float(a.details['value'])
            
    liability_balances = {l.id: 0.0 for l in all_liabilities}
    
    # Assets are known from their first recorded value: before it, the debts alone would give a false net worth
    asset_dates = [s.date for s in all_snapshots if s.asset_id]
    assets_known_from = min(asset_dates) if asset_dates else None

    # Group snapshots by date
    snapshots_by_date = {}
    for s in all_snapshots:
        if s.date not in snapshots_by_date:
            snapshots_by_date[s.date] = []
        snapshots_by_date[s.date].append(s)
        
    # Build history by iterating through dates and updating state
    for d in all_dates:
        # Update balances for this date
        day_snapshots = snapshots_by_date.get(d, [])
        for s in day_snapshots:
            if s.asset_id:
                asset_balances[s.asset_id] = s.amount
            elif s.liability_id:
                liability_balances[s.liability_id] = s.amount
                
        total_assets = sum(asset_balances.values())
        total_liabilities = sum(liability_balances.values())
        known = assets_known_from is None or d >= assets_known_from
        
        history.append({
            'date': d,
            'assets': models.to_cents(total_assets) if known else None,
            'liabilities': models.to_cents(total_liabilities),
            'net_worth': models.to_cents(total_assets - total_liabilities) if known else None
        })
        
    return history

@app.get('/dashboard', response_model=schemas.DashboardData)
def get_dashboard(db: Session = Depends(database.get_db)):
    today = datetime.now().date()
    all_liabilities = db.query(models.Liability).all()
    total_liabilities = 0
    for l in all_liabilities:
        latest = db.query(models.Snapshot).filter(models.Snapshot.liability_id == l.id, models.Snapshot.date <= today).order_by(models.Snapshot.date.desc()).first()
        if latest:
            total_liabilities += latest.amount
    
    all_assets = db.query(models.Asset).all()
    total_assets = 0
    for a in all_assets:
        latest = db.query(models.Snapshot).filter(models.Snapshot.asset_id == a.id, models.Snapshot.date <= today).order_by(models.Snapshot.date.desc()).first()
        if latest:
            total_assets += latest.amount
        elif a.details and 'value' in a.details and a.details['value'] is not None:
            total_assets += float(a.details['value'])
            
    return {
        'total_assets': models.to_cents(total_assets),
        'total_liabilities': models.to_cents(total_liabilities),
        'net_worth': models.to_cents(total_assets - total_liabilities)
    }

@app.get('/expenses', response_model=List[schemas.Expense])
def get_expenses(db: Session = Depends(database.get_db)):
    return db.query(models.Expense).order_by(models.Expense.date.desc()).all()

@app.post('/expenses', response_model=schemas.Expense)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(database.get_db)):
    db_expense = models.Expense(**expense.model_dump())
    db.add(db_expense)
    apply_expense(db, db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@app.patch('/expenses/{expense_id}', response_model=schemas.Expense)
def update_expense(expense_id: int, expense_update: schemas.ExpenseUpdate, db: Session = Depends(database.get_db)):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail='Expense not found')
    apply_expense(db, db_expense, multiplier=-1)
    for key, value in expense_update.model_dump(exclude_unset=True).items():
        setattr(db_expense, key, value)
    apply_expense(db, db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@app.delete('/expenses/{expense_id}')
def delete_expense(expense_id: int, db: Session = Depends(database.get_db)):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail='Expense not found')
    apply_expense(db, db_expense, multiplier=-1)
    db.delete(db_expense)
    db.commit()
    return {'message': 'Expense deleted'}

@app.get('/payments', response_model=List[schemas.Payment])
def get_payments(db: Session = Depends(database.get_db)):
    return db.query(models.Payment).order_by(models.Payment.date.desc()).all()

@app.post('/payments', response_model=schemas.Payment)
def create_payment(payment: schemas.PaymentCreate, db: Session = Depends(database.get_db)):
    db_payment = models.Payment(**payment.model_dump())
    db.add(db_payment)
    apply_payment(db, db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

@app.patch('/payments/{payment_id}', response_model=schemas.Payment)
def update_payment(payment_id: int, payment_update: schemas.PaymentUpdate, db: Session = Depends(database.get_db)):
    db_payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail='Payment not found')
    apply_payment(db, db_payment, multiplier=-1)
    for key, value in payment_update.model_dump(exclude_unset=True).items():
        setattr(db_payment, key, value)
    apply_payment(db, db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

@app.delete('/payments/{payment_id}')
def delete_payment(payment_id: int, db: Session = Depends(database.get_db)):
    db_payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail='Payment not found')
    apply_payment(db, db_payment, multiplier=-1)
    db.delete(db_payment)
    db.commit()
    return {'message': 'Payment deleted'}

@app.post('/expenses/{expense_id}/convert-to-payment', response_model=schemas.Payment)
def convert_expense_to_payment(expense_id: int, payment: schemas.PaymentCreate, db: Session = Depends(database.get_db)):
    """Replace an expense by a payment in a single commit, so nothing is lost if it fails."""
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail='Expense not found')
    apply_expense(db, db_expense, multiplier=-1)
    db.delete(db_expense)
    db_payment = models.Payment(**payment.model_dump())
    db.add(db_payment)
    apply_payment(db, db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

@app.post('/payments/{payment_id}/convert-to-expense', response_model=schemas.Expense)
def convert_payment_to_expense(payment_id: int, expense: schemas.ExpenseCreate, db: Session = Depends(database.get_db)):
    """Replace a payment by an expense in a single commit, so nothing is lost if it fails."""
    db_payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail='Payment not found')
    apply_payment(db, db_payment, multiplier=-1)
    db.delete(db_payment)
    db_expense = models.Expense(**expense.model_dump())
    db.add(db_expense)
    apply_expense(db, db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@app.get('/export/expenses/csv')
def export_expenses_csv(db: Session = Depends(database.get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Description', 'Amount', 'Interest', 'Account', 'Type'])
    
    expenses = db.query(models.Expense).all()
    for e in expenses:
        account_name = ""
        if e.bank:
            account_name = f"Banque: {e.bank.name}"
        elif e.credit:
            account_name = f"Crédit: {e.credit.name}"
        elif e.liability:
            account_name = f"Dette: {e.liability.name}"
        writer.writerow([e.date, e.description, e.amount, 0, account_name, 'Dépense'])
        
    payments = db.query(models.Payment).all()
    for p in payments:
        bank_name = p.bank.name if p.bank else "Cash"
        credit_name = "N/A"
        if p.credit:
            credit_name = p.credit.name
        elif p.liability:
            credit_name = p.liability.name
        account_name = f"{bank_name} -> {credit_name}"
        writer.writerow([p.date, p.description, p.amount, p.interest, account_name, 'Remboursement'])
        
    return Response(content=output.getvalue(), media_type='text/csv', headers={'Content-Disposition': 'attachment; filename=expenses_export.csv'})

def parse_csv_account(db: Session, account: str, is_payment: bool):
    """(bank_id, credit_id, liability_id) from the Account column written by the export."""
    bank_id = credit_id = liability_id = None
    if is_payment:
        # Format: "BankName -> TargetName"
        if " -> " in account:
            bank_part, target_part = account.split(" -> ", 1)
            bank = db.query(models.Bank).filter(models.Bank.name == bank_part.strip()).first()
            if bank:
                bank_id = bank.id
            credit = db.query(models.Credit).filter(models.Credit.name == target_part.strip()).first()
            if credit:
                credit_id = credit.id
            else:
                liability = db.query(models.Liability).filter(models.Liability.name == target_part.strip()).first()
                if liability:
                    liability_id = liability.id
    elif account.startswith("Banque: "):
        bank = db.query(models.Bank).filter(models.Bank.name == account.replace("Banque: ", "").strip()).first()
        if bank:
            bank_id = bank.id
    elif account.startswith("Crédit: "):
        credit = db.query(models.Credit).filter(models.Credit.name == account.replace("Crédit: ", "").strip()).first()
        if credit:
            credit_id = credit.id
    elif account.startswith("Dette: "):
        liability = db.query(models.Liability).filter(models.Liability.name == account.replace("Dette: ", "").strip()).first()
        if liability:
            liability_id = liability.id
    return bank_id, credit_id, liability_id

def count_recorded_transactions(db: Session, model, date, description: str, amount: float, interest: float, bank_id, liability_id) -> int:
    """Transactions already recorded with these values, compared the way the CSV export writes them."""
    return sum(
        1 for t in db.query(model).filter(model.date == date).all()
        if (t.description or '').strip() == description and round(t.amount, 2) == amount
        and round(getattr(t, 'interest', 0) or 0, 2) == interest and t.bank_id == bank_id
        and resolve_liability_id(db, t.liability_id, t.credit_id) == liability_id
    )

@app.post('/import/expenses/csv')
async def import_expenses_csv(file: UploadFile = File(...), db: Session = Depends(database.get_db)):
    content = await file.read()
    try:
        decoded = content.decode('utf-8-sig')
    except UnicodeDecodeError:
        decoded = content.decode('latin-1')
    input_file = io.StringIO(decoded)
    reader = csv.DictReader(input_file)
    
    count = 0
    skipped = 0
    occurrences = {}
    recorded = {}
    for row in reader:
        date_str = row.get('Date', '').strip()
        description = row.get('Description', '').strip()
        amount = row.get('Amount', '').strip()
        interest = row.get('Interest', 0)
        account = row.get('Account', '').strip()
        type_str = row.get('Type', 'Dépense').strip()
        
        if not date_str or not description or not amount:
            continue
            
        try:
            amount_val = models.to_cents(float(amount))
            interest_val = models.to_cents(float(interest)) if interest else 0.0
            clean_date_str = date_str.split('T')[0].split(' ')[0]
            date_val = datetime.strptime(clean_date_str, '%Y-%m-%d').date()
        except ValueError:
            continue

        is_payment = type_str == 'Remboursement'
        bank_id, credit_id, liability_id = parse_csv_account(db, account, is_payment)

        # Skip transactions already recorded (e.g. a file imported twice). Identical rows of the file are
        # legitimate (two coffees the same day), so only as many occurrences as already recorded are skipped.
        model = models.Payment if is_payment else models.Expense
        key = (model, date_val, description, round(amount_val, 2), round(interest_val, 2) if is_payment else 0,
               bank_id, resolve_liability_id(db, liability_id, credit_id))
        if key not in recorded:
            recorded[key] = count_recorded_transactions(db, *key)
        occurrences[key] = occurrences.get(key, 0) + 1
        if occurrences[key] <= recorded[key]:
            skipped += 1
            continue

        fields = dict(date=date_val, description=description, amount=amount_val, bank_id=bank_id, credit_id=credit_id, liability_id=liability_id)
        if is_payment:
            transaction = models.Payment(interest=interest_val, **fields)
            db.add(transaction)
            apply_payment(db, transaction)
        else:
            transaction = models.Expense(**fields)
            db.add(transaction)
            apply_expense(db, transaction)

        # autoflush is disabled: flush so the next rows see the snapshots created by this one
        db.flush()
        count += 1
                
    db.commit()
    return {'message': f'{count} transaction(s) importée(s), {skipped} doublon(s) ignoré(s).'}

@app.get('/export/csv')
def export_csv(db: Session = Depends(database.get_db)):
    today = datetime.now().date()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Category', 'Name', 'Amount', 'Date'])
    
    liabilities = db.query(models.Liability).all()
    for l in liabilities:
        latest = db.query(models.Snapshot).filter(models.Snapshot.liability_id == l.id, models.Snapshot.date <= today).order_by(models.Snapshot.date.desc()).first()
        if latest:
            writer.writerow(['Liability', l.name, latest.amount, latest.date])
            
    assets = db.query(models.Asset).all()
    for a in assets:
        latest = db.query(models.Snapshot).filter(models.Snapshot.asset_id == a.id, models.Snapshot.date <= today).order_by(models.Snapshot.date.desc()).first()
        amount = latest.amount if latest else (a.details.get('value', 0) if a.details else 0)
        date = latest.date if latest else ''
        writer.writerow(['Asset', a.name, amount, date])
        
    return Response(content=output.getvalue(), media_type='text/csv', headers={'Content-Disposition': 'attachment; filename=budget_export.csv'})

@app.post('/import/csv')
async def import_csv(file: UploadFile = File(...), db: Session = Depends(database.get_db)):
    content = await file.read()
    try:
        decoded = content.decode('utf-8-sig')
    except UnicodeDecodeError:
        decoded = content.decode('latin-1')
    input_file = io.StringIO(decoded)
    reader = csv.DictReader(input_file)
    
    count = 0
    for row in reader:
        category = row.get('Category', '').strip()
        name = row.get('Name', '').strip()
        amount = row.get('Amount', '').strip()
        date_str = row.get('Date', '').strip()
        
        if not category or not name or not amount:
            continue
            
        try:
            amount_val = models.to_cents(float(amount))
            if date_str:
                clean_date_str = date_str.split('T')[0].split(' ')[0]
                date_val = datetime.strptime(clean_date_str, '%Y-%m-%d').date()
            else:
                date_val = datetime.now().date()
        except ValueError:
            continue
            
        if category.lower() == 'asset':
            asset = db.query(models.Asset).filter(models.Asset.name == name).first()
            if asset:
                existing = db.query(models.Snapshot).filter(models.Snapshot.asset_id == asset.id, models.Snapshot.date == date_val).first()
                if existing:
                    existing.amount = amount_val
                else:
                    db.add(models.Snapshot(asset_id=asset.id, amount=amount_val, date=date_val))
                count += 1
        elif category.lower() == 'liability':
            liability = db.query(models.Liability).filter(models.Liability.name == name).first()
            if liability:
                existing = db.query(models.Snapshot).filter(models.Snapshot.liability_id == liability.id, models.Snapshot.date == date_val).first()
                if existing:
                    existing.amount = amount_val
                else:
                    db.add(models.Snapshot(liability_id=liability.id, amount=amount_val, date=date_val))
                count += 1

        # autoflush is disabled: flush so a later row for the same item and date updates this snapshot
        db.flush()

    db.commit()
    return {'message': f'{count} snapshots imported successfully'}

