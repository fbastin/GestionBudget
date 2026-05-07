from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, JSON
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
    snapshots = relationship('Snapshot', back_populates='asset', cascade='all, delete-orphan')

class Liability(Base):
    __tablename__ = 'liabilities'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)
    snapshots = relationship('Snapshot', back_populates='liability', cascade='all, delete-orphan')
    credits = relationship('Credit', back_populates='liability')

class Snapshot(Base):
    __tablename__ = 'snapshots'
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

class Bank(Base):
    __tablename__ = 'banks'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    balance = Column(Float, default=0.0)
