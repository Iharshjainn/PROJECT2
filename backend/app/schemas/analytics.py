from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import date, datetime

# Analytics Schemas
class CategorySpend(BaseModel):
    category: str
    amount: float
    percentage: float
    count: int

class MonthlyTrend(BaseModel):
    month: str # YYYY-MM
    income: float
    expenses: float
    savings: float
    savings_rate: float

class AnalyticsSummary(BaseModel):
    total_income: float
    total_expenses: float
    total_savings: float
    savings_rate: float
    average_monthly_income: float
    average_monthly_expenses: float
    discretionary_expenses: float
    essential_expenses: float
    top_categories: List[CategorySpend]
    monthly_trends: List[MonthlyTrend]
    largest_expenses: List[Dict[str, Any]]
    total_assets: float
    total_liabilities: float
    net_worth: float
    debt_to_income_ratio: float


# Financial Health Schemas
class HealthComponentScore(BaseModel):
    name: str
    score: float
    max_score: float
    weight_percentage: int
    status: Literal['excellent', 'good', 'fair', 'poor']
    details: str

class FinancialHealthResponse(BaseModel):
    overall_score: int # 0 to 100
    rating: Literal['Excellent', 'Good', 'Fair', 'Needs Attention']
    components: Dict[str, HealthComponentScore]
    positive_factors: List[str]
    areas_for_improvement: List[str]
    actionable_recommendations: List[str]
    calculated_at: datetime


# Scenario Schemas
class ScenarioType(str):
    ONE_TIME_PURCHASE = "one_time_purchase"
    EXPENSE_INCREASE = "expense_increase"
    SALARY_CHANGE = "salary_change"
    DEBT_REPAYMENT = "debt_repayment"
    SAVINGS_INCREASE = "savings_increase"

class ScenarioRequest(BaseModel):
    scenario_type: Literal['one_time_purchase', 'expense_increase', 'salary_change', 'debt_repayment', 'savings_increase']
    # Parameters for different scenarios
    amount: float = Field(..., gt=0, description="Amount in currency or change amount")
    item_name: Optional[str] = Field(default="Purchase", description="Name of purchase/expense/goal")
    percentage_change: Optional[float] = Field(default=None, description="Percentage change for salary change")
    notes: Optional[str] = None

class ScenarioResult(BaseModel):
    scenario_type: str
    title: str
    status: Literal['affordable', 'caution', 'not_advisable', 'positive', 'neutral']
    summary: str
    details: Dict[str, Any]
    metrics_before: Dict[str, Any]
    metrics_after: Dict[str, Any]
    recommendations: List[str]
    authoritative_math: Dict[str, Any]


# Statement Import Schemas
class NormalizedTransactionPreview(BaseModel):
    id: Optional[str] = None
    date: str
    description: str
    amount: float
    transaction_type: Literal['income', 'expense', 'transfer']
    category: str
    merchant: Optional[str] = None
    is_duplicate: bool = False
    duplicate_reason: Optional[str] = None

class StatementPreviewResponse(BaseModel):
    total_found: int
    new_transactions: int
    duplicate_transactions: int
    confidence_score: float # 0.0 to 1.0 (especially relevant for PDF)
    parsing_notes: Optional[str] = None
    transactions: List[NormalizedTransactionPreview]

class StatementConfirmRequest(BaseModel):
    account_id: Optional[str] = None
    transactions: List[NormalizedTransactionPreview]

class StatementConfirmResponse(BaseModel):
    imported_count: int
    skipped_count: int
    message: str


# Chat Schemas
class ChatMessageRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str

class ChatMessageResponse(BaseModel):
    conversation_id: str
    message_id: str
    role: str = "assistant"
    content: str
    structured_data: Optional[Dict[str, Any]] = None
    suggested_follow_ups: Optional[List[str]] = None
    created_at: datetime

class ConversationItem(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
