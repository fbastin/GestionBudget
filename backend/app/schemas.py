from pydantic import AfterValidator, BaseModel, ConfigDict, model_validator
from typing import Annotated, List, Optional, Union
from datetime import date as dt_date
from .models import to_cents

# Amount in dollars, rounded to the cent on input like in the database (2.675 -> 2.68), so a transaction
# moves the balances by exactly the amount it is stored with
Money = Annotated[float, AfterValidator(to_cents)]

class SnapshotBase(BaseModel):
    date: dt_date
    amount: Money
    model_config = ConfigDict(from_attributes=True)

class SnapshotCreate(SnapshotBase):
    liability_id: Optional[int] = None
    asset_id: Optional[int] = None

    @model_validator(mode='after')
    def check_single_target(self):
        # Without a target, the propagation queries match every snapshot with a NULL id
        if (self.asset_id is None) == (self.liability_id is None):
            raise ValueError('Exactly one of asset_id or liability_id is required')
        return self

class CreditBase(BaseModel):
    name: str
    type: str
    limit: Optional[Money] = None
    interest_rate: Optional[float] = None
    liability_id: Optional[int] = None

class CreditCreate(CreditBase):
    pass

class CreditUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    limit: Optional[Money] = None
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
    assets: Optional[float]           # None before the first recorded asset value
    liabilities: float
    net_worth: Optional[float]

class BankBase(BaseModel):
    name: str
    balance: Money = 0.0

class BankCreate(BankBase):
    pass

class BankUpdate(BaseModel):
    name: Optional[str] = None
    balance: Optional[Money] = None

class Bank(BankBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ExpenseBase(BaseModel):
    date: dt_date
    description: str
    amount: Money
    bank_id: Optional[int] = None
    asset_id: Optional[int] = None
    credit_id: Optional[int] = None
    liability_id: Optional[int] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    date: Optional[dt_date] = None
    description: Optional[str] = None
    amount: Optional[Money] = None
    bank_id: Optional[int] = None
    asset_id: Optional[int] = None
    credit_id: Optional[int] = None
    liability_id: Optional[int] = None

class Expense(ExpenseBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class PaymentBase(BaseModel):
    date: dt_date
    description: str
    amount: Money
    interest: Money = 0.0
    bank_id: Optional[int] = None
    asset_id: Optional[int] = None
    credit_id: Optional[int] = None
    liability_id: Optional[int] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    date: Optional[dt_date] = None
    description: Optional[str] = None
    amount: Optional[Money] = None
    interest: Optional[Money] = None
    bank_id: Optional[int] = None
    asset_id: Optional[int] = None
    credit_id: Optional[int] = None
    liability_id: Optional[int] = None

class Payment(PaymentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DepositBase(BaseModel):
    date: dt_date
    description: str
    amount: Money
    bank_id: Optional[int] = None
    asset_id: Optional[int] = None
    source_bank_id: Optional[int] = None
    source_asset_id: Optional[int] = None

class DepositCreate(DepositBase):
    @model_validator(mode='after')
    def check_account(self):
        if self.bank_id is None and self.asset_id is None:
            raise ValueError('The account receiving the money (bank_id or asset_id) is required')
        return self

class DepositUpdate(BaseModel):
    date: Optional[dt_date] = None
    description: Optional[str] = None
    amount: Optional[Money] = None
    bank_id: Optional[int] = None
    asset_id: Optional[int] = None
    source_bank_id: Optional[int] = None
    source_asset_id: Optional[int] = None

class Deposit(DepositBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ContributionBase(BaseModel):

    year: int
    type: str
    amount: Money
    institution: Optional[str] = None

class ContributionCreate(ContributionBase):
    pass

class ContributionUpdate(BaseModel):
    year: Optional[int] = None
    type: Optional[str] = None
    amount: Optional[Money] = None
    institution: Optional[str] = None

class Contribution(ContributionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Credit(CreditBase):
    id: int
    liability: Optional[Liability] = None
    model_config = ConfigDict(from_attributes=True)
