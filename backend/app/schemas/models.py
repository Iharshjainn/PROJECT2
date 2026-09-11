from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import date, datetime
from uuid import UUID

# Account Schemas
class AccountBase(BaseModel):
    name: str
    account_type: Literal['bank', 'cash', 'credit_card', 'investment', 'other']
    institution: Optional[str] = None
    current_balance: float = 0.0
    currency: str = "INR"

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    account_type: Optional[Literal['bank', 'cash', 'credit_card', 'investment', 'other']] = None
    institution: Optional[str] = None
    current_balance: Optional[float] = None
    currency: Optional[str] = None

class AccountResponse(AccountBase):
    id: str
    user_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Transaction Schemas
class TransactionBase(BaseModel):
    account_id: Optional[str] = None
    date: date
    description: str
    amount: float
    transaction_type: Literal['income', 'expense', 'transfer']
    category: str = "Other"
    subcategory: Optional[str] = None
    merchant: Optional[str] = None
    source: Literal['manual', 'csv', 'pdf'] = 'manual'
    notes: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    account_id: Optional[str] = None
    date: Optional[date] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    transaction_type: Optional[Literal['income', 'expense', 'transfer']] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    merchant: Optional[str] = None
    notes: Optional[str] = None

class TransactionResponse(TransactionBase):
    id: str
    user_id: str
    account_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Asset Schemas
class AssetBase(BaseModel):
    name: str
    asset_type: str # cash, savings, stocks, mutual_funds, gold, property, vehicle, crypto, other
    current_value: float
    purchase_value: Optional[float] = None
    notes: Optional[str] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[str] = None
    current_value: Optional[float] = None
    purchase_value: Optional[float] = None
    notes: Optional[str] = None

class AssetResponse(AssetBase):
    id: str
    user_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Liability Schemas
class LiabilityBase(BaseModel):
    name: str
    liability_type: str # credit_card, personal_loan, education_loan, car_loan, home_loan, other
    outstanding_amount: float
    interest_rate: Optional[float] = None
    monthly_payment: float = 0.0
    due_date: Optional[int] = Field(default=None, ge=1, le=31)
    notes: Optional[str] = None

class LiabilityCreate(LiabilityBase):
    pass

class LiabilityUpdate(BaseModel):
    name: Optional[str] = None
    liability_type: Optional[str] = None
    outstanding_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    monthly_payment: Optional[float] = None
    due_date: Optional[int] = Field(default=None, ge=1, le=31)
    notes: Optional[str] = None

class LiabilityResponse(LiabilityBase):
    id: str
    user_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Goal Schemas
class GoalBase(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    target_date: Optional[date] = None
    category: Optional[str] = "general"
    notes: Optional[str] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[date] = None
    category: Optional[str] = None
    notes: Optional[str] = None

class GoalResponse(GoalBase):
    id: str
    user_id: str
    progress_percentage: float = 0.0
    remaining_amount: float = 0.0
    required_monthly_saving: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Profile Schemas
class ProfileResponse(BaseModel):
    id: str
    user_id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    currency: str = "INR"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    currency: Optional[str] = None
