from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from typing import Union

class AlertCreate(BaseModel):
    alert_category: str
    retrain_date: date

class alertResponse(BaseModel):
    id: int
    alert_category: str
    retrain_date: date
    updated_date: datetime
    
    class Config:
        orm_mode = True
        from_attributes = True

class AlertCategoryRequest(BaseModel):
    alert_category: str

class AlertRetrainResponse(BaseModel):
    retrain_date: Union[date, str]
