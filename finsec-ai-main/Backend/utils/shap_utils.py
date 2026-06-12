import numpy as np
import pandas as pd
import onnxruntime as ort
import shap
from typing import List, Optional, Callable, Dict, Tuple, Any
# import logging
from utils.log_utils import session_logger as logger

# logger = logging.getLogger(__name__)

def create_background_samples(X_explain: np.ndarray, input_names: List[str], num_samples: int = 100, use_real_data: Optional[pd.DataFrame] = None) -> np.ndarray:
    # Create representative background samples for SHAP
    np.random.seed(42)
    
    if use_real_data is not None and len(use_real_data) > 0:
        if len(use_real_data) > num_samples:
            sampled_indices = np.random.choice(len(use_real_data), num_samples, replace=False)
            background = use_real_data.iloc[sampled_indices].values.astype(np.float32)
        else:
            background = use_real_data.values.astype(np.float32)
        return background
    
    background_samples = []
    for i in range(num_samples):
        sample = []
        for j, input_name in enumerate(input_names):
            current_value = X_explain[0, j] if j < X_explain.shape[1] else 0
            
            if any(indicator in input_name.lower() for indicator in ['is_', 'has_', 'mode', 'weekday', 'foreign', 'change', 'vulnerability', 'above']):
                sample.append(np.random.choice([0, 1], p=[0.5, 0.5]))
            elif 'count' in input_name.lower():
                if '_10min' in input_name.lower():
                    sample.append(np.random.poisson(2))
                elif '_1D' in input_name.lower():
                    sample.append(np.random.poisson(5))
                else:
                    sample.append(np.random.poisson(10))
            elif 'amount' in input_name.lower():
                if '_10min' in input_name.lower():
                    sample.append(np.abs(np.random.lognormal(5, 2)))
                elif '_1D' in input_name.lower():
                    sample.append(np.abs(np.random.lognormal(6, 2)))
                else:
                    sample.append(np.abs(np.random.lognormal(7, 2)))
            elif 'oddhr' in input_name.lower():
                sample.append(np.random.choice([0, 1], p=[0.7, 0.3]))
            else:
                if current_value != 0:
                    std_dev = abs(current_value) * 0.5
                    sample.append(np.random.normal(current_value, std_dev))
                else:
                    sample.append(np.random.normal(0, 1))
            
            background_samples.append(sample)
    
    background = np.array(background_samples, dtype=np.float32)
    
    for i, input_name in enumerate(input_names):
        if any(keyword in input_name.lower() for keyword in ['count', 'amount']):
            background[:, i] = np.abs(background[:, i])
    
    return background

def create_model_wrapper(session: ort.InferenceSession, input_names: List[str], is_supervised: bool = True) -> Callable:
    # Create model wrapper function for SHAP
    def model_fn(X):
        if len(X.shape) == 1:
            X = X.reshape(1, -1)
        
        batch_size = X.shape[0]
        batch_feed = {}
        
        for i, input_name in enumerate(input_names):
            if i < X.shape[1]:
                batch_feed[input_name] = X[:, i:i+1].astype(np.float32)
            else:
                batch_feed[input_name] = np.zeros((batch_size, 1), dtype=np.float32)
        
        try:
            outputs = session.run(None, batch_feed)
            
            if is_supervised:
                for output in outputs:
                    if output.ndim == 2 and output.shape[1] > 1:
                        return output[:, 1].ravel()
                
                if len(outputs) > 1:
                    return outputs[1][:, 1].ravel() if outputs[1].shape[1] > 1 else outputs[1].ravel()
                
                return outputs[0].ravel()
            else:
                if len(outputs) == 2:
                    scores = outputs[1].ravel()
                else:
                    scores = outputs[0].ravel()
                
                if np.any(scores < 0):
                    scores = (scores + 1) / 2
                elif np.any(scores > 1):
                    scores = 1 / (1 + np.exp(-scores))
                
                return scores
        except Exception as e:
            logger.log_error(f"Error in model wrapper: {str(e)}")
            return np.zeros(batch_size)
    
    return model_fn

def calculate_shap_values(session: ort.InferenceSession, X_explain: np.ndarray, input_names: List[str], background_samples: np.ndarray, is_supervised: bool = True, nsamples: int = 100) -> np.ndarray:
    # Calculate SHAP values using KernelExplainer
    model_fn = create_model_wrapper(session, input_names, is_supervised)
    
    try:
        explainer = shap.KernelExplainer(model_fn, background_samples, link='identity')
        shap_values = explainer.shap_values(X_explain, nsamples=nsamples, l1_reg='num_features(10)')
        
        if isinstance(shap_values, list):
            shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        
        if shap_values.ndim > 1:
            shap_values = shap_values[0]
        
        return np.array(shap_values).ravel()[:len(input_names)]
    except Exception as e:
        logger.log_error(f"Error calculating SHAP values: {str(e)}")
        return X_explain[0][:len(input_names)] - np.mean(background_samples, axis=0)[:len(input_names)]

def compute_feature_importance(shap_values: np.ndarray, input_names: List[str]) -> Tuple[Dict[str, float], Dict[str, float]]:
    # Compute feature importance from SHAP values
    feature_importance = {}
    shap_dict = {}
    
    for i, input_name in enumerate(input_names):
        if i < len(shap_values):
            shap_val = float(shap_values[i])
            shap_dict[input_name] = shap_val
            feature_importance[input_name] = abs(shap_val)
        else:
            shap_dict[input_name] = 0.0
            feature_importance[input_name] = 0.0
    
    return feature_importance, shap_dict

def build_top_features(feature_importance: Dict[str, float], shap_dict: Dict[str, float], input_names: List[str], X_explain: np.ndarray, is_supervised: bool = True, top_n: int = 5) -> List[Dict]:
    # Build top features list with impact descriptions
    sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
    top_features = []
    total_importance = sum(feature_importance.values())
    
    for feat_name, importance in sorted_features[:top_n]:
        idx = input_names.index(feat_name)
        shap_val = shap_dict[feat_name]
        
        if abs(shap_val) < 1e-10:
            impact = "neutral"
        elif shap_val > 0:
            impact = "increases fraud risk" if is_supervised else "increases anomaly score"
        else:
            impact = "decreases fraud risk" if is_supervised else "decreases anomaly score"
        
        feature_val = round(float(X_explain[0, idx]), 5) if idx < X_explain.shape[1] else 0.0
        
        top_features.append({
            'feature': feat_name,
            'importance': float(importance),
            'shap_value': shap_val,
            'impact': impact,
            'feature_value': feature_val,
            'contribution_pct': (importance / total_importance * 100) if total_importance > 0 else 0
        })
    
    return top_features


def compute_shap_summary(
    session: ort.InferenceSession,
    X_explain: np.ndarray,
    input_names: List[str],
    is_supervised: bool = True,
    real_data: Optional[pd.DataFrame] = None
) -> Dict[str, Any]:
    """
    Compute SHAP summary using existing SHAP utilities.
    """

    # 1. Build background
    background = create_background_samples(
        X_explain=X_explain,
        input_names=input_names,
        use_real_data=real_data
    )

    # 2. Calculate SHAP values
    shap_values = calculate_shap_values(
        session=session,
        X_explain=X_explain,
        input_names=input_names,
        background_samples=background,
        is_supervised=is_supervised
    )

    # 3. Feature importance
    feature_importance, shap_dict = compute_feature_importance(
        shap_values=shap_values,
        input_names=input_names
    )

    # 4. Top features
    top_features = build_top_features(
        feature_importance=feature_importance,
        shap_dict=shap_dict,
        input_names=input_names,
        X_explain=X_explain,
        is_supervised=is_supervised
    )

    return {
        "shap_values": shap_dict,
        "feature_importance": feature_importance,
        "top_features": top_features,
        "total_feature_importance": sum(feature_importance.values())
    }
