from fastapi import APIRouter, HTTPException, status, Depends, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Any, Dict, Optional
import httpx
import logging
from model import AlertCategoryFile
from database import get_db
from alert.alert_schema import AlertCategoryResponse
import json
import os
from config import ALERT_DIR, settings
from utils.log_utils import session_logger as logger
from alert.alert_schema import UpdateAlertRequest
from alert.alert_services import sync_new_categories_task_v2, get_base_url, get_http_client, update_alert, service_login

# logger = logging.getLogger(__name__)

alerts_router = APIRouter(prefix="/alerts", tags=["Alerts"])

class AlertQueryRequest(BaseModel):
    selectedDetails: str = Field(default="true", description="Include details in response")
    selectedFieldName: List[str] = Field(default=["Extr_cr_trxn_amount", "Title"], description="Fields to include in response")
    categoryTitle: str = Field(default="", description="Selected category title from dropdown")

class AlertResponse(BaseModel):
    success: bool = Field(..., description="Query success status")
    data: Any = Field(..., description="Alert query results")
    recordCount: int = Field(..., description="Number of records returned")
    columns: List[str] = Field(..., description="Column names for table display")
    message: Optional[str] = Field(None, description="Response message")

async def get_current_session(request: Request) -> Dict:
    session_manager = request.app.state.session_manager
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No session found. Please login first.")
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid. Please login again.")
    return session

def extract_columns_from_data(data: Any) -> List[str]:
    if isinstance(data, list) and len(data) > 0:
        if isinstance(data[0], dict):
            return list(data[0].keys())
    elif isinstance(data, dict):
        return list(data.keys())
    return []


@alerts_router.post("/query", response_model=AlertResponse)
async def get_alerts(query_request: AlertQueryRequest, request: Request, session: Dict = Depends(get_current_session)):
    settings = request.app.state.settings
    session_manager = request.app.state.session_manager
    logger.log_info(f"Alert query from user: {session['username']}")
    protected_url = f"{get_base_url(settings)}/finder/external/Alert"
    headers = {"Authorization": f"Bearer {session['access_token']}", "Content-Type": "application/json"}
    payload = {"selectedDetails": query_request.selectedDetails, "selectedFieldName": query_request.selectedFieldName, "queryFilter": f'[[\"CATEGORYFULLTITLE\",\"=\",\"{query_request.categoryTitle}\"]]' if query_request.categoryTitle else '[]'}
    async with await get_http_client(settings) as client:
        try:
            api_response = await client.post(protected_url, headers=headers, json=payload)
            if api_response.status_code == 200:
                data = api_response.json()
                columns = extract_columns_from_data(data)
                record_count = len(data) if isinstance(data, list) else (1 if data else 0)
                logger.log_info(f"Alert query successful for user: {session['username']}, records: {record_count}")
                return AlertResponse(success=True, data=data, recordCount=record_count, columns=columns, message="Query executed successfully")
            elif api_response.status_code == 401:
                session_id = request.cookies.get("session_id")
                if session_id:
                    await session_manager.delete_session(session_id)
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token expired. Please login again.")
            else:
                logger.log_error(f"Alert query failed with status: {api_response.status_code}")
                raise HTTPException(status_code=api_response.status_code, detail=f"Query failed: {api_response.text}")
        except httpx.RequestError as e:
            logger.log_error(f"Connection error during alert query: {str(e)}")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Cannot connect to alert service")
        except HTTPException:
            raise
        except Exception as e:
            logger.log_error(f"Unexpected error during alert query: {str(e)}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

@alerts_router.get("/categories")
async def get_alert_categories(request: Request, session: Dict = Depends(get_current_session)):
    settings = request.app.state.settings
    session_manager = request.app.state.session_manager
    logger.log_info(f"Fetching alert categories for user: {session['username']}")
    categories_url = f"{get_base_url(settings)}/alertCategory/byUser"
    headers = {"Authorization": f"Bearer {session['access_token']}", "Content-Type": "application/json"}
    async with await get_http_client(settings) as client:
        try:
            api_response = await client.get(categories_url, headers=headers)
            if api_response.status_code == 200:
                categories = api_response.json()
                logger.log_info(f"Retrieved {len(categories)} categories for user: {session['username']}")
                return {"success": True, "categories": categories, "count": len(categories)}
            elif api_response.status_code == 401:
                session_id = request.cookies.get("session_id")
                if session_id:
                    await session_manager.delete_session(session_id)
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token expired. Please login again.")
            else:
                logger.log_error(f"Failed to fetch categories with status: {api_response.status_code}")
                raise HTTPException(status_code=api_response.status_code, detail=f"Failed to fetch categories: {api_response.text}")
        except httpx.RequestError as e:
            logger.log_error(f"Connection error fetching categories: {str(e)}")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Cannot connect to alert service")
        except HTTPException:
            raise
        except Exception as e:
            logger.log_error(f"Unexpected error fetching categories: {str(e)}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")
        
@alerts_router.get('/catgories_v2', response_model=List[AlertCategoryResponse])
def alert_categories(db: Session = Depends(get_db)):
    data = db.query(AlertCategoryFile).all()
    return data

@alerts_router.post('/query_v2')
def alert_query_result(alert_category: str,
                       db: Session = Depends(get_db)):
    data = db.query(AlertCategoryFile).filter_by(
        alertcategory=alert_category
    ).first()
    
    if not data:
        return JSONResponse(
            content={"error": "Alert category not found"},
            status_code=404
        )
    
    file_path = os.path.join(ALERT_DIR, data.filepath)
    
    try:
        with open(file_path, 'r') as f:
            alert = json.load(f)
        return JSONResponse(content=alert)
    except FileNotFoundError:
        return JSONResponse(
            content={"error": f"File not found: {file_path}"},
            status_code=404
        )
    except json.JSONDecodeError as e:
        return JSONResponse(
            content={"error": f"Invalid JSON in file: {str(e)}"},
            status_code=500
        )
    

@alerts_router.get("/sync/categories", status_code=202)
async def sync_categories_background(
    request: Request,
    background_tasks: BackgroundTasks
):
    background_tasks.add_task(sync_new_categories_task_v2, request.app)
    return {"success": True, "message": "Category sync started in background"}

@alerts_router.post("/update_alert", status_code=202)
async def update_key_features(payload: UpdateAlertRequest):
    token = await service_login(settings=settings)

    return await update_alert(
        settings=settings,
        token=token,
        request=payload
    )