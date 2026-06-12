from model import ModelVersion, ModelConfiguration, CalculationResult
from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from utils.log_utils import session_logger as logger
from datetime import datetime
import json  # ✅ ADD THIS IMPORT

version_router = APIRouter(prefix="/api/version", tags=["Model Versions"])

@version_router.get("/{model_id}")
def get_model_versions(model_id: int, db: Session = Depends(get_db)):
    """Fetch model versions for a given model configuration"""
    model_config = db.query(ModelConfiguration).filter(
        ModelConfiguration.id == model_id
    ).first()
    
    if not model_config:
        raise HTTPException(status_code=404, detail="Model configuration not found")
    
    versions = db.query(ModelVersion).filter(
        ModelVersion.model_config_id == model_id
    ).order_by(ModelVersion.created_at.desc()).all()
    
    return {
        "model_id": model_id,
        "model_name": model_config.model_name,
        "versions": [
            {
                "version_number": v.version_number,
                "created_at": v.created_at
            } for v in versions
        ]
    }


@version_router.post("/calculation/{model_id}")
def model_calculation(model_id: int, target_version_number: int, db: Session = Depends(get_db)):
    """Perform model calculation for a specific version"""
    try:
        model_config = db.query(ModelConfiguration).filter(
            ModelConfiguration.id == model_id
        ).first()
        
        if not model_config:
            raise HTTPException(status_code=404, detail="Model configuration not found")
        
        target_version = db.query(ModelVersion).filter(
            ModelVersion.model_config_id == model_id,
            ModelVersion.version_number == target_version_number
        ).first()
        
        if not target_version:
            raise HTTPException(status_code=404, detail="Model version not found")
        
        # ✅ FIX: Parse JSON string back to dict
        metrics_data = target_version.metrics
        if isinstance(metrics_data, str):
            try:
                metrics_data = json.loads(metrics_data)
            except json.JSONDecodeError:
                logger.log_error(f"Failed to parse metrics JSON for version {target_version_number}")
                metrics_data = {"error": "Invalid JSON format"}
        
        return JSONResponse({
            "model_id": model_id,
            "target_version_number": target_version_number,
            "metrics": metrics_data,  # ✅ Now returns as dict, not string
            "status": "success"
        })
        
    except Exception as e:
        logger.log_error(f"Error during model calculation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@version_router.post("/use/{model_id}/{version_number}")
def use_version(model_id: int, version_number: int, db: Session = Depends(get_db)):
    """Set a specific model version as the active version"""
    try:
        model_config = db.query(ModelConfiguration).filter(
            ModelConfiguration.id == model_id
        ).first()
        
        if not model_config:
            raise HTTPException(status_code=404, detail="Model configuration not found")
        
        model_calculation = db.query(CalculationResult).filter(
            CalculationResult.model_config_id == model_id
        ).order_by(CalculationResult.calculated_at.desc()).first()
        
        target_version = db.query(ModelVersion).filter(
            ModelVersion.model_config_id == model_id,
            ModelVersion.version_number == version_number
        ).first()
        
        if not target_version:
            raise HTTPException(status_code=404, detail="Model version not found")
        
        # Update model config to use this version
        model_config.model_path = target_version.model_path_onnx
        model_config.updated_at = datetime.utcnow()
        
        # ✅ FIX: Keep metrics as JSON string when storing
        if model_calculation:
            # Metrics should already be a JSON string from the database
            # No need to parse/re-serialize, just assign
            model_calculation.result_data = target_version.metrics
            model_calculation.calculated_at = target_version.created_at
        
        db.commit()
        
        return JSONResponse(content={
            "status": "success",
            "message": f"Model version {version_number} is now active for model ID {model_id}",
            "model_id": model_id,
            "version_number": version_number
        })
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.log_error(f"Error setting active version: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@version_router.get('/get_use/{model_id}')
def get_use(model_id: int, db: Session = Depends(get_db)):
    try:
        model_config = db.query(ModelConfiguration).filter(
            ModelConfiguration.id == model_id
        ).first()
        
        if not model_config:
            raise HTTPException(status_code=404, detail="Model configuration not found")
        
        model_version = db.query(ModelVersion).filter(
            ModelVersion.model_path_onnx == model_config.model_path
        ).first()
        
        if not model_version:
            return JSONResponse({
                'status': 'Failed',
                'error': 'No matching version found for current model path'
            })
        
        return JSONResponse({
            'status': 'Success',
            'model_version': model_version.version_number
        })
        
    except Exception as e:
        logger.log_error(f"Error getting active version: {str(e)}", exc_info=True)
        return JSONResponse({
            'status': 'Failed',
            'error': str(e)
        })
