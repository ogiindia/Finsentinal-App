from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional


class RetrainRequest(BaseModel):
    model_id: int = Field(...)
    data: List[Dict[str, Any]] = Field(...)
    run_async: bool = Field(default=False)

    @validator("data")
    def validate_data_not_empty(cls, v):
        if not v:
            raise ValueError("Data list cannot be empty")
        return v


class RetrainFileRequest(BaseModel):
    model_id: int = Field(...)
    persistance_file_type: Optional[str] = Field(None, pattern="^(csv|xlsx|xls)$")
    transaction_file_type: Optional[str] = Field(None, pattern="^(csv|xlsx|xls)$")
    join_left_columns: Optional[List[str]] = None
    join_right_columns: Optional[List[str]] = None
    join_type: Optional[str] = "left"
    feature_mappings: Optional[Dict[str, str]] = None
    alert_rows: Optional[List[Dict[str, Any]]] = None
    run_async: bool = False

    @validator("join_right_columns")
    def validate_join_len(cls, v, values):
        left = values.get("join_left_columns")
        if v is not None and left is not None and len(v) != len(left):
            raise ValueError("join_left_columns and join_right_columns must have same length")
        return v

    @validator("alert_rows")
    def validate_alert_rows(cls, v):
        if v is not None and len(v) == 0:
            return None
        return v


class RetrainResponse(BaseModel):
    status: str
    message: str
    model_id: int
    version_number: int
    alert_category: Optional[str]
    timestamp: str
