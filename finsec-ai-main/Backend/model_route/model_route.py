from fastapi import APIRouter, HTTPException, Depends, Body, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse, Response, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from sqlalchemy.engine import Result
from typing import Dict, Any, Optional
from datetime import datetime
import pandas as pd
import numpy as np
from pathlib import Path
import uuid
import onnx
from database import get_db, SessionLocal
from model import ModelConfiguration, DataFile, CalculationResult, ModelType, ModelVersion
from utils.prediction_utils import evaluate_onnx, evaluate_unsupervised_with_shap
from config import ONNX_SUP_PATH, CSV_PATH, ONNX_PATH, UNSUP_CSV_PATH, TARGET_COLUMN, DATA_DIR, MODEL_DIR
import os
import threading
from model_route.model_schema import (
    ModelConfigCreate, ModelConfigUpdate, DataFileUpload, CalculationRequest, CalculationResponse
)
import json
from utils.log_utils import session_logger as logger
from database import engine
from config import TableNames
from datetime import date, datetime

def run_calculation_in_background(
    model_config_id: int,
    alert_category: str,
    calculation_type: str,
    model_type: str,
    model_path: str,
    data_file_path: str,
    target_column: Optional[str],
    additional_params: Dict[str, Any]
):
    """Run calculation in background thread with its own database session"""
    db = SessionLocal()
    try:
        logger.log_info(f"Background calculation started for {alert_category} - {calculation_type}")
        logger.log_info(f"Model path: {model_path}")
        logger.log_info(f"Data path: {data_file_path}")
        
        calculation_result = {}
        
        if model_type == 'supervised':
            try:
                eval_result = evaluate_onnx(
                    model_path,
                    data_file_path,
                    target_col=target_column
                )
            except Exception as eval_error:
                logger.log_error(f"Error in evaluate_onnx: {eval_error}", exc_info=True)
                eval_result = {"error": str(eval_error)}
            
            calculation_result = {
                "evaluation_result": eval_result,
                "model_path": model_path,
                "data_path": data_file_path,
                "target_column": target_column,
                "calculation_type": calculation_type
            }
        else:  # unsupervised
            try:
                eval_result = evaluate_unsupervised_with_shap(
                    onnx_path=model_path,
                    csv_path=data_file_path,
                    target_col=None,
                    max_points=additional_params.get('max_points'),
                    background_size=additional_params.get('background_size', 100),
                    shap_nsamples=additional_params.get('shap_nsamples', 50),
                    max_rows=None
                )
            except Exception as eval_error:
                logger.log_error(f"Error in evaluate_unsupervised_with_shap: {eval_error}", exc_info=True)
                eval_result = {"error": str(eval_error)}
            
            calculation_result = {
                "evaluation_result": eval_result,
                "model_path": model_path,
                "data_path": data_file_path,
                "calculation_type": calculation_type
            }
        
        # ✅ FIX 1: Update ModelVersion with serialized metrics
        if model_type == 'supervised':
            try:
                logger.log_info(f"Evaluation completed successfully")
                latest_version = db.query(ModelVersion).filter(
                    ModelVersion.model_config_id == model_config_id
                ).order_by(ModelVersion.version_number.desc()).first()
                
                if latest_version:
                    logger.log_info(f"Found ModelVersion ID={latest_version.id}, v{latest_version.version_number}")
                    
                    if isinstance(calculation_result, dict) and 'error' not in calculation_result:
                        # Extract accuracy
                        accuracy = None
                        for key in ['accuracy', 'test_accuracy', 'val_accuracy', 'validation_accuracy']:
                            if key in calculation_result:
                                accuracy = calculation_result[key]
                                break
                        
                        if accuracy is not None:
                            latest_version.accuracy = float(accuracy)
                            logger.log_info(f"Set accuracy to: {accuracy}")
                        
                        # ✅ FIXED: Serialize metrics dict to JSON string
                        logger.log_info(f"Saving metrics to ModelVersion: {list(calculation_result.keys())}")
                        latest_version.metrics = json.dumps(calculation_result)
                        
                        db.commit()
                        db.refresh(latest_version)
                        logger.log_info(f"✅ Successfully updated ModelVersion v{latest_version.version_number}")
                else:
                    logger.log_warning(f"No ModelVersion found for model_config_id={model_config_id}")
                    
            except Exception as version_error:
                logger.log_error(f"Error updating ModelVersion: {version_error}", exc_info=True)
                db.rollback()
        
        logger.log_info("Added the version Calculation")
        
        # ✅ FIX 2: Serialize before saving to CalculationResult
        # Ensure params is serialized if it's a dict
        params_json = json.dumps(additional_params) if isinstance(additional_params, dict) else additional_params
        calculation_result_json = json.dumps(calculation_result) if isinstance(calculation_result, dict) else calculation_result
        
        # Check if calculation already exists
        existing_calculation = db.query(CalculationResult).filter(
            CalculationResult.model_config_id == model_config_id,
            CalculationResult.calculation_type == calculation_type
        ).order_by(CalculationResult.calculated_at.desc()).first()
        
        if existing_calculation:
            # ✅ FIXED: Update with serialized JSON
            existing_calculation.result_data = calculation_result_json
            existing_calculation.calculation_metadata = params_json
            existing_calculation.calculated_at = datetime.now()
            logger.log_info(f"Updated existing calculation record for {alert_category}")
        else:
            # ✅ FIXED: Create with serialized JSON
            calc_result = CalculationResult(
                model_config_id=model_config_id,
                calculation_type=calculation_type,
                result_data=calculation_result_json,
                calculation_metadata=params_json
            )
            db.add(calc_result)
            logger.log_info(f"Created new calculation record for {alert_category}")
        
        db.commit()
        logger.log_info(f"Background calculation completed successfully for {alert_category}")
        
    except Exception as e:
        db.rollback()
        logger.log_error(f"Error in background calculation: {str(e)}", exc_info=True)
    finally:
        db.close()


model_router = APIRouter(tags=["Model Management"])

@model_router.get('/model_stats', tags=['Model Stats'])
def model_stats():
    # Get supervised model performance statistics
    onnx_path = ONNX_SUP_PATH
    file_path = CSV_PATH
    target_column = TARGET_COLUMN
    return evaluate_onnx(onnx_path, file_path, target_col=target_column)

@model_router.get('/unsup_stats', tags=['Model Stats'])
def unsup_stats():
    # Get unsupervised model performance statistics with SHAP
    onnx_path = ONNX_PATH
    csv_path = UNSUP_CSV_PATH

    if not onnx_path or not csv_path:
        raise HTTPException(status_code=400, detail="Missing ONNX_PATH or UNSUP_CSV_PATH env")

    return evaluate_unsupervised_with_shap(
        onnx_path=onnx_path,
        csv_path=csv_path,
        target_col=None,
        max_points=None,
        background_size=100,
        shap_nsamples=50,
        max_rows=None
    )

@model_router.post("/model_config/model_inputs", tags=['Model Configuration'])
async def upload_onnx_file(file: UploadFile = File(...)):
    """Upload ONNX file and return its information including unique filename"""
    try:
        # Validate file extension
        if not file.filename.endswith('.onnx'):
            raise HTTPException(
                status_code=400,
                detail="File must be an ONNX file (.onnx)"
            )

        # Read file content
        contents = await file.read()

        # Load ONNX model from bytes to validate and get inputs
        try:
            onnx_model = onnx.load_model_from_string(contents)
            required_columns = [i.name for i in onnx_model.graph.input]
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid ONNX file: {str(e)}"
            )

        # Generate unique filename with UUID
        original_filename = file.filename
        file_extension = original_filename.split('.')[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"

        # Ensure MODEL_DIR exists
        model_dir = Path(MODEL_DIR)
        model_dir.mkdir(parents=True, exist_ok=True)

        # Save with unique filename
        save_path = model_dir / unique_filename

        # Write the file
        with open(save_path, "wb") as buffer:
            buffer.write(contents)

        logger.log_info(f"Saved ONNX file: {original_filename} as {unique_filename} at {save_path}")

        return {
            "status": "success",
            "original_filename": original_filename,
            "saved_filename": unique_filename,
            "file_path": str(save_path),
            "size": len(contents),
            "columns": required_columns,
            "message": "File uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.log_error(f"Error uploading ONNX file: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@model_router.post('/model_config/save_mapping', tags=['Model Configuration'])
async def save_feature_mapping(mapping_data: Dict[str, Any] = Body(...)):
    """Save feature mapping configuration"""
    try:
        # Validate the mapping data
        if 'alert_category' not in mapping_data or 'feature_mappings' not in mapping_data:
            raise HTTPException(status_code=400, detail="Missing required fields: alert_category and feature_mappings")

        alert_category = mapping_data['alert_category']
        feature_mappings = mapping_data['feature_mappings']
        model_filename = mapping_data.get('model_filename', 'unknown')

        # Save to a JSON file
        config_path = Path("model_configs") / f"{alert_category}_mapping.json"
        config_path.parent.mkdir(exist_ok=True)

        config_data = {
            "alert_category": alert_category,
            "model_filename": model_filename,
            "feature_mappings": feature_mappings,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        with config_path.open("w") as f:
            json.dump(config_data, f, indent=2)

        return {
            "status": "success",
            "message": "Feature mapping saved successfully",
            "configuration": config_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@model_router.get('/model_config/get_mapping/{alert_category}', tags=['Model Configuration'])
async def get_feature_mapping(alert_category: str):
    """Get saved feature mapping configuration for an alert category"""
    try:
        config_path = Path("model_configs") / f"{alert_category}_mapping.json"

        if not config_path.exists():
            return {
                "status": "not_found",
                "message": f"No configuration found for category: {alert_category}",
                "configuration": None
            }

        with config_path.open("r") as f:
            config_data = json.load(f)

        return {
            "status": "success",
            "message": "Configuration retrieved successfully",
            "configuration": config_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@model_router.post('/model_info', tags=['Model Configuration'])
def model_info():
    return JSONResponse({'Sample': 'File'})

@model_router.post("/model_config/create", tags=["Model Configuration"])
async def create_model_configuration(
    config_data: ModelConfigCreate = Body(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    try:
        logger.log_info(f"Creating model configuration for category: {config_data.alert_category}")
        
        # Extract model type
        if hasattr(config_data.model_type, 'value'):
            model_type_str = config_data.model_type.value
        else:
            model_type_str = str(config_data.model_type)
        
        config_dict = config_data.dict()
        alert_category = config_dict.get('alert_category')
        model_name = config_dict.get('model_name')
        model_filename = config_dict.get('model_filename')
        target_column = config_dict.get('target_column')
        data_file_path = config_dict.get('data_file_path')
        data_file_type = config_dict.get('data_file_type')
        feature_mappings_raw = config_dict.get('feature_mappings', {})
        
        # FIXED: Serialize feature_mappings to JSON string for Oracle
        if isinstance(feature_mappings_raw, dict):
            feature_mappings = json.dumps(feature_mappings_raw)
        elif isinstance(feature_mappings_raw, str):
            try:
                parsed = json.loads(feature_mappings_raw)
                feature_mappings = json.dumps(parsed)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="feature_mappings must be valid JSON")
        else:
            feature_mappings = "{}"
        
        # FIXED: Correct validation logic
        if not model_filename or not model_filename.strip():  # Check if empty or whitespace
            raise HTTPException(status_code=400, detail="model_filename is required. Please upload an ONNX model file first.")
        
        if not model_filename.endswith('.onnx'):
            raise HTTPException(status_code=400, detail=f"Invalid model_filename: {model_filename}. Must end with .onnx")
        
        if not model_name or not model_name.strip():
            raise HTTPException(status_code=400, detail="Model name is required")
        
        if not alert_category or not alert_category.strip():
            raise HTTPException(status_code=400, detail="Alert category is required")
        
        # Validate model file exists
        model_dir_path = Path(MODEL_DIR)
        model_dir_path.mkdir(parents=True, exist_ok=True)
        full_model_path = model_dir_path / model_filename
        
        if not full_model_path.exists():
            raise HTTPException(
                status_code=400, 
                detail=f"Model file not found at {full_model_path}. Please upload the ONNX file first using the /model_inputs endpoint."
            )
        
        if not full_model_path.is_file():
            raise HTTPException(status_code=400, detail=f"Model path is a directory, not a file: {full_model_path}")
        
        # Create model configuration with serialized JSON
        model_config = ModelConfiguration(
            alert_category=alert_category,
            model_name=model_name,
            model_filename=model_filename,
            model_path=str(full_model_path),
            model_type=ModelType(model_type_str),
            target_column=target_column,
            feature_mappings=feature_mappings
        )
        
        db.add(model_config)
        db.commit()
        db.refresh(model_config)
        
        config_id = model_config.id
        created_at_str = model_config.created_at.isoformat() if model_config.created_at else datetime.now().isoformat()
        
        logger.log_info(f"Created model configuration with ID: {config_id}")
        
        # Create ModelVersion for supervised models
        model_version = None
        if model_type_str == 'supervised':
            try:
                pkl_path = str(full_model_path).replace('.onnx', '.pkl')
                if not Path(pkl_path).exists():
                    pkl_path = "not exist"
                
                model_version = ModelVersion(
                    model_config_id=config_id,
                    version_number=1,
                    model_path_onnx=str(full_model_path),
                    model_path_pkl=pkl_path,
                    accuracy=None,
                    metrics=None,
                    created_at=datetime.now()
                )
                
                db.add(model_version)
                db.commit()
                db.refresh(model_version)
                
                logger.log_info(f"Created ModelVersion v1 for supervised model: {alert_category}")
            except Exception as version_error:
                logger.log_error(f"Error creating model version: {version_error}", exc_info=True)
        
        # Create data file record if provided
        if data_file_path and data_file_type:
            await create_data_file_record(
                db=db,
                model_config_id=config_id,
                filepath=data_file_path,
                filetype=data_file_type
            )
            db.commit()
            db.refresh(model_config)
        
        # Start background calculation if data file is provided
        if data_file_path:
            logger.log_info(f"Starting background calculation for model config {config_id}")
            threading.Thread(
                target=run_calculation_in_background,
                args=(
                    config_id,
                    alert_category,
                    'supervised_metrics' if model_type_str == 'supervised' else 'unsupervised_analysis',
                    model_type_str,
                    str(full_model_path),
                    data_file_path,
                    target_column,
                    {"model_type": model_type_str}
                ),
                daemon=True
            ).start()
        
        # Build response with deserialized feature_mappings
        response_data = {
            "id": config_id,
            "alert_category": alert_category,
            "model_name": model_name,
            "model_filename": model_filename,
            "model_path": str(full_model_path),
            "model_type": model_type_str,
            "target_column": target_column,
            "feature_mappings": json.loads(feature_mappings),
            "created_at": created_at_str,
            "updated_at": datetime.now().isoformat(),
            "data_files": [],
            "calculation_results": []
        }
        
        if model_version:
            response_data["model_version"] = {
                "id": model_version.id,
                "version_number": model_version.version_number,
                "model_path_onnx": model_version.model_path_onnx,
                "model_path_pkl": model_version.model_path_pkl,
                "accuracy": model_version.accuracy,
                "created_at": model_version.created_at.isoformat() if model_version.created_at else None
            }
        
        return JSONResponse(content=response_data)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.log_error(f"Error creating model configuration: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@model_router.get("/model_config/get/{alert_category}", tags=["Model Configuration"])
async def get_model_configuration(
    alert_category: str,
    db: Session = Depends(get_db)
):
    """Get model configuration by alert category"""
    try:
        model_config = db.query(ModelConfiguration).filter(
            ModelConfiguration.alert_category == alert_category
        ).first()
        
        if not model_config:
            raise HTTPException(
                status_code=404,
                detail=f"Configuration for category '{alert_category}' not found"
            )
        
        # FIXED: Deserialize feature_mappings from JSON string
        feature_mappings = json.loads(model_config.feature_mappings) if model_config.feature_mappings else {}
        
        result = {
            "id": model_config.id,
            "alert_category": model_config.alert_category,
            "model_name": model_config.model_name,
            "model_filename": model_config.model_filename,
            "model_path": model_config.model_path,
            "model_type": model_config.model_type.value if hasattr(model_config.model_type, 'value') else str(model_config.model_type),
            "target_column": model_config.target_column,
            "feature_mappings": feature_mappings,  # Deserialized
            "created_at": model_config.created_at.isoformat() if model_config.created_at else None,
            "updated_at": model_config.updated_at.isoformat() if model_config.updated_at else None,
            "data_files": [],
            "calculation_results": [],
            "versions": []
        }
        
        # Add model versions
        if hasattr(model_config, 'versions') and model_config.versions:
            for version in model_config.versions:
                # FIXED: Deserialize metrics if it's a JSON string
                metrics = version.metrics
                if isinstance(metrics, str):
                    try:
                        metrics = json.loads(metrics)
                    except json.JSONDecodeError:
                        metrics = None
                
                result["versions"].append({
                    "id": version.id,
                    "version_number": version.version_number,
                    "model_path_onnx": version.model_path_onnx,
                    "model_path_pkl": version.model_path_pkl,
                    "accuracy": version.accuracy,
                    "metrics": metrics,  # Deserialized
                    "created_at": version.created_at.isoformat() if version.created_at else None
                })
        
        # Add data files
        if hasattr(model_config, 'data_files') and model_config.data_files:
            for df in model_config.data_files:
                result["data_files"].append({
                    "id": df.id,
                    "filename": df.file_name,
                    "filepath": df.file_path,
                    "filetype": df.file_type,
                    "filesize": df.file_size,
                    "rowcount": df.row_count,
                    "columncount": df.column_count,
                    "uploaded_at": df.uploaded_at.isoformat() if hasattr(df, 'uploaded_at') and df.uploaded_at else None
                })
        
        # Add calculation results
        if hasattr(model_config, 'calculation_results') and model_config.calculation_results:
            for cr in model_config.calculation_results:
                # FIXED: Deserialize result_data if it's a JSON string
                result_data = cr.result_data
                if isinstance(result_data, str):
                    try:
                        result_data = json.loads(result_data)
                    except json.JSONDecodeError:
                        result_data = None
                
                result["calculation_results"].append({
                    "id": cr.id,
                    "calculation_type": cr.calculation_type,
                    "result_data": result_data,  # Deserialized
                    "calculated_at": cr.calculated_at.isoformat() if cr.calculated_at else None
                })
        
        return Response(content=json.dumps(result), media_type="application/json")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.log_error(f"Error getting configuration: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@model_router.get("/model_config/stats/{alert_category}/{model_type}", tags=['Model Configuration'])
async def get_model_stats(
    alert_category: str,
    model_type: str,
    db: Session = Depends(get_db)
):
    """Get model statistics from calculated results"""
    try:
        # Get the model configuration
        model_config = db.query(ModelConfiguration).filter(
            ModelConfiguration.alert_category == alert_category,
            ModelConfiguration.model_type == ModelType(model_type)
        ).first()

        if not model_config:
            return JSONResponse(
                status_code=200,
                content={
                    "status": "not_found",
                    "message": f"Configuration for category '{alert_category}' with type '{model_type}' not found",
                    "alert_category": alert_category,
                    "model_type": model_type,
                    "data": None
                }
            )

        # For supervised models, try to get metrics from ModelVersion first
        if model_type == 'supervised':
            latest_version = db.query(ModelVersion).filter(
                ModelVersion.model_config_id == model_config.id
            ).order_by(ModelVersion.version_number.desc()).first()

            if latest_version and latest_version.metrics:
                return JSONResponse(
                    status_code=200,
                    content={
                        "status": "success",
                        "message": "Statistics retrieved from model version",
                        "alert_category": alert_category,
                        "model_type": model_type,
                        "version_number": latest_version.version_number,
                        "accuracy": latest_version.accuracy,
                        "calculated_at": latest_version.created_at.isoformat() if latest_version.created_at else None,
                        "data": latest_version.metrics,
                        "config_exists": True
                    }
                )

        # Get the latest calculation result (fallback or for unsupervised)
        calculation = db.query(CalculationResult).filter(
            CalculationResult.model_config_id == model_config.id,
            CalculationResult.calculation_type.in_(['supervised_metrics', 'unsupervised_analysis'])
        ).order_by(CalculationResult.calculated_at.desc()).first()

        if not calculation:
            return JSONResponse(
                status_code=200,
                content={
                    "status": "no_calculation",
                    "message": "No calculations found for this model",
                    "alert_category": alert_category,
                    "model_type": model_type,
                    "data": None
                }
            )

        # Parse the result_data
        if calculation.result_data:
            eval_result = None
            if 'evaluation_result' in calculation.result_data:
                eval_result = json.loads(calculation.result_data)['evaluation_result'] if isinstance(calculation.result_data, str) else calculation.result_data['evaluation_result']
            elif 'eval_result' in calculation.result_data:
                eval_result = calculation.result_data['eval_result']
            else:
                return JSONResponse(
                    status_code=200,
                    content={
                        "status": "invalid_format",
                        "message": "Calculation result has unexpected format",
                        "alert_category": alert_category,
                        "model_type": model_type,
                        "data": None,
                        "config_exists": True
                    }
                )

            # Check if it's an error result
            if isinstance(eval_result, dict) and 'error' in eval_result:
                return JSONResponse(
                    status_code=200,
                    content={
                        "status": "error",
                        "message": f"Calculation failed: {eval_result['error']}",
                        "alert_category": alert_category,
                        "model_type": model_type,
                        "error": eval_result['error'],
                        "calculated_at": calculation.calculated_at.isoformat() if calculation.calculated_at else None,
                        "config_exists": True
                    }
                )

            # Clean the eval_result
            def clean_for_json(obj):
                from datetime import datetime, date
                from decimal import Decimal

                if isinstance(obj, dict):
                    return {k: clean_for_json(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [clean_for_json(item) for item in obj]
                elif isinstance(obj, tuple):
                    return [clean_for_json(item) for item in obj]
                elif isinstance(obj, (np.integer, np.int64, np.int32)):
                    return int(obj)
                elif isinstance(obj, (np.floating, np.float64, np.float32)):
                    return float(obj)
                elif isinstance(obj, np.ndarray):
                    return obj.tolist()
                elif isinstance(obj, (datetime, date)):
                    return obj.isoformat()
                elif isinstance(obj, Decimal):
                    return float(obj)
                elif isinstance(obj, bytes):
                    return obj.decode('utf-8', errors='ignore')
                elif hasattr(obj, '__dict__'):
                    return str(obj)
                else:
                    return obj

            clean_eval_result = clean_for_json(eval_result)
            clean_metadata = {}
            if calculation.metadata:
                clean_metadata = clean_for_json(calculation.metadata)

            return JSONResponse(
                status_code=200,
                content={
                    "status": "success",
                    "message": "Statistics retrieved successfully",
                    "alert_category": alert_category,
                    "model_type": model_type,
                    "calculation_id": calculation.id,
                    "calculated_at": calculation.calculated_at.isoformat() if calculation.calculated_at else None,
                    "data": clean_eval_result,
                    "metadata": clean_metadata,
                    "config_exists": True
                }
            )

        return JSONResponse(
            status_code=200,
            content={
                "status": "invalid_format",
                "message": "Calculation result is empty",
                "alert_category": alert_category,
                "model_type": model_type,
                "data": None,
                "config_exists": True
            }
        )
    except Exception as e:
        logger.log_error(f"Error getting model stats: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": f"Error retrieving statistics: {str(e)}",
                "alert_category": alert_category,
                "model_type": model_type,
                "data": None
            }
        )

@model_router.get("/model_config/list", tags=["Model Configuration"])
async def list_model_configurations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all model configurations"""
    try:
        configs = db.query(ModelConfiguration).offset(skip).limit(limit).all()
        
        result = []
        for config in configs:
            # FIXED: Deserialize feature_mappings from JSON string
            feature_mappings = json.loads(config.feature_mappings) if config.feature_mappings else {}
            
            config_dict = {
                "id": config.id,
                "alert_category": config.alert_category,
                "model_name": config.model_name,
                "model_filename": config.model_filename,
                "model_path": config.model_path,
                "model_type": config.model_type.value if hasattr(config.model_type, 'value') else str(config.model_type),
                "target_column": config.target_column,
                "feature_mappings": feature_mappings,  # Deserialized
                "created_at": config.created_at.isoformat() if config.created_at else None,
                "updated_at": config.updated_at.isoformat() if config.updated_at else None,
                "data_files": [],
                "calculation_results": [],
                "versions": []
            }
            
            # Add versions
            if hasattr(config, 'versions') and config.versions:
                for version in config.versions:
                    config_dict["versions"].append({
                        "version_number": version.version_number,
                        "accuracy": version.accuracy,
                        "created_at": version.created_at.isoformat() if version.created_at else None
                    })
            
            # Add latest 5 calculation results
            if hasattr(config, 'calculation_results') and config.calculation_results:
                for cr in config.calculation_results[:5]:
                    config_dict["calculation_results"].append({
                        "id": cr.id,
                        "calculation_type": cr.calculation_type,
                        "calculated_at": cr.calculated_at.isoformat() if cr.calculated_at else None
                    })
            
            result.append(config_dict)
        
        return Response(content=json.dumps(result), media_type="application/json")
        
    except Exception as e:
        logger.log_error(f"Error listing configurations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error listing configurations: {str(e)}")


@model_router.delete("/model_config/delete/{model_id}", tags=['Model Configuration'])
async def delete_model_configuration(model_id: int, db: Session = Depends(get_db)):
    try:
        model_config = db.query(ModelConfiguration).filter(ModelConfiguration.id == model_id).first()

        if not model_config:
            raise HTTPException(status_code=404, detail="Model configuration not found")

        model_path = Path(model_config.model_path)
        if model_path.exists() and model_path.is_file():
            try:
                model_path.unlink()
                logger.log_info(f"Deleted model file: {model_path}")
            except Exception as e:
                logger.log_warning(f"Could not delete model file: {e}")

        db.delete(model_config)
        db.commit()

        return JSONResponse(content={"status": "success", "message": "Model configuration deleted successfully"})
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.log_error(f"Error deleting model configuration: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ================== Data File Management Routes ==================

@model_router.post("/data_file/upload", tags=['Data Management'])
async def upload_data_file(
    file: UploadFile = File(...),
    alert_category: str = Body(...),
    db: Session = Depends(get_db)
):
    """Upload CSV or Parquet file and associate with model configuration"""
    try:
        file_extension = file.filename.split('.')[-1].lower()
        if file_extension not in ['csv', 'parquet']:
            raise HTTPException(status_code=400, detail="File must be CSV or Parquet")

        model_config = db.query(ModelConfiguration).filter(
            ModelConfiguration.alert_category == alert_category
        ).first()

        if not model_config:
            raise HTTPException(
                status_code=404,
                detail=f"Configuration for category '{alert_category}' not found"
            )

        data_dir_path = Path(DATA_DIR)
        data_dir_path.mkdir(parents=True, exist_ok=True)

        file_path = data_dir_path / f"{alert_category}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        data_file = await create_data_file_record(
            db=db,
            model_config_id=model_config.id,
            filepath=str(file_path),
            filetype=file_extension
        )

        db.commit()

        return {
            "status": "success",
            "message": "File uploaded successfully",
            "file_id": data_file.id,
            "file_path": str(file_path)
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.log_error(f"Error uploading data file: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@model_router.post("/data_file/set_path", tags=['Data Management'])
async def set_data_file_path(
    data_upload: DataFileUpload = Body(...),
    db: Session = Depends(get_db)
):
    """Set path to existing CSV or Parquet file"""
    try:
        if data_upload.file_path.lower().endswith('.onnx'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file path: ONNX files cannot be used as data files."
            )

        if not os.path.exists(data_upload.file_path):
            raise HTTPException(status_code=400, detail="File path does not exist")

        model_config = db.query(ModelConfiguration).filter(
            ModelConfiguration.alert_category == data_upload.alert_category
        ).first()

        if not model_config:
            raise HTTPException(
                status_code=404,
                detail=f"Configuration for category '{data_upload.alert_category}' not found"
            )

        data_file = await create_data_file_record(
            db=db,
            model_config_id=model_config.id,
            filepath=data_upload.file_path,
            filetype=data_upload.file_type
        )

        db.commit()

        return {
            "status": "success",
            "message": "Data file path set successfully",
            "file_id": data_file.id
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.log_error(f"Error setting data file path: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ================== Calculation Routes ==================

@model_router.post("/calculate", response_model=CalculationResponse, tags=['Calculations'])
async def run_calculations(
    calc_request: CalculationRequest = Body(...),
    db: Session = Depends(get_db)
):
    """Run calculations on the data and save results"""
    try:
        model_config = db.query(ModelConfiguration).filter(
            ModelConfiguration.alert_category == calc_request.alert_category,
            ModelConfiguration.model_type == ModelType(
                calc_request.additional_params.get('model_type', 'supervised')
            )
        ).first()

        if not model_config:
            raise HTTPException(
                status_code=404,
                detail=f"Configuration for category '{calc_request.alert_category}' not found"
            )

        model_path = Path(model_config.model_path)
        if not model_path.exists():
            raise HTTPException(status_code=400, detail=f"Model file does not exist")

        existing_calculation = db.query(CalculationResult).filter(
            CalculationResult.model_config_id == model_config.id,
            CalculationResult.calculation_type == calc_request.calculation_type
        ).order_by(CalculationResult.calculated_at.desc()).first()

        data_file = db.query(DataFile).filter(
            DataFile.model_config_id == model_config.id
        ).order_by(DataFile.uploaded_at.desc()).first()

        if not data_file:
            raise HTTPException(status_code=400, detail="No data file found")

        should_calculate = (
            existing_calculation is None or
            (data_file.uploaded_at and existing_calculation.calculated_at and
             data_file.uploaded_at > existing_calculation.calculated_at)
        )

        if not should_calculate:
            return CalculationResponse(
                status="success",
                message="Using existing calculation results",
                result=existing_calculation.result_data,
                calculation_id=existing_calculation.id
            )

        calculation_result = {}
        if model_config.model_type == ModelType.SUPERVISED:
            try:
                eval_result = evaluate_onnx(
                    model_config.model_path,
                    data_file.file_path,
                    target_col=model_config.target_column
                )

                # Update ModelVersion with metrics
                latest_version = db.query(ModelVersion).filter(
                    ModelVersion.model_config_id == model_config.id
                ).order_by(ModelVersion.version_number.desc()).first()

                if latest_version and isinstance(eval_result, dict):
                    # Extract accuracy if available
                    accuracy = eval_result.get('accuracy') or eval_result.get('test_accuracy')
                    if accuracy:
                        latest_version.accuracy = float(accuracy)

                    # Save full metrics
                    latest_version.metrics = eval_result
                    db.commit()
                    logger.log_info(f"Updated ModelVersion v{latest_version.version_number} with metrics")

            except Exception as eval_error:
                logger.log_error(f"Error in evaluate_onnx: {eval_error}", exc_info=True)
                eval_result = {"error": str(eval_error)}

            calculation_result = {
                "evaluation_result": eval_result,
                "model_path": model_config.model_path,
                "data_path": data_file.file_path,
                "target_column": model_config.target_column,
                "calculation_type": calc_request.calculation_type
            }
        else:
            try:
                eval_result = evaluate_unsupervised_with_shap(
                    model_config.model_path,
                    data_file.file_path,
                    target_col=None,
                    max_points=calc_request.additional_params.get('max_points')
                )
            except Exception as eval_error:
                logger.log_error(f"Error in evaluate_unsupervised: {eval_error}", exc_info=True)
                eval_result = {"error": str(eval_error)}

            calculation_result = {
                "evaluation_result": eval_result,
                "model_path": model_config.model_path,
                "data_path": data_file.file_path,
                "calculation_type": calc_request.calculation_type
            }

        additional_params = calc_request.additional_params if isinstance(calc_request.additional_params, dict) else {}

        if existing_calculation:
            existing_calculation.result_data = calculation_result
            existing_calculation.metadata = additional_params
            existing_calculation.calculated_at = datetime.now()
            calc_result = existing_calculation
        else:
            calc_result = CalculationResult(
                model_config_id=model_config.id,
                calculation_type=calc_request.calculation_type,
                result_data=calculation_result,
                metadata=additional_params
            )
            db.add(calc_result)

        db.commit()
        db.refresh(calc_result)

        return CalculationResponse(
            status="success",
            message="Calculation completed successfully",
            result=calculation_result,
            calculation_id=calc_result.id
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.log_error(f"Error running calculations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@model_router.get("/calculations/{alert_category}", tags=['Calculations'])
async def get_calculations(
    alert_category: str,
    db: Session = Depends(get_db)
):
    """Get all calculation results for a model configuration"""
    model_config = db.query(ModelConfiguration).filter(
        ModelConfiguration.alert_category == alert_category
    ).first()

    if not model_config:
        raise HTTPException(
            status_code=404,
            detail=f"Configuration for category '{alert_category}' not found"
        )

    calculations = db.query(CalculationResult).filter(
        CalculationResult.model_config_id == model_config.id
    ).order_by(CalculationResult.calculated_at.desc()).all()

    return {
        "alert_category": alert_category,
        "calculations": [
            {
                "id": calc.id,
                "calculation_type": calc.calculation_type,
                "result_data": calc.result_data,
                "metadata": calc.metadata,
                "calculated_at": calc.calculated_at
            }
            for calc in calculations
        ]
    }

# ================== Helper Functions ==================

async def create_data_file_record(
    db: Session,
    model_config_id: int,
    filepath: str,
    filetype: str
) -> DataFile:
    """Helper function to create data file record with metadata"""
    try:
        logger.log_info(f"Creating data file record for path: {filepath}")
        
        filepath_obj = Path(filepath)
        filepath_str = str(filepath_obj.resolve())
        
        if not filepath_obj.exists():
            raise Exception(f"File does not exist at path: {filepath_str}")
        
        row_count = None
        column_count = None
        columns_info = "{}"  # Default empty JSON
        
        try:
            if filetype == 'csv':
                df_sample = pd.read_csv(filepath_str, nrows=5)
                with open(filepath_str, 'r') as f:
                    row_count = sum(1 for _ in f) - 1
                column_count = len(df_sample.columns)
                # ✅ FIXED: Serialize to JSON string
                columns_info = json.dumps({col: str(df_sample[col].dtype) for col in df_sample.columns})
                
            elif filetype == 'parquet':
                df = pd.read_parquet(filepath_str)
                row_count = len(df)
                column_count = len(df.columns)
                # ✅ FIXED: Serialize to JSON string
                columns_info = json.dumps({col: str(df[col].dtype) for col in df.columns})
                
        except Exception as e:
            logger.log_error(f"Error reading file metadata: {str(e)}")
            row_count = 0
            column_count = 0
            # ✅ FIXED: Serialize error to JSON string
            columns_info = json.dumps({"error": str(e)})
        
        try:
            file_size = int(filepath_obj.stat().st_size)
        except Exception as e:
            logger.log_error(f"Error getting file size: {str(e)}")
            file_size = 0
        
        data_file = DataFile(
            model_config_id=model_config_id,
            file_type=filetype,
            file_path=filepath_str,
            file_name=filepath_obj.name,
            file_size=file_size,
            row_count=row_count,
            column_count=column_count,
            columns_info=columns_info  # Now a JSON string
        )
        
        db.add(data_file)
        db.flush()
        logger.log_info(f"Successfully created data file record with ID: {data_file.id}")
        return data_file
        
    except Exception as e:
        db.rollback()
        logger.log_error(f"Error creating data file record: {str(e)}", exc_info=True)
        raise Exception(f"Error creating data file record: {str(e)}")


@model_router.get("/calculation/status/{alert_category}/{model_type}", tags=['Calculations'])
async def get_calculation_status(
    alert_category: str,
    model_type: str,
    db: Session = Depends(get_db)
):
    """Check the status of calculation"""
    try:
        model_config = db.query(ModelConfiguration).filter(
            ModelConfiguration.alert_category == alert_category,
            ModelConfiguration.model_type == ModelType(model_type)
        ).first()

        if not model_config:
            raise HTTPException(status_code=404, detail=f"Configuration not found")

        calculation = db.query(CalculationResult).filter(
            CalculationResult.model_config_id == model_config.id
        ).order_by(CalculationResult.calculated_at.desc()).first()

        if not calculation:
            return {
                "status": "not_started",
                "message": "No calculation has been performed yet",
                "calculation_id": None
            }

        result_data = json.loads(calculation.result_data) if isinstance(calculation.result_data, str) else calculation.result_data
        if isinstance(result_data, dict) and 'evaluation_result' in result_data:
            eval_result = result_data['evaluation_result']
            if isinstance(eval_result, dict) and 'error' in eval_result:
                return {
                    "status": "error",
                    "message": f"Calculation failed: {eval_result['error']}",
                    "calculation_id": calculation.id,
                    "calculated_at": calculation.calculated_at.isoformat() if calculation.calculated_at else None
                }

        return {
            "status": "completed",
            "message": "Calculation completed successfully",
            "calculation_id": calculation.id,
            "calculated_at": calculation.calculated_at.isoformat() if calculation.calculated_at else None,
            "result": result_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.log_error(f"Error checking calculation status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@model_router.get("/model_config/categories", tags=['Model Configuration'])
async def get_alert_categories(db: Session = Depends(get_db)):
    """Get all unique alert categories"""
    try:
        configs = db.query(ModelConfiguration).all()

        categories_map = {}
        for config in configs:
            category = config.alert_category
            model_type = config.model_type.value if hasattr(config.model_type, 'value') else str(config.model_type)

            if category not in categories_map:
                categories_map[category] = {
                    "alert_category": category,
                    "model_types": [],
                    "configurations": []
                }

            categories_map[category]["model_types"].append(model_type)
            categories_map[category]["configurations"].append({
                "id": config.id,
                "model_type": model_type,
                "model_filename": config.model_filename,
                "created_at": config.created_at.isoformat() if config.created_at else None
            })

        categories_list = list(categories_map.values())

        return Response(
            content=json.dumps(categories_list),
            media_type="application/json"
        )
    except Exception as e:
        logger.log_error(f"Error getting categories: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@model_router.get("/model_config/list_by_category", tags=['Model Configuration'])
async def list_models_by_category(db: Session = Depends(get_db)):
    try:
        models = db.query(ModelConfiguration).all()

        result = []
        for model in models:
            result.append({
                "id": model.id,
                "model_name": model.model_name,
                "model_filename": model.model_filename,
                "model_type": model.model_type.value if hasattr(model.model_type, 'value') else str(model.model_type),
                "target_column": model.target_column,
                "created_at": model.created_at.isoformat() if model.created_at else None
            })

        return JSONResponse(content={"models": result, "count": len(result)})
    except Exception as e:
        logger.log_error(f"Error listing models: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
@model_router.get("/model_config/list_by_category/{alert_category}", tags=['Model Configuration'])
async def list_models_by_category(alert_category: str, db: Session = Depends(get_db)):
    try:
        models = db.query(ModelConfiguration).filter(
            ModelConfiguration.alert_category == alert_category
        ).all()

        result = []
        for model in models:
            result.append({
                "id": model.id,
                "model_name": model.model_name,
                "model_filename": model.model_filename,
                "model_type": model.model_type.value if hasattr(model.model_type, 'value') else str(model.model_type),
                "target_column": model.target_column,
                "created_at": model.created_at.isoformat() if model.created_at else None
            })

        return JSONResponse(content={"models": result, "count": len(result)})
    except Exception as e:
        logger.log_error(f"Error listing models: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@model_router.put("/model_config/update/{model_id}", tags=['Model Configuration'])
async def update_model_configuration(
    model_id: int,
    config_data: ModelConfigUpdate,
    db: Session = Depends(get_db)
):
    try:
        model_config = db.query(ModelConfiguration).filter(ModelConfiguration.id == model_id).first()

        if not model_config:
            raise HTTPException(status_code=404, detail="Model configuration not found")

        update_data = config_data.dict(exclude_unset=True)

        for key, value in update_data.items():
            if key == 'model_type' and value:
                setattr(model_config, key, ModelType(value.value if hasattr(value, 'value') else value))
            elif value is not None:
                setattr(model_config, key, value)

        model_config.updated_at = datetime.now()

        db.commit()
        db.refresh(model_config)

        return JSONResponse(content={"status": "success", "message": "Model configuration updated successfully"})
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.log_error(f"Error updating model configuration: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
@model_router.get('/model_config/csv_columns')
def get_csv_columns(path:str):
    try:
        df = pd.read_csv(path, nrows=0)
        return JSONResponse({
            'Status': 'Success',
            'Columns': df.columns.to_list()
        }
        )
    except:
        return JSONResponse({
            'status': 'Failed',
            'Column':[],
            'message': 'Data Not found or something went wrong!'
        })
    

@model_router.get('/model_config/model_download')
def model_download(model_id: int, version: int, db: Session=Depends(get_db)):
    try:
        data = db.query(ModelVersion).filter(ModelVersion.model_config_id==model_id, ModelVersion.version_number==version).first()
        model_info = db.query(ModelConfiguration).filter(ModelConfiguration.id==model_id).first()
        if data and model_info:
            return FileResponse(
                path=str(data.model_path_onnx),
                media_type="application/onnx",
                filename=str(f'{model_info.model_name}_v{version}_{uuid.uuid4()}.onnx')
            )
        return JSONResponse({
            'status': 'Failed',
            'message': f'Something went wrong: version or model info not found'
        })
    except Exception as e:
        return JSONResponse({
            'status': 'Failed',
            'message': f'Something went wrong: {e}'
        })

# @model_router.get("/model_config/db/schema", summary="Get schema for all tables")
# def get_database_schema():
#     inspector = inspect(engine)
#     # tables = inspector.get_table_names()
#     tables = [TableNames.ALSALAM_TRANS, TableNames.CUSTOMER_TABLE]

#     db_schema = {}

#     for table in tables:
#         columns = inspector.get_columns(table)
#         pk = inspector.get_pk_constraint(table).get("constrained_columns", [])

#         db_schema[table] = [
#             {
#                 "column": col["name"],
#                 "type": str(col["type"]),
#                 "nullable": col["nullable"],
#                 "default": col["default"],
#                 "primary_key": col["name"] in pk
#             }
#             for col in columns
#         ]

#     return {
#         "database": engine.url.database,
#         "table_count": len(tables),
#         "schema": db_schema
#     }

@model_router.get(
    "/model_config/db/schema",
    summary="Get schema and sample data for selected tables"
)
def get_database_schema():
    inspector = inspect(engine)

    tables = [
        TableNames.ALSALAM_TRANS,
        TableNames.CUSTOMER_TABLE
    ]

    db_schema = {}
    db_samples = {}

    with engine.connect() as conn:
        for table in tables:
            # -------- Schema --------
            columns = inspector.get_columns(table)
            pk = inspector.get_pk_constraint(table).get("constrained_columns", [])

            db_schema[table] = [
                {
                    "column": col["name"],
                    "type": str(col["type"]),
                    "nullable": col["nullable"],
                    "default": col["default"],
                    "primary_key": col["name"] in pk
                }
                for col in columns
            ]

            # -------- Sample Data (2 rows) --------
            result: Result = conn.execute(
                text(f'SELECT * FROM "{table}" LIMIT 2')
            )

            rows = result.mappings().all()

            # Convert datetime/date to string for JSON
            db_samples[table] = [
                {
                    k: (
                        v.isoformat()
                        if isinstance(v, (datetime, date))
                        else v
                    )
                    for k, v in row.items()
                }
                for row in rows
            ]

    return {
        "database": engine.url.database,
        "table_count": len(tables),
        "schema": db_schema,
        "sample_data": db_samples
    }