from pydantic import BaseModel
from typing import Optional


class AccountCreate(BaseModel):
    name: str
    type: str  # cash, bank, upi, credit, wallet
    balance: Optional[float] = 0.0
    icon: Optional[str] = "💵"
    color: Optional[str] = "#3b82f6"


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance: Optional[float] = None
    icon: Optional[str] = None
    color: Optional[str] = None
