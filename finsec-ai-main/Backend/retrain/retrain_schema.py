from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional

class RetrainRequest(BaseModel):
    model_id: int = Field(..., description="ID of the model configuration to retrain")
    data: List[Dict[str, Any]] = Field(..., description="New training data to append")
    run_async: bool = Field(default=False, description="Run retrain in background")
    
    @validator('data')
    def validate_data_not_empty(cls, v):
        if not v:
            raise ValueError("Data list cannot be empty")
        return v
    
class RetrainFileRequest(BaseModel):
    model_id: int = Field(..., description="ID of the model configuration to retrain")
    data: List[Dict[str, Any]] = Field(..., description="New training data to append from file")
    run_async: bool = Field(default=False, description="Run retrain in background")

    @validator('data')
    def validate_data_not_empty(cls, v):
        if not v:
            raise ValueError("Data list cannot be empty")
        return v
    

class RetrainResponse(BaseModel):
    status: str
    message: str
    model_id: int
    version_number: int
    alert_category: Optional[str]
    # model_path_onnx: Optional[str]
    # model_path_pkl: Optional[str]
    # data_rows: int
    # new_rows_added: int
    # metrics: Dict[str, Any]
    timestamp: str
