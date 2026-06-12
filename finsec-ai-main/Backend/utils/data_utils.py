import numpy as np
import pandas as pd
from typing import Dict, Any, List, Union, Optional, Tuple
from datetime import datetime
# import logging
import json
from utils.log_utils import session_logger as logger

# logger = logging.getLogger(__name__)

def preprocess_dataframe(df: pd.DataFrame, target_col: Optional[str] = None) -> Tuple[pd.DataFrame, Optional[np.ndarray]]:
    # Preprocess DataFrame by converting to numeric types
    if target_col and target_col in df.columns:
        y = df[target_col].values
        X = df.drop(columns=[target_col])
    else:
        y = None
        X = df
    
    X_num = X.select_dtypes(include=[np.number]).copy()
    for c in X.columns.difference(X_num.columns):
        X_num[c] = pd.factorize(X[c])[0].astype(np.float32)
    
    X = X_num.astype(np.float32)
    return X, y

def align_dataframe_to_inputs(X: pd.DataFrame, input_names: List[str]) -> pd.DataFrame:
    # Align DataFrame columns to match ONNX input names
    if len(input_names) == 1:
        return X.copy()
    
    missing = [n for n in input_names if n not in X.columns]
    for m in missing:
        X[m] = 0.0
    
    return X[input_names].copy()

def is_classification_task(y: np.ndarray) -> bool:
    # Determine if task is classification based on target values
    if y.dtype.kind in "OUS":
        return True
    uniq = np.unique(y[~pd.isna(y)])
    return len(uniq) <= max(50, int(0.05 * len(y)))

def round_input_data(input_data: Union[Dict, pd.DataFrame, np.ndarray], decimal_places: int = 5) -> Union[Dict, pd.DataFrame, np.ndarray]:
    # Round input data to specified decimal places
    if isinstance(input_data, dict):
        return {k: round(v, decimal_places) if isinstance(v, (int, float)) else v for k, v in input_data.items()}
    elif isinstance(input_data, pd.DataFrame):
        return input_data.round(decimal_places)
    elif isinstance(input_data, np.ndarray):
        return np.round(input_data, decimal_places)
    return input_data

def extract_records(obj: Any) -> List[Dict]:
    # Extract records from various object formats
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        keys = {"TIMESTAMP", "AMOUNT", "MATCH_C_MODE", "MATCH_TRAN_ABOVE50K"}
        if keys & set(obj.keys()):
            return [obj]
        vals = [v for v in obj.values() if isinstance(v, dict)]
        if vals:
            return vals
        if "data" in obj and isinstance(obj["data"], (list, dict)):
            return extract_records(obj["data"])
    return []

def parse_weekday(ts: str) -> float:
    # Parse timestamp and return 1.0 for weekday, 0.0 for weekend
    for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
        try:
            return 1.0 if datetime.strptime(ts, fmt).weekday() < 5 else 0.0
        except:
            pass
    return 0.0

# def process_row(d: Dict[str, Any]) -> Dict[str, float]:
#     # Process single transaction row into features
#     # return {
#     #     "tran_foreign": float(d.get("MATCH_IS_FOREIGN", 0)),
#     #     "Device_Change": float(d.get("MATCH_DEVICE_CHANGE", 0)),
#     #     "IP_Change": float(d.get("MATCH_IP_CHANGE", 0)),
#     #     "ExactMatch": float(d.get("MATCH_EXACTMATCH", 0)),
#     #     "CaseInsensitiveMatch": float(d.get("MATCH_CASEINSENSITIVEMATCH", 0)),
#     #     "FirstNameMatch": float(d.get("MATCH_FIRSTNAMEMATCH", 0)),
#     #     "LastNameMatch": float(d.get("MATCH_LASTNAMEMATCH", 0)),
#     #     "MatchFactor": float(d.get("MATCH_MATCH_FACTOR", 0)),
#     #     "Matched_Flag": float(d.get("MATCH_MATCHED_FLAG", 0)),
#     #     "Is_Married": float(d.get("MATCH_IS_MARRIED", 0)),
#     #     "Vulnerability": float(d.get("MATCH_VULNERABILITY", 0)),
#     #     "uni_acc_to_10min": float(d.get("MATCH_UNI_ACC_TO_10MIN", 0)),
#     #     "uni_acc_to_1D": float(d.get("MATCH_UNI_ACC_TO_1D", 0)),
#     #     "tran_ratio_count_10min_1D": float(d.get("MATCH_TRAN_RATIO_COUNT_10MIN_1D", 0)),
#     #     "tran_ratio_count_1D_30D": float(d.get("MATCH_TRAN_RATIO_COUNT_1D_30D", 0)),
#     #     "tran_ratio_count_1D_90D": float(d.get("MATCH_TRAN_RATIO_COUNT_1D_90D", 0)),
#     #     "tran_ratio_count_1D_180D": float(d.get("MATCH_TRAN_RATIO_AMOUNT_1D_180D", 0)),
#     #     "tran_ratio_amount_10min_1D": float(d.get("MATCH_TRAN_RATIO_AMOUNT_10MIN_1D", 0)),
#     #     "tran_ratio_amount_1D_30D": float(d.get("MATCH_TRAN_RATIO_AMOUNT_1D_30D", 0)),
#     #     "tran_ratio_amount_1D_90D": float(d.get("MATCH_TRAN_RATIO_AMOUNT_1D_90D", 0)),
#     #     "tran_ratio_amount_1D_180D": float(d.get("MATCH_TRAN_RATIO_AMOUNT_1D_180D", 0)),
#     #     "isoddhr": float(d.get("MATCH_ISODDHR", 0))
#     # }
#     return {
#         'MatchFactor': float(d.get("MATCH_MATCH_FACTOR", 0)),
#         'tran_oddhr_amount_1D_90D':float(d.get("MATCH_TRAN_ODDHR_AMOUNT_1D_90D", 0)),
#         'tran_ratio_amount_1D_30D':float(d.get("MATCH_TRAN_RATIO_AMOUNT_1D_30D", 0)),
#         'tran_ratio_count_10min_1D':float(d.get("MATCH_TRAN_RATIO_COUNT_10MIN_1D", 0)),
#         'IP_Change':float(d.get("MATCH_IP_CHANGE", 0)),
#         'Tran_avarage_amount_ratio':float(d.get("MATCH_TRAN_AVARAGE_AMOUNT_RATIO", 0)),
#         'tran_ratio_count_1D_90D':float(d.get("MATCH_TRAN_RATIO_COUNT_1D_90D", 0)),
#         'tran_ratio_amount_1D_180D':float(d.get("MATCH_TRAN_RATIO_AMOUNT_1D_180D", 0)),
#         'tran_oddhr_amount_10min_1D':float(d.get("MATCH_TRAN_ODDHR_AMOUNT_10MIN_1D", 0)),
#         'Vulnerability':float(d.get("MATCH_VULNERABILITY", 0)),
#         'tran_foreign_amount_1D_90D':float(d.get("MATCH_TRAN_FOREIGN_AMOUNT_1D_90D", 0)),
#         'uni_acc_to_10min':float(d.get("MATCH_UNI_ACC_TO_10MIN", 0)),
#         'uni_acc_to_1D':float(d.get("MATCH_UNI_ACC_TO_1D", 0)),
#         'tran_oddhr_amount_1D_30D':float(d.get("MATCH_TRAN_ODDHR_AMOUNT_30D", 0)),
#         'tran_foreign_amount_1D_30D':float(d.get("MATCH_TRAN_FOREIGN_AMOUNT_1D_30D", 0)),
#         'tran_ratio_count_1D_30D':float(d.get("MATCH_TRAN_RATIO_COUNT_1D_30D", 0)),
#         'tran_oddhr_amount_1D_180D':float(d.get("MATCH_TRAN_ODDHR_AMOUNT_1D_180D", 0)),
#         'tran_ratio_amount_1D_90D':float(d.get("MATCH_TRAN_RATIO_AMOUNT_1D_90D", 0)),
#         'Device_Change':float(d.get("MATCH_DEVICE_CHANGE", 0)),
#         'isoddhr':float(d.get("MATCH_ISODDHR", 0)),
#         'tran_ratio_amount_10min_1D':float(d.get("MATCH_TRAN_RATIO_AMOUNT_10MIN_1D", 0)),
#         'tran_foreign_amount_1D_180D':float(d.get("MATCH_TRAN_FOREIGN_AMOUNT_1D_180D", 0)),
#         'tran_ratio_count_1D_180D':float(d.get("MATCH_TRAN_RATIO_COUNT_1D_180D", 0)),
#         'tran_foreign':float(d.get("MATCH_IS_FOREIGN", 0)),
#         'tran_foreign_amount_10min_1D':float(d.get("MATCH_TRAN_FOREIGN_AMOUNT_10MIN_1D", 0))
#         }

# def featurize(d: Dict[str, Any]) -> Dict[str, float]:
#     # Featurize transaction data for model training
#     amt = d.get("MATCH_DEBITAMOUNT")
#     s = str(amt) if amt is not None else ""
#     return {
#         "tran_above50k": float(d.get("MATCH_TRAN_ABOVE300", 0)),
#         "tran_count_10min": float(d.get("MATCH_TRAN_COUNT_10MIN", 0)),
#         "tran_count_1D": float(d.get("MATCH_TRAN_COUNT_1D", 0)),
#         "tran_amount_10min": float(d.get("MATCH_TRAN_AMOUNT_10MIN", 0)),
#         "tran_amount_1D": float(d.get("MATCH_TRAN_AMOUNT_1D", 0)),
#         "isoddhr": float(d.get("MATCH_ISODDHR", 0)),
#         "Weekday": parse_weekday(d.get("TIMESTAMP", "")),
#         "count_of_9_in_amount": float(s.count("9")) if s else 0.0,
#         "Location_Change": float(d.get("MATCH_IP_CHANGE", 0)),
#         "C_MODE_ATM": 1.0,
#         "C_MODE_POS": 0.0,
#         "C_MODE_ECOM": 0.0,
#         "IS_FRAUD": float(d.get("IS_FRAUD", 0))
#     }

def convert_numpy_types(obj):
    """Convert numpy types to native Python types"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    return obj


def map_input_data(original_data: Dict[str, Any], feature_mappings: Dict[str, str]) -> Dict[str, float]:
    if isinstance(feature_mappings, str):
        try:
            feature_mappings = json.loads(feature_mappings)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse feature_mappings JSON string: {str(e)}")
    
    # Validate feature_mappings is now a dict
    if not isinstance(feature_mappings, dict):
        raise ValueError(f"feature_mappings must be a dict or JSON string, got {type(feature_mappings)}")
    
    mapped_data = {}
    
    for model_input_name, original_key in feature_mappings.items():
        if original_key not in original_data:
            raise ValueError(f"Required key '{original_key}' not found in original data")
        
        original_value = original_data[original_key]
        
        try:
            if isinstance(original_value, (int, float)):
                mapped_data[model_input_name] = float(original_value)
            elif isinstance(original_value, str):
                mapped_data[model_input_name] = float(original_value)
            elif isinstance(original_value, bool):
                mapped_data[model_input_name] = float(original_value)
            elif original_value is None:
                mapped_data[model_input_name] = 0.0
            else:
                raise ValueError(f"Cannot convert value of type {type(original_value)} to float")
                
        except (ValueError, TypeError) as e:
            raise ValueError(
                f"Failed to convert '{original_key}' with value '{original_value}' "
                f"(type: {type(original_value)}) to float for model input '{model_input_name}': {str(e)}"
            )
    
    return mapped_data