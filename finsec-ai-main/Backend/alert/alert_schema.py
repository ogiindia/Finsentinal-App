from typing import List, Optional
from pydantic import BaseModel

class AlertCategoryResponse(BaseModel):
    id: int
    alertcategory: str


class UpdateAlertRequest(BaseModel):
    ID: str
    ASSIGNEDTO: Optional[str] = None
    category: Optional[str] = None
    CLOSEDATE: Optional[str] = None
    CLOSEREASON: Optional[str] = None
    CREATIONDATE: Optional[str] = None
    LEVEL: Optional[str] = None
    PRIORITY: Optional[str] = None
    STATUS: Optional[str] = None
    timestamp: Optional[str] = None
    TITLE: Optional[str] = None
    NOTE: Optional[str] = None