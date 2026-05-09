from fastapi import FastAPI, Depends, HTTPException, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from . import models, database, schemas
import csv
import io
from datetime import datetime

app = FastAPI(title='Finance Manager API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)

database.init_db()

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
    db_investment = models.Investment(**investment.dict())
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
    db_asset = models.Asset(**asset.dict())
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
    db_liability = models.Liability(**liability.dict())
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
        
    db_snapshot = models.Snapshot(**snapshot.dict())
    db.add(db_snapshot)
    db.commit()
    db.refresh(db_snapshot)
    return db_snapshot

@app.delete('/snapshots/{snapshot_id}')
def delete_snapshot(snapshot_id: int, db: Session = Depends(database.get_db)):
    db_snapshot = db.query(models.Snapshot).filter(models.Snapshot.id == snapshot_id).first()
    if not db_snapshot:
        raise HTTPException(status_code=404, detail='Snapshot not found')
    db.delete(db_snapshot)
    db.commit()
    return {'message': 'Snapshot deleted'}

@app.get('/banks', response_model=List[schemas.Bank])
def get_banks(db: Session = Depends(database.get_db)):
    return db.query(models.Bank).all()

@app.post('/banks', response_model=schemas.Bank)
def create_bank(bank: schemas.BankCreate, db: Session = Depends(database.get_db)):
    db_bank = models.Bank(**bank.dict())
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

@app.delete('/banks/{bank_id}')
def delete_bank(bank_id: int, db: Session = Depends(database.get_db)):
    db_bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
    if not db_bank:
        raise HTTPException(status_code=404, detail='Bank not found')
    db.delete(db_bank)
    db.commit()
    return {'message': 'Bank deleted'}

@app.get('/credits', response_model=List[schemas.Credit])
def get_credits(db: Session = Depends(database.get_db)):
    return db.query(models.Credit).all()

@app.post('/credits', response_model=schemas.Credit)
def create_credit(credit: schemas.CreditCreate, db: Session = Depends(database.get_db)):
    db_credit = models.Credit(**credit.dict())
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
    db.delete(db_credit)
    db.commit()
    return {'message': 'Credit deleted'}

@app.get('/contributions', response_model=List[schemas.Contribution])
def get_contributions(db: Session = Depends(database.get_db)):
    return db.query(models.Contribution).all()

@app.post('/contributions', response_model=schemas.Contribution)
def create_contribution(contribution: schemas.ContributionCreate, db: Session = Depends(database.get_db)):
    db_contribution = models.Contribution(**contribution.dict())
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
        
        history.append({
            'date': d,
            'assets': float(total_assets),
            'liabilities': float(total_liabilities),
            'net_worth': float(total_assets - total_liabilities)
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
        'total_assets': float(total_assets),
        'total_liabilities': float(total_liabilities),
        'net_worth': float(total_assets - total_liabilities)
    }

@app.get('/expenses', response_model=List[schemas.Expense])
def get_expenses(db: Session = Depends(database.get_db)):
    return db.query(models.Expense).order_by(models.Expense.date.desc()).all()

@app.post('/expenses', response_model=schemas.Expense)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(database.get_db)):
    db_expense = models.Expense(**expense.dict())
    db.add(db_expense)
    
    # Impact calculations
    if expense.bank_id:
        bank = db.query(models.Bank).filter(models.Bank.id == expense.bank_id).first()
        if bank:
            bank.balance -= expense.amount
            for asset in bank.assets:
                # Update all snapshots from this date onwards
                snapshots = db.query(models.Snapshot).filter(models.Snapshot.asset_id == asset.id, models.Snapshot.date >= expense.date).all()
                for s in snapshots:
                    s.amount -= expense.amount
                
                # If no snapshot exists for exactly this date, we might need to create one to establish the new base
                exact_snapshot = db.query(models.Snapshot).filter(models.Snapshot.asset_id == asset.id, models.Snapshot.date == expense.date).first()
                if not exact_snapshot:
                    latest = db.query(models.Snapshot).filter(models.Snapshot.asset_id == asset.id, models.Snapshot.date < expense.date).order_by(models.Snapshot.date.desc()).first()
                    base = latest.amount if latest else bank.balance + expense.amount
                    db.add(models.Snapshot(date=expense.date, asset_id=asset.id, amount=base - expense.amount))
                    
    if expense.credit_id:
        credit = db.query(models.Credit).filter(models.Credit.id == expense.credit_id).first()
        if credit and credit.liability_id:
            # Update all snapshots from this date onwards
            snapshots = db.query(models.Snapshot).filter(models.Snapshot.liability_id == credit.liability_id, models.Snapshot.date >= expense.date).all()
            for s in snapshots:
                s.amount += expense.amount
                
            exact_snapshot = db.query(models.Snapshot).filter(models.Snapshot.liability_id == credit.liability_id, models.Snapshot.date == expense.date).first()
            if not exact_snapshot:
                latest = db.query(models.Snapshot).filter(models.Snapshot.liability_id == credit.liability_id, models.Snapshot.date < expense.date).order_by(models.Snapshot.date.desc()).first()
                base = latest.amount if latest else 0
                db.add(models.Snapshot(date=expense.date, liability_id=credit.liability_id, amount=base + expense.amount))

    db.commit()
    db.refresh(db_expense)
    return db_expense

@app.patch('/expenses/{expense_id}', response_model=schemas.Expense)
def update_expense(expense_id: int, expense_update: schemas.ExpenseUpdate, db: Session = Depends(database.get_db)):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail='Expense not found')
    
    # Reverse old impact (propagate backwards)
    if db_expense.bank_id:
        bank = db.query(models.Bank).filter(models.Bank.id == db_expense.bank_id).first()
        if bank:
            bank.balance += db_expense.amount
            for asset in bank.assets:
                snapshots = db.query(models.Snapshot).filter(models.Snapshot.asset_id == asset.id, models.Snapshot.date >= db_expense.date).all()
                for s in snapshots:
                    s.amount += db_expense.amount
    if db_expense.credit_id:
        credit = db.query(models.Credit).filter(models.Credit.id == db_expense.credit_id).first()
        if credit and credit.liability_id:
            snapshots = db.query(models.Snapshot).filter(models.Snapshot.liability_id == credit.liability_id, models.Snapshot.date >= db_expense.date).all()
            for s in snapshots:
                s.amount -= db_expense.amount

    # Update data
    update_data = expense_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_expense, key, value)
    
    # Apply new impact (propagate forwards)
    if db_expense.bank_id:
        bank = db.query(models.Bank).filter(models.Bank.id == db_expense.bank_id).first()
        if bank:
            bank.balance -= db_expense.amount
            for asset in bank.assets:
                snapshots = db.query(models.Snapshot).filter(models.Snapshot.asset_id == asset.id, models.Snapshot.date >= db_expense.date).all()
                for s in snapshots:
                    s.amount -= db_expense.amount
                
                exact = db.query(models.Snapshot).filter(models.Snapshot.asset_id == asset.id, models.Snapshot.date == db_expense.date).first()
                if not exact:
                    latest = db.query(models.Snapshot).filter(models.Snapshot.asset_id == asset.id, models.Snapshot.date < db_expense.date).order_by(models.Snapshot.date.desc()).first()
                    base = latest.amount if latest else bank.balance + db_expense.amount
                    db.add(models.Snapshot(date=db_expense.date, asset_id=asset.id, amount=base - db_expense.amount))
    if db_expense.credit_id:
        credit = db.query(models.Credit).filter(models.Credit.id == db_expense.credit_id).first()
        if credit and credit.liability_id:
            snapshots = db.query(models.Snapshot).filter(models.Snapshot.liability_id == credit.liability_id, models.Snapshot.date >= db_expense.date).all()
            for s in snapshots:
                s.amount += db_expense.amount
                
            exact = db.query(models.Snapshot).filter(models.Snapshot.liability_id == credit.liability_id, models.Snapshot.date == db_expense.date).first()
            if not exact:
                latest = db.query(models.Snapshot).filter(models.Snapshot.liability_id == credit.liability_id, models.Snapshot.date < db_expense.date).order_by(models.Snapshot.date.desc()).first()
                base = latest.amount if latest else 0
                db.add(models.Snapshot(date=db_expense.date, liability_id=credit.liability_id, amount=base + db_expense.amount))

    db.commit()
    db.refresh(db_expense)
    return db_expense

@app.delete('/expenses/{expense_id}')
def delete_expense(expense_id: int, db: Session = Depends(database.get_db)):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail='Expense not found')
    
    # Reverse impact (propagate)
    if db_expense.bank_id:
        bank = db.query(models.Bank).filter(models.Bank.id == db_expense.bank_id).first()
        if bank:
            bank.balance += db_expense.amount
            for asset in bank.assets:
                snapshots = db.query(models.Snapshot).filter(models.Snapshot.asset_id == asset.id, models.Snapshot.date >= db_expense.date).all()
                for s in snapshots:
                    s.amount += db_expense.amount
    if db_expense.credit_id:
        credit = db.query(models.Credit).filter(models.Credit.id == db_expense.credit_id).first()
        if credit and credit.liability_id:
            snapshots = db.query(models.Snapshot).filter(models.Snapshot.liability_id == credit.liability_id, models.Snapshot.date >= db_expense.date).all()
            for s in snapshots:
                s.amount -= db_expense.amount

    db.delete(db_expense)
    db.commit()
    return {'message': 'Expense deleted'}

@app.get('/export/expenses/csv')
def export_expenses_csv(db: Session = Depends(database.get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Description', 'Amount', 'Account'])
    
    expenses = db.query(models.Expense).order_by(models.Expense.date.desc()).all()
    for e in expenses:
        account_name = ""
        if e.bank:
            account_name = f"Banque: {e.bank.name}"
        elif e.credit:
            account_name = f"Crédit: {e.credit.name}"
        writer.writerow([e.date, e.description, e.amount, account_name])
        
    return Response(content=output.getvalue(), media_type='text/csv', headers={'Content-Disposition': 'attachment; filename=expenses_export.csv'})

@app.post('/import/expenses/csv')
async def import_expenses_csv(file: UploadFile = File(...), db: Session = Depends(database.get_db)):
    content = await file.read()
    decoded = content.decode('utf-8')
    input_file = io.StringIO(decoded)
    reader = csv.DictReader(input_file)
    
    count = 0
    for row in reader:
        date_str = row.get('Date')
        description = row.get('Description')
        amount = row.get('Amount')
        account = row.get('Account', "")
        
        if not date_str or not description or not amount:
            continue
            
        try:
            amount_val = float(amount)
            date_val = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            continue
            
        bank_id = None
        credit_id = None
        
        if account.startswith("Banque: "):
            bank_name = account.replace("Banque: ", "")
            bank = db.query(models.Bank).filter(models.Bank.name == bank_name).first()
            if bank:
                bank_id = bank.id
        elif account.startswith("Crédit: "):
            credit_name = account.replace("Crédit: ", "")
            credit = db.query(models.Credit).filter(models.Credit.name == credit_name).first()
            if credit:
                credit_id = credit.id
                
        db_expense = models.Expense(
            date=date_val,
            description=description,
            amount=amount_val,
            bank_id=bank_id,
            credit_id=credit_id
        )
        db.add(db_expense)
        count += 1
                
    db.commit()
    return {'message': f'{count} expenses imported successfully'}

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
    decoded = content.decode('utf-8')
    input_file = io.StringIO(decoded)
    reader = csv.DictReader(input_file)
    
    count = 0
    for row in reader:
        category = row.get('Category')
        name = row.get('Name')
        amount = row.get('Amount')
        date_str = row.get('Date')
        
        if not category or not name or not amount:
            continue
            
        try:
            amount_val = float(amount)
            if date_str:
                date_val = datetime.strptime(date_str, '%Y-%m-%d').date()
            else:
                date_val = datetime.now().date()
        except ValueError:
            continue
            
        if category.lower() == 'asset':
            asset = db.query(models.Asset).filter(models.Asset.name == name).first()
            if asset:
                # Check if snapshot already exists for this date
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
                
    db.commit()
    return {'message': f'{count} snapshots imported successfully'}

