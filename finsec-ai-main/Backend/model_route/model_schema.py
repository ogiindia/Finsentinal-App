from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class ModelTypeEnum(str, Enum):
    supervised = "supervised"
    unsupervised = "unsupervised"

class ModelConfigCreate(BaseModel):
    alert_category: str
    model_name: str
    model_filename: str
    model_type: ModelTypeEnum
    target_column: Optional[str] = None
    feature_mappings: Dict[str, str]
    data_file_path: Optional[str] = None
    data_file_type: Optional[str] = None

    @validator('target_column')
    def validate_target_column(cls, v, values):
        if values.get('model_type') == ModelTypeEnum.supervised and not v:
            raise ValueError('Target column is required for supervised models')
        if values.get('model_type') == ModelTypeEnum.unsupervised and v:
            raise ValueError('Target column should not be provided for unsupervised models')
        return v

    @validator('data_file_type')
    def validate_file_type(cls, v):
        if v and v not in ['csv', 'parquet']:
            raise ValueError('File type must be either csv or parquet')
        return v

class ModelConfigUpdate(BaseModel):
    model_name: Optional[str] = None
    model_filename: Optional[str] = None
    model_type: Optional[ModelTypeEnum] = None
    target_column: Optional[str] = None
    feature_mappings: Optional[Dict[str, str]] = None
    data_file_path: Optional[str] = None
    data_file_type: Optional[str] = None

class DataFileInfo(BaseModel):
    id: int
    file_type: str
    file_path: str
    file_name: str
    file_size: Optional[int]
    row_count: Optional[int]
    column_count: Optional[int]
    columns_info: Optional[Dict[str, Any]]
    uploaded_at: datetime

class CalculationResultInfo(BaseModel):
    id: int
    calculation_type: str
    result_data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]]
    calculated_at: datetime

class ModelConfigResponse(BaseModel):
    id: int
    alert_category: str
    model_name: str
    model_filename: str
    model_path: str
    model_type: str
    target_column: Optional[str]
    feature_mappings: Dict[str, str]
    created_at: datetime
    updated_at: datetime
    data_files: List[DataFileInfo] = []
    calculation_results: List[CalculationResultInfo] = []

    class Config:
        orm_mode = True

class DataFileUpload(BaseModel):
    file_path: str
    file_type: str
    alert_category: str

class CalculationRequest(BaseModel):
    alert_category: str
    calculation_type: str
    max_rows: Optional[int] = 1000
    additional_params: Optional[Dict[str, Any]] = {}

class CalculationResponse(BaseModel):
    status: str
    message: str
    result: Optional[Dict[str, Any]]
    calculation_id: Optional[int]