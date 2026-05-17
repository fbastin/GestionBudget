from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Union
from datetime import date as dt_date

class SnapshotBase(BaseModel):
    date: dt_date
    amount: float
    model_config = ConfigDict(from_attributes=True)

class SnapshotCreate(SnapshotBase):
    liability_id: Optional[int] = None
    asset_id: Optional[int] = None

class CreditBase(BaseModel):
    name: str
    type: str
    limit: Optional[float] = None
    interest_rate: Optional[float] = None
    liability_id: Optional[int] = None

class CreditCreate(CreditBase):
    pass

class CreditUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    limit: Optional[float] = None
    interest_rate: Optional[float] = None
    liability_id: Optional[int] = None

class LiabilityBase(BaseModel):
    name: str
    type: str

class LiabilityCreate(LiabilityBase):
    pass

class LiabilityUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None

class Liability(LiabilityBase):
    id: int
    snapshots: List[SnapshotBase] = []
    credits: List[CreditBase] = []
    model_config = ConfigDict(from_attributes=True)

class AssetBase(BaseModel):
    name: str
    type: str
    location: Optional[str] = None
    details: Optional[dict] = None
    bank_id: Optional[int] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    location: Optional[str] = None
    details: Optional[dict] = None
    bank_id: Optional[int] = None

class Asset(AssetBase):
    id: int
    snapshots: List[SnapshotBase] = []
    investments: List['Investment'] = []
    model_config = ConfigDict(from_attributes=True)

class InvestmentBase(BaseModel):
    symbol: str
    quantity: float
    average_cost: float
    current_price: Optional[float] = None
    asset_id: int

class InvestmentCreate(InvestmentBase):
    pass

class InvestmentUpdate(BaseModel):
    symbol: Optional[str] = None
    quantity: Optional[float] = None
    average_cost: Optional[float] = None
    current_price: Optional[float] = None
    asset_id: Optional[int] = None

class Investment(InvestmentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class StockBase(BaseModel):
    symbol: str
    roc: Optional[str] = None
    is_canadian_dividend: Optional[str] = None
    description: Optional[str] = None

class Stock(StockBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DashboardData(BaseModel):
    total_assets: float
    total_liabilities: float
    net_worth: float

class HistoryItem(BaseModel):
    date: dt_date
    assets: float
    liabilities: float
    net_worth: float

class BankBase(BaseModel):
    name: str
    balance: float = 0.0

class BankCreate(BankBase):
    pass

class BankUpdate(BaseModel):
    name: Optional[str] = None
    balance: Optional[float] = None

class Bank(BankBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ExpenseBase(BaseModel):
    date: dt_date
    description: str
    amount: float
    bank_id: Optional[int] = None
    credit_id: Optional[int] = None
    liability_id: Optional[int] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    date: Optional[dt_date] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    bank_id: Optional[int] = None
    credit_id: Optional[int] = None
    liability_id: Optional[int] = None

class Expense(ExpenseBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class PaymentBase(BaseModel):
    date: dt_date
    description: str
    amount: float
    interest: float = 0.0
    bank_id: Optional[int] = None
    credit_id: Optional[int] = None
    liability_id: Optional[int] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    date: Optional[dt_date] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    interest: Optional[float] = None
    bank_id: Optional[int] = None
    credit_id: Optional[int] = None
    liability_id: Optional[int] = None

class Payment(PaymentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ContributionBase(BaseModel):

    year: int
    type: str
    amount: float
    institution: Optional[str] = None

class ContributionCreate(ContributionBase):
    pass

class ContributionUpdate(BaseModel):
    year: Optional[int] = None
    type: Optional[str] = None
    amount: Optional[float] = None
    institution: Optional[str] = None

class Contribution(ContributionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Credit(CreditBase):
    id: int
    liability: Optional[Liability] = None
    model_config = ConfigDict(from_attributes=True)
