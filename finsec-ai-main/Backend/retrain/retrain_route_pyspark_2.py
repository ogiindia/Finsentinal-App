from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query, Body
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional
from model import ModelConfiguration, ModelVersion, RetrainingStatus
import json

from database import get_db
from config import DATA_DIR, MODEL_DIR
from .retrain_service_3 import RetrainService
from .retrain_schema_2 import RetrainRequest, RetrainResponse, RetrainFileRequest
from utils.log_utils import session_logger as logger

retrain_router = APIRouter(prefix="/api/retrain", tags=["Model Retraining"])


def get_retrain_service(db: Session = Depends(get_db)) -> RetrainService:
    return RetrainService(db=db, data_dir=DATA_DIR, model_dir=MODEL_DIR)


@retrain_router.post("/", response_model=RetrainResponse)
async def retrain_model(
    request: RetrainRequest,
    background_tasks: BackgroundTasks,
    service: RetrainService = Depends(get_retrain_service)
):
    try:
        if request.run_async:
            background_tasks.add_task(service.retrain_model, request.model_id, request.data)
            return RetrainResponse(
                status="processing",
                message="Retrain job started in background",
                model_id=request.model_id,
                version_number=0,
                alert_category=None,
                timestamp=datetime.now(timezone.utc).isoformat()
            )
        else:
            result = service.retrain_model(request.model_id, request.data)
            return RetrainResponse(**result)
    except ValueError as e:
        return JSONResponse(status_code=400, detail=str(e))
    except Exception as e:
        logger.log_error(f"Error in retrain endpoint: {str(e)}", exc_info=True)
        return JSONResponse(status_code=500, detail=f"Internal server error: {str(e)}")


@retrain_router.post("/v2", response_model=RetrainResponse)
async def retrain_model_v2(
    persistance_path: str | None = Query(default=None),
    transaction_path: str | None = Query(default=None),
    request: RetrainFileRequest = Body(...),
    background_tasks: BackgroundTasks = None,
    service: RetrainService = Depends(get_retrain_service)
):
    try:
        logger.log_info(f"Persistance Path:{persistance_path}, Transaction Path:{transaction_path}")
        logger.log_info(f"Request:{request}")
        if request.run_async:
            background_tasks.add_task(
                service.retrain_model_v2,
                request,
                persistance_path,
                transaction_path
            )
            return RetrainResponse(
                status="processing",
                message="Retrain v2 job started in background",
                model_id=request.model_id,
                version_number=0,
                alert_category=None,
                timestamp=datetime.now(timezone.utc).isoformat()
            )
        result = service.retrain_model_v2(
            request,
            persistance_path,
            transaction_path
        )
        return RetrainResponse(**result)
    except ValueError as e:
        return JSONResponse(status_code=400, detail=str(e))
    except Exception as e:
        logger.log_error(f"Error in retrain v2 endpoint: {str(e)}", exc_info=True)
        return JSONResponse(status_code=500, detail=f"Internal server error: {str(e)}")


@retrain_router.get("/versions/{model_id}")
async def get_model_versions(model_id: int, limit: int = 10, db: Session = Depends(get_db)):
    try:
        model_config = db.query(ModelConfiguration).filter(
            ModelConfiguration.id == model_id
        ).first()

        if not model_config:
            return JSONResponse(status_code=404, detail="Model configuration not found")

        versions = db.query(ModelVersion).filter(
            ModelVersion.model_config_id == model_id
        ).order_by(ModelVersion.version_number.desc()).limit(limit).all()

        version_list = []
        for version in versions:
            version_list.append({
                "id": version.id,
                "version_number": version.version_number,
                "model_path_onnx": version.model_path_onnx,
                "model_path_pkl": version.model_path_pkl,
                "accuracy": version.accuracy,
                "metrics": version.metrics,
                "created_at": version.created_at.isoformat() if version.created_at else None
            })

        return JSONResponse(content={
            "model_id": model_id,
            "alert_category": model_config.alert_category,
            "total_versions": len(version_list),
            "versions": version_list
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.log_error(f"Error getting model versions: {str(e)}", exc_info=True)
        return JSONResponse(status_code=500, detail=f"Internal server error: {str(e)}")


@retrain_router.post("/rollback/{model_id}/{version_id}")
async def rollback_to_version(model_id: int, version_id: int, db: Session = Depends(get_db)):
    try:
        model_config = db.query(ModelConfiguration).filter(
            ModelConfiguration.id == model_id
        ).first()

        if not model_config:
            return JSONResponse(status_code=404, detail="Model configuration not found")

        target_version = db.query(ModelVersion).filter(
            ModelVersion.id == version_id,
            ModelVersion.model_config_id == model_id
        ).first()

        if not target_version:
            return JSONResponse(status_code=404, detail="Target version not found")

        model_config.model_path = target_version.model_path_onnx
        model_config.updated_at = datetime.now(timezone.utc)
        db.commit()

        return JSONResponse(content={
            "status": "success",
            "message": f"Model rolled back to version {target_version.version_number}",
            "model_id": model_id,
            "version_number": target_version.version_number,
            "model_path": model_config.model_path,
            "accuracy": target_version.accuracy
        })

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.log_error(f"Error during rollback: {str(e)}", exc_info=True)
        return JSONResponse(status_code=500, detail=f"Internal server error: {str(e)}")


@retrain_router.get("/current/{model_id}")
async def get_current_version(model_id: int, db: Session = Depends(get_db)):
    try:
        model_config = db.query(ModelConfiguration).filter(
            ModelConfiguration.id == model_id
        ).first()

        if not model_config:
            return JSONResponse(status_code=404, detail="Model configuration not found")

        current_version = db.query(ModelVersion).filter(
            ModelVersion.model_config_id == model_id
        ).order_by(ModelVersion.version_number.desc()).first()

        if not current_version:
            return JSONResponse(content={
                "model_id": model_id,
                "message": "No versions found",
                "current_version": None
            })

        return JSONResponse(content={
            "model_id": model_id,
            "alert_category": model_config.alert_category,
            "current_version": {
                "id": current_version.id,
                "version_number": current_version.version_number,
                "model_path_onnx": current_version.model_path_onnx,
                "model_path_pkl": current_version.model_path_pkl,
                "accuracy": current_version.accuracy,
                "metrics": current_version.metrics,
                "created_at": current_version.created_at.isoformat() if current_version.created_at else None
            }
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.log_error(f"Error getting current version: {str(e)}", exc_info=True)
        return JSONResponse(status_code=500, detail=f"Internal server error: {str(e)}")


@retrain_router.get("/status/{model_id}")
def get_status(model_id: int, db: Session = Depends(get_db)):
    try:
        data = db.query(RetrainingStatus).filter(
            RetrainingStatus.model_config_id == model_id
        ).order_by(RetrainingStatus.started_at.desc()).first()

        if not data:
            return JSONResponse(
                content={"status": "not_found", "message": "No retraining status found for this model"}
            )

        stage_details = data.stage_details
        if isinstance(stage_details, str):
            try:
                stage_details = json.loads(stage_details)
            except:
                stage_details = {}

        return JSONResponse(content={
            "status" : "active",
            "model_id": model_id,
            "current_stage": data.current_stage.value if data.current_stage else "unknown",
            "stage_status": data.stage_status,
            "total_stages": data.total_stages,
            "completed_stages": data.completed_stages,
            "progress_percentage": data.progress_percentage,
            "stage_details": stage_details,
            "error_message": data.error_message,
            "started_at": data.started_at.isoformat() if data.started_at else None,
            "updated_at": data.updated_at.isoformat() if data.updated_at else None,
            "completed_at": data.completed_at.isoformat() if data.completed_at else None,
            "new_rows_added": data.new_rows_added,
            "total_data_rows": data.total_data_rows,
            "current_version": int(data.version_number) if data.version_number is not None else None
        })

    except Exception as e:
        logger.log_error(f"Error getting retraining status: {str(e)}", exc_info=True)
        return JSONResponse(status_code=500, detail=f"Internal server error: {str(e)}")


@retrain_router.post("/column_names")
def get_column_names(
    file_path: str,
    file_type: str,
    service: RetrainService = Depends(get_retrain_service)
):
    """Get column names from CSV/Excel file using PySpark"""
    try:
        if file_type == "csv":
            # Use PySpark to read CSV
            df_spark = service.spark.read.csv(file_path, header=True, inferSchema=True)
            column_names = df_spark.columns
        elif file_type in ["xlsx", "xls"]:
            # For Excel files, still use pandas as PySpark doesn't natively support Excel
            import pandas as pd
            df = pd.read_excel(file_path, nrows=0)
            column_names = list(df.columns)
        else:
            raise ValueError("Unsupported file type. Supported types are 'csv', 'xlsx', and 'xls'.")

        return JSONResponse(content={
            "column_names": column_names
        })

    except ValueError as e:
        return JSONResponse(status_code=400, detail=str(e))
    except Exception as e:
        logger.log_error(f"Error extracting column names: {str(e)}", exc_info=True)
        return JSONResponse(status_code=500, detail=f"Internal server error: {str(e)}")


@retrain_router.post("/model_inputs/{model_id}")
def get_model_input_features(
    model_id: int,
    db: Session = Depends(get_db)
):
    try:
        data = db.query(ModelConfiguration).filter(ModelConfiguration.id == model_id).first()

        if not data:
            raise ValueError("Model not found")

        features = json.loads(data.feature_mappings) if data.feature_mappings else {}
        input_features = list(features.keys()) if features else []

        return JSONResponse(content={
            "model_id": model_id,
            "input_features": input_features
        })

    except ValueError as e:
        return JSONResponse(status_code=400, detail=str(e))
    except Exception as e:
        logger.log_error(f"Error getting model input features: {str(e)}", exc_info=True)
        return JSONResponse(status_code=500, detail=f"Internal server error: {str(e)}")