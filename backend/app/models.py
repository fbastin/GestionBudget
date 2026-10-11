from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, JSON, Index, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class Asset(Base):
    __tablename__ = 'assets'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)
    location = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    bank_id = Column(Integer, ForeignKey('banks.id'), nullable=True)
    snapshots = relationship('Snapshot', back_populates='asset', cascade='all, delete-orphan')
    bank = relationship('Bank', back_populates='assets')
    investments = relationship('Investment', back_populates='asset', cascade='all, delete-orphan')

class Investment(Base):
    __tablename__ = 'investments'
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    quantity = Column(Float)
    average_cost = Column(Float)
    current_price = Column(Float, nullable=True)
    asset_id = Column(Integer, ForeignKey('assets.id'))
    asset = relationship('Asset', back_populates='investments')

class Liability(Base):
    __tablename__ = 'liabilities'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)
    snapshots = relationship('Snapshot', back_populates='liability', cascade='all, delete-orphan')
    credits = relationship('Credit', back_populates='liability')

class Snapshot(Base):
    __tablename__ = 'snapshots'
    # At most one snapshot per item and date (partial indexes: the other id column is NULL)
    __table_args__ = (
        Index('ux_snapshots_asset_date', 'asset_id', 'date', unique=True, sqlite_where=text('asset_id IS NOT NULL')),
        Index('ux_snapshots_liability_date', 'liability_id', 'date', unique=True, sqlite_where=text('liability_id IS NOT NULL')),
    )
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date)
    asset_id = Column(Integer, ForeignKey('assets.id'), nullable=True)
    liability_id = Column(Integer, ForeignKey('liabilities.id'), nullable=True)
    amount = Column(Float)
    asset = relationship('Asset', back_populates='snapshots')
    liability = relationship('Liability', back_populates='snapshots')

class Stock(Base):
    __tablename__ = 'stocks'
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    is_canadian_dividend = Column(String)
    roc = Column(String)
    description = Column(String, nullable=True)

class Contribution(Base):
    __tablename__ = 'contributions'
    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer)
    type = Column(String)
    amount = Column(Float)
    institution = Column(String)

class BudgetCategory(Base):
    __tablename__ = 'budget_categories'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    provisions = Column(JSON)

class Credit(Base):
    __tablename__ = 'credits'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)
    limit = Column(Float, nullable=True)
    interest_rate = Column(Float, nullable=True)
    liability_id = Column(Integer, ForeignKey('liabilities.id'), nullable=True)
    liability = relationship('Liability', back_populates='credits')
    expenses = relationship('Expense', back_populates='credit')

class Bank(Base):
    __tablename__ = 'banks'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    balance = Column(Float, default=0.0)
    assets = relationship('Asset', back_populates='bank')
    expenses = relationship('Expense', back_populates='bank')

class Expense(Base):
    __tablename__ = 'expenses'
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date)
    description = Column(String)
    amount = Column(Float)
    bank_id = Column(Integer, ForeignKey('banks.id'), nullable=True)
    asset_id = Column(Integer, ForeignKey('assets.id'), nullable=True)
    credit_id = Column(Integer, ForeignKey('credits.id'), nullable=True)
    liability_id = Column(Integer, ForeignKey('liabilities.id'), nullable=True)
    
    bank = relationship('Bank', back_populates='expenses')
    asset = relationship('Asset')
    credit = relationship('Credit', back_populates='expenses')
    liability = relationship('Liability')

class Payment(Base):
    __tablename__ = 'payments'
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date)
    description = Column(String)
    amount = Column(Float)
    interest = Column(Float, default=0.0)
    bank_id = Column(Integer, ForeignKey('banks.id'), nullable=True)
    asset_id = Column(Integer, ForeignKey('assets.id'), nullable=True)
    credit_id = Column(Integer, ForeignKey('credits.id'), nullable=True)
    liability_id = Column(Integer, ForeignKey('liabilities.id'), nullable=True)
    
    bank = relationship('Bank')
    asset = relationship('Asset')
    credit = relationship('Credit')
    liability = relationship('Liability')
