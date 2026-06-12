import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from sklearn.metrics import confusion_matrix, accuracy_score, precision_recall_fscore_support, roc_auc_score, r2_score, mean_absolute_error, mean_squared_error
# import logging
from utils.log_utils import session_logger as logger

# logger = logging.getLogger(__name__)

def compute_classification_metrics(y_true: np.ndarray, y_pred: np.ndarray, labels: List, probabilities: Optional[np.ndarray] = None) -> Dict[str, Any]:
    # Compute classification metrics
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    acc = accuracy_score(y_true, y_pred)
    pr_macro, rc_macro, f1_macro, _ = precision_recall_fscore_support(y_true, y_pred, average="macro", zero_division=0)
    pr_w, rc_w, f1_w, _ = precision_recall_fscore_support(y_true, y_pred, average="weighted", zero_division=0)
    pr_cls, rc_cls, f1_cls, _ = precision_recall_fscore_support(y_true, y_pred, average=None, labels=labels, zero_division=0)
    
    auc = None
    if probabilities is not None:
        try:
            if len(labels) == 2:
                if not isinstance(y_true[0], (int, np.integer, float, np.floating)):
                    y_bin = (pd.Series(y_true) == labels[1]).astype(int).values
                else:
                    y_bin = y_true.astype(int)
                pos = 1 if probabilities.shape[1] > 1 else 0
                auc = float(roc_auc_score(y_bin, probabilities[:, pos] if probabilities.ndim == 2 else probabilities.ravel()))
            else:
                y_int = pd.Series(y_true).astype("category").cat.codes.values
                auc = float(roc_auc_score(y_int, probabilities, multi_class="ovr"))
        except:
            auc = None
    
    return {
        "task": "classification",
        "n": len(y_true),
        "labels": list(map(lambda x: x if isinstance(x, (str, int, float, np.number)) else str(x), labels)),
        "confusion_matrix": cm.tolist(),
        "accuracy": float(acc),
        "precision_macro": float(pr_macro),
        "recall_macro": float(rc_macro),
        "f1_macro": float(f1_macro),
        "precision_weighted": float(pr_w),
        "recall_weighted": float(rc_w),
        "f1_weighted": float(f1_w),
        "per_class": {str(labels[i]): {"precision": float(pr_cls[i]), "recall": float(rc_cls[i]), "f1": float(f1_cls[i])} for i in range(len(labels))},
        "roc_auc": auc
    }

def compute_regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
    # Compute regression metrics
    mae = mean_absolute_error(y_true, y_pred)
    mse = mean_squared_error(y_true, y_pred)
    rmse = float(np.sqrt(mse))
    r2 = r2_score(y_true, y_pred)
    
    return {
        "task": "regression",
        "n": len(y_true),
        "mae": float(mae),
        "mse": float(mse),
        "rmse": float(rmse),
        "r2": float(r2)
    }

def append_csv(rows: List[Dict], path: str) -> None:
    # Append rows to CSV file
    import os
    import csv
    
    exists = os.path.exists(path)
    fieldnames = ["tran_above50k", "tran_count_10min", "tran_count_1D", "tran_amount_10min", "tran_amount_1D",
                  "isoddhr", "Weekday", "count_of_9_in_amount", "Location_Change", "C_MODE_ATM", "C_MODE_POS",
                  "C_MODE_ECOM", "IS_FRAUD"]
    
    with open(path, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        if not exists:
            w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, 0.0) for k in fieldnames})
