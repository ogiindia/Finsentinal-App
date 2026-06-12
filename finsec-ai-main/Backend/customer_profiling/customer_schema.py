
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from utils.schema_utils import pydantic_model_from_sa
from model import RiskTable

RiskOut = pydantic_model_from_sa(RiskTable)

class RiskStatsResponse(BaseModel):
    data: list[RiskOut]
    offset: int
    limit: int
