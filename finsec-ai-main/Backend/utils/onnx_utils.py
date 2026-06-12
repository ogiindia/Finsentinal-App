import numpy as np
import pandas as pd
import onnxruntime as ort
from typing import Dict, List, Tuple, Any, Optional
# import logging
from utils.log_utils import session_logger as logger

# logger = logging.getLogger(__name__)

def create_onnx_session(onnx_path: str, log_level: int = 3) -> ort.InferenceSession:
    # Create ONNX inference session with standard options
    sess_options = ort.SessionOptions()
    sess_options.log_severity_level = log_level
    return ort.InferenceSession(onnx_path, sess_options, providers=['CPUExecutionProvider'])

def get_session_io_names(session: ort.InferenceSession) -> Tuple[List[str], List[str]]:
    # Get input and output names from ONNX session
    input_names = [inp.name for inp in session.get_inputs()]
    output_names = [out.name for out in session.get_outputs()]
    return input_names, output_names

def build_input_feed_dict(X: pd.DataFrame, input_names: List[str]) -> Dict[str, np.ndarray]:
    # Build ONNX input feed dictionary from DataFrame
    feed = {}
    if len(input_names) == 1:
        feed[input_names[0]] = X.to_numpy(np.float32)
    else:
        for name in input_names:
            if name in X.columns:
                feed[name] = X[[name]].to_numpy(np.float32)
            else:
                feed[name] = np.zeros((len(X), 1), dtype=np.float32)
    return feed

def build_input_feed_from_dict(input_data: Dict[str, Any], input_names: List[str]) -> Tuple[Dict[str, np.ndarray], np.ndarray]:
    # Build ONNX input feed from dictionary
    X_explain = np.array([[input_data.get(name, 0) for name in input_names]], dtype=np.float32)
    input_feed = {name: np.array([[input_data.get(name, 0)]], dtype=np.float32) for name in input_names}
    return input_feed, X_explain

def build_input_feed_from_array(X: np.ndarray, input_names: List[str]) -> Tuple[Dict[str, np.ndarray], np.ndarray]:
    # Build ONNX input feed from numpy array
    X_explain = np.array(X, dtype=np.float32).reshape(1, -1)
    if X_explain.shape[1] < len(input_names):
        padding = np.zeros((1, len(input_names) - X_explain.shape[1]))
        X_explain = np.hstack([X_explain, padding])
    input_feed = {input_names[i]: X_explain[:, i:i+1] for i in range(len(input_names))}
    return input_feed, X_explain

def parse_supervised_outputs(outputs: List[np.ndarray], output_names: List[str]) -> Tuple[Optional[np.ndarray], Optional[int]]:
    # Parse supervised model outputs to extract probabilities and prediction class
    probabilities = None
    prediction_class = None
    
    for i, output in enumerate(outputs):
        output_name = output_names[i] if i < len(output_names) else f"output_{i}"
        if 'prob' in output_name.lower() or (output.ndim == 2 and output.shape[1] > 1):
            probabilities = output[0] if output.ndim > 1 else output
        elif 'label' in output_name.lower():
            prediction_class = int(output.ravel()[0])
    
    if probabilities is None and len(outputs) > 1:
        prediction_class = int(outputs[0].ravel()[0])
        probabilities = outputs[1][0] if outputs[1].ndim > 1 else outputs[1]
    
    return probabilities, prediction_class

def parse_unsupervised_outputs(outputs: List[np.ndarray], output_names: List[str]) -> Tuple[Optional[np.ndarray], Optional[np.ndarray], Optional[np.ndarray]]:
    # Parse unsupervised model outputs to extract labels, scores, and probabilities
    label = None
    score = None
    proba = None
    
    for i, out in enumerate(outputs):
        name = output_names[i] if i < len(output_names) else f"out_{i}"
        if proba is None and out.ndim == 2 and out.shape[1] > 1:
            proba = out
        if label is None and ("label" in name.lower() or str(out.dtype) in ("int32", "int64")):
            label = out.ravel()
        if score is None and ("score" in name.lower() or str(out.dtype) in ("float32", "float64")):
            score = out.ravel()
    
    return label, score, proba

def normalize_scores_to_probability(score_vec: np.ndarray) -> np.ndarray:
    # Normalize arbitrary anomaly scores to [0,1] range
    s = score_vec.astype(np.float64)
    if np.any(s < 0) and np.any(s > 1):
        s = 1.0 / (1.0 + np.exp(-s))  # sigmoid
    elif np.any(s < 0):
        s = (s + 1.0) / 2.0  # [-1,1] -> [0,1]
    return np.clip(s, 0.0, 1.0)

def infer_output_type(outputs: List[np.ndarray], output_names: List[str], out_map: Dict[str, np.ndarray]) -> Tuple[str, Any]:
    # Infer the type of model output (proba, label, or auto)
    for k in out_map:
        a = out_map[k]
        if a.ndim == 2 and a.shape[1] > 1:
            return ("proba", a)
    
    for k in out_map:
        if "prob" in k.lower() or "logit" in k.lower():
            a = out_map[k]
            if a.ndim == 2:
                return ("proba", a)
    
    for k in out_map:
        if "label" in k.lower():
            v = out_map[k].ravel()
            try:
                v = v.astype(float)
            except:
                pass
            return ("label", v)
    
    a0 = outputs[0]
    return ("auto", a0)

def run_onnx_inference(
    onnx_path: str,
    X: np.ndarray,
    is_supervised: bool = True
) -> Dict[str, Any]:
    """
    Unified ONNX inference wrapper.
    Works for both supervised and unsupervised models.
    """

    # 1. Create session
    session = create_onnx_session(onnx_path)

    # 2. Resolve IO names
    input_names, output_names = get_session_io_names(session)

    # 3. Build input feed
    input_feed, X_explain = build_input_feed_from_array(X, input_names)

    # 4. Run inference
    outputs = session.run(None, input_feed)

    # 5. Parse outputs
    if is_supervised:
        probabilities, prediction_class = parse_supervised_outputs(outputs, output_names)

        return {
            "prediction_class": prediction_class,
            "probabilities": probabilities,
            "fraud_probability": float(probabilities[1]) if probabilities is not None and len(probabilities) > 1 else None,
            "raw_outputs": outputs,
            "input_names": input_names,
            "X_explain": X_explain
        }

    else:
        label, score, proba = parse_unsupervised_outputs(outputs, output_names)

        if score is not None:
            score = normalize_scores_to_probability(score)

        return {
            "label": label,
            "score": score,
            "probabilities": proba,
            "raw_outputs": outputs,
            "input_names": input_names,
            "X_explain": X_explain
        }
