from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ReportPayload(BaseModel):
    customer_id: str
    theme: str = "light"
    alert_details: Optional[Dict[str, Any]] = None
    dashboard_analysis: Optional[Dict[str, Any]] = None
    fraud_statistics: Optional[Dict[str, Any]] = None
    timeline: Optional[List[Dict[str, Any]]] = None

class ModelPerformanceReportRequest(BaseModel):
    model_id:int