from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from typing import Dict, Any
from utils.data_utils import convert_numpy_types, map_input_data
from utils.prediction_utils import predict_unsupervised, predict_supervised
# from config import ONNX_UNSUP_PATH
from database import get_db
from sqlalchemy.orm import Session
from model import ModelConfiguration, ModelType
import logging
from utils.log_utils import session_logger as logger

# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# @dashboard_router.post("/dash_data")
# async def dash_data(data: Dict[str, Any] = Body(...)):
#     # Process transaction data and return fraud analysis
#     single_row = process_row(data)
#     result = predict_unsupervised(onnx_path=ONNX_UNSUP_PATH, input_data=single_row, num_background=200, shap_samples=500)
#     total_importance = sum(result['feature_importance'].values())
#     output_json = {
#         "transaction_analysis": {
#             "status": result['prediction_label'],
#             "prediction_score": result['prediction'],
#             "fraud_probability_score": result['fraud_probability'],
#             "normal_probability_score": result['probability'][0] if len(result['probability']) > 1 else 1 - result['fraud_probability'],
#             "confidence": result['confidence'],
#             "prediction_class": result['prediction'],
#             "raw_probabilities": result['probability'],
#             "raw_score": result.get('raw_score')
#         },
#         "top_risk_factors": [
#             {
#                 "rank": i,
#                 "feature": feat['feature'],
#                 "value": round(feat['feature_value'], 2),
#                 "shap_score": round(feat['shap_value'], 4),
#                 "impact": feat['impact'],
#                 "contribution_percentage": round(feat['contribution_pct'], 1)
#             }
#             for i, feat in enumerate(result['top_features'], 1)
#         ],
#         "all_feature_impacts": {
#             feat_name: {
#                 "shap_value": round(shap_val, 4),
#                 "importance": round(result['feature_importance'][feat_name], 4),
#                 "impact_percentage": round((result['feature_importance'][feat_name] / total_importance * 100) if total_importance > 0 else 0, 2)
#             }
#             for feat_name, shap_val in result['shap_values'].items()
#         },
#         "probabilities": {
#             "normal": result['probability'][0] if len(result['probability']) > 1 else 1 - result['fraud_probability'],
#             "fraud": result['probability'][1] if len(result['probability']) > 1 else result['fraud_probability']
#         },
#         "input_names": result['input_names'],
#         "total_feature_importance": round(total_importance, 4)
#     }
#     return JSONResponse(content=convert_numpy_types(output_json))

# @dashboard_router.post("/dash_data_v2")
# async def dash_data_v2(data: Dict[str, Any] = Body(...),
#                        db: Session = Depends(get_db)
#                        ):
#     category = data['CATEGORYFULLTITLE']
#     # Process transaction data and return fraud analysis
#     model_config = db.query(ModelConfiguration).filter(
#         ModelConfiguration.alert_category == category,
#         ModelConfiguration.model_type == 'UNSUPERVISED'
#     ).first()
#     # single_row = process_row(data)
#     result = predict_unsupervised(onnx_path=model_config.model_path,
#                                   input_data=map_input_data(original_data=data, feature_mappings=model_config.feature_mappings),
#                                   num_background=200, shap_samples=500)
#     total_importance = sum(result['feature_importance'].values())
#     output_json = {
#         "transaction_analysis": {
#             "status": result['prediction_label'],
#             "prediction_score": result['prediction'],
#             "fraud_probability_score": result['fraud_probability'],
#             "normal_probability_score": result['probability'][0] if len(result['probability']) > 1 else 1 - result['fraud_probability'],
#             "confidence": result['confidence'],
#             "prediction_class": result['prediction'],
#             "raw_probabilities": result['probability'],
#             "raw_score": result.get('raw_score')
#         },
#         "top_risk_factors": [
#             {
#                 "rank": i,
#                 "feature": feat['feature'],
#                 "value": round(feat['feature_value'], 2),
#                 "shap_score": round(feat['shap_value'], 4),
#                 "impact": feat['impact'],
#                 "contribution_percentage": round(feat['contribution_pct'], 1)
#             }
#             for i, feat in enumerate(result['top_features'], 1)
#         ],
#         "all_feature_impacts": {
#             feat_name: {
#                 "shap_value": round(shap_val, 4),
#                 "importance": round(result['feature_importance'][feat_name], 4),
#                 "impact_percentage": round((result['feature_importance'][feat_name] / total_importance * 100) if total_importance > 0 else 0, 2)
#             }
#             for feat_name, shap_val in result['shap_values'].items()
#         },
#         "probabilities": {
#             "normal": result['probability'][0] if len(result['probability']) > 1 else 1 - result['fraud_probability'],
#             "fraud": result['probability'][1] if len(result['probability']) > 1 else result['fraud_probability']
#         },
#         "input_names": result['input_names'],
#         "total_feature_importance": round(total_importance, 4)
#     }
#     return JSONResponse(content=convert_numpy_types(output_json))


@dashboard_router.post("/dash_data_by_model")
async def dash_data_by_model(
    model_id: int = Body(..., embed=True),
    transaction_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    try:
        model_config = db.query(ModelConfiguration).filter(
            ModelConfiguration.id == model_id
        ).first()
        
        if not model_config:
            raise HTTPException(status_code=404, detail=f"Model with ID {model_id} not found")
        
        # if model_config.model_type != ModelType.UNSUPERVISED:
        #     raise HTTPException(
        #         status_code=400, 
        #         detail=f"Model type {model_config.model_type.value} is not supported for this endpoint. Only unsupervised models are supported."
        #     )
        
        mapped_input = map_input_data(
            original_data=transaction_data, 
            feature_mappings=model_config.feature_mappings
        )
        if model_config.model_type == ModelType.UNSUPERVISED:
            result = predict_unsupervised(
                onnx_path=model_config.model_path,
                input_data=mapped_input,
                num_background=200, 
                shap_samples=500
            )
        elif model_config.model_type == ModelType.SUPERVISED:
            result = predict_supervised(
                onnx_path=model_config.model_path,
                input_data=mapped_input,
                num_background=200,
                shap_samples=500
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Model type {model_config.model_type.value} is not supported for this endpoint. Only supervised and unsupervised models are supported."
            )
        total_importance = sum(result['feature_importance'].values())
        
        output_json = {
            "model_info": {
                "model_id": model_config.id,
                "model_name": model_config.model_name,
                "model_type": model_config.model_type.value,
                "alert_category": model_config.alert_category
            },
            "transaction_analysis": {
                "status": result['prediction_label'],
                "prediction_score": result['prediction'],
                "fraud_probability_score": result['fraud_probability'],
                "normal_probability_score": result['probability'][0] if len(result['probability']) > 1 else 1 - result['fraud_probability'],
                "confidence": result['confidence'],
                "prediction_class": result['prediction'],
                "raw_probabilities": result['probability'],
                "raw_score": result.get('raw_score')[0] if result.get('raw_score') != None else result['fraud_probability']
            },
            "top_risk_factors": [
                {
                    "rank": i,
                    "feature": feat['feature'],
                    "value": round(feat['feature_value'], 2),
                    "shap_score": round(feat['shap_value'], 4),
                    "impact": feat['impact'],
                    "contribution_percentage": round(feat['contribution_pct'], 1)
                }
                for i, feat in enumerate(result['top_features'], 1)
            ],
            "all_feature_impacts": {
                feat_name: {
                    "shap_value": round(shap_val, 4),
                    "importance": round(result['feature_importance'][feat_name], 4),
                    "impact_percentage": round((result['feature_importance'][feat_name] / total_importance * 100) if total_importance > 0 else 0, 2)
                }
                for feat_name, shap_val in result['shap_values'].items()
            },
            "probabilities": {
                "normal": result['probability'][0] if len(result['probability']) > 1 else 1 - result['fraud_probability'],
                "fraud": result['probability'][1] if len(result['probability']) > 1 else result['fraud_probability']
            },
            "input_names": result['input_names'],
            "total_feature_importance": round(total_importance, 4)
        }
        
        return JSONResponse(content=convert_numpy_types(output_json))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.log_error(f"Error in dash_data_by_model: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
