from fastapi import FastAPI, Depends, HTTPException, Response
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
    allow_credentials=True,
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
        snapshots = db.query(models.Snapshot).filter(models.Snapshot.asset_id == a.id).order_by(models.Snapshot.date.asc()).all()
        result.append({
            'id': a.id,
            'name': a.name,
            'type': a.type,
            'location': a.location,
            'details': a.details,
            'snapshots': [{'date': str(s.date), 'amount': float(s.amount)} for s in snapshots]
        })
    return result

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
    for var, value in vars(asset_update).items():
        if value is not None:
            setattr(db_asset, var, value)
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
        snapshots = db.query(models.Snapshot).filter(models.Snapshot.liability_id == l.id).order_by(models.Snapshot.date.asc()).all()
        result.append({
            'id': l.id,
            'name': l.name,
            'type': l.type,
            'snapshots': [{'date': str(s.date), 'amount': float(s.amount)} for s in snapshots]
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
    for var, value in vars(liability_update).items():
        if value is not None:
            setattr(db_liability, var, value)
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
    db_snapshot = models.Snapshot(**snapshot.dict())
    db.add(db_snapshot)
    db.commit()
    db.refresh(db_snapshot)
    return db_snapshot

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
    for var, value in vars(bank_update).items():
        if value is not None:
            setattr(db_bank, var, value)
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
    for var, value in vars(credit_update).items():
        if value is not None:
            setattr(db_credit, var, value)
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
    for var, value in vars(contribution_update).items():
        if value is not None:
            setattr(db_contribution, var, value)
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
    dates = db.query(models.Snapshot.date).distinct().order_by(models.Snapshot.date).all()
    dates = [d[0] for d in dates]
    
    history = []
    for d in dates:
        total_assets = 0
        assets = db.query(models.Asset).all()
        for a in assets:
            latest = db.query(models.Snapshot).filter(models.Snapshot.asset_id == a.id, models.Snapshot.date <= d).order_by(models.Snapshot.date.desc()).first()
            if latest:
                total_assets += latest.amount
            elif a.details and isinstance(a.details, dict) and 'value' in a.details:
                total_assets += float(a.details['value'])
                
        total_liabilities = 0
        liabilities = db.query(models.Liability).all()
        for l in liabilities:
            latest = db.query(models.Snapshot).filter(models.Snapshot.liability_id == l.id, models.Snapshot.date <= d).order_by(models.Snapshot.date.desc()).first()
            if latest:
                total_liabilities += latest.amount
                
        history.append({
            'date': d,
            'assets': float(total_assets),
            'liabilities': float(total_liabilities),
            'net_worth': float(total_assets - total_liabilities)
        })
    return history

@app.get('/dashboard', response_model=schemas.DashboardData)
def get_dashboard(db: Session = Depends(database.get_db)):
    all_liabilities = db.query(models.Liability).all()
    total_liabilities = 0
    for l in all_liabilities:
        latest = db.query(models.Snapshot).filter(models.Snapshot.liability_id == l.id).order_by(models.Snapshot.date.desc()).first()
        if latest:
            total_liabilities += latest.amount
    
    all_assets = db.query(models.Asset).all()
    total_assets = 0
    for a in all_assets:
        latest = db.query(models.Snapshot).filter(models.Snapshot.asset_id == a.id).order_by(models.Snapshot.date.desc()).first()
        if latest:
            total_assets += latest.amount
        elif a.details and 'value' in a.details:
            total_assets += float(a.details['value'])
            
    return {
        'total_assets': float(total_assets),
        'total_liabilities': float(total_liabilities),
        'net_worth': float(total_assets - total_liabilities)
    }

@app.get('/export/csv')
def export_csv(db: Session = Depends(database.get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Category', 'Name', 'Amount', 'Date'])
    
    liabilities = db.query(models.Liability).all()
    for l in liabilities:
        latest = db.query(models.Snapshot).filter(models.Snapshot.liability_id == l.id).order_by(models.Snapshot.date.desc()).first()
        if latest:
            writer.writerow(['Liability', l.name, latest.amount, latest.date])
            
    assets = db.query(models.Asset).all()
    for a in assets:
        latest = db.query(models.Snapshot).filter(models.Snapshot.asset_id == a.id).order_by(models.Snapshot.date.desc()).first()
        amount = latest.amount if latest else (a.details.get('value', 0) if a.details else 0)
        writer.writerow(['Asset', a.name, amount, latest.date if latest else ''])
        
    return Response(content=output.getvalue(), media_type='text/csv', headers={'Content-Disposition': 'attachment; filename=budget_export.csv'})
