import numpy as np
import pandas as pd
from typing import Dict, Any, Union, List, Optional
import logging
from utils.onnx_utils import *
from utils.shap_utils import *
from utils.data_utils import *
from utils.metrics_utils import *
from utils.log_utils import session_logger as logger
from pyspark.sql import SparkSession, DataFrame as SparkDataFrame
from spark.spark_config import get_spark_session
from config import SPARK_APP_NAME, SPARK_MASTER, SPARK_DRIVER_MEMORY, SPARK_EXECUTOR_MEMORY, SPARK_SQL_SHUFFLE_PARTITIONS

# logger = logging.getLogger(__name__)

def predict_supervised(
    onnx_path: str,
    input_data: Union[Dict, pd.DataFrame, np.ndarray, "SparkDataFrame"],
    feature_names: List[str] = None,
    background_data: pd.DataFrame = None,
    num_background: int = 100,
    shap_samples: int = 100
) -> Dict[str, Any]:

    # Supervised model prediction with SHAP explanation
    session = create_onnx_session(onnx_path)
    input_names, output_names = get_session_io_names(session)
    
    if isinstance(input_data, dict):
        input_feed, X_explain = build_input_feed_from_dict(input_data, input_names)

    # NEW: Spark DataFrame → pandas → existing logic
    elif SparkDataFrame is not None and isinstance(input_data, SparkDataFrame):
        pdf = input_data.toPandas()
        X_explain = (
            pdf[input_names].values.astype(np.float32)
            if all(name in pdf.columns for name in input_names)
            else np.zeros((1, len(input_names)), dtype=np.float32)
        )
        input_feed = {
            name: pdf[[name]].values.astype(np.float32)
            if name in pdf.columns
            else np.zeros((1, 1), dtype=np.float32)
            for name in input_names
        }

    elif isinstance(input_data, pd.DataFrame):
        X_explain = (
            input_data[input_names].values.astype(np.float32)
            if all(name in input_data.columns for name in input_names)
            else np.zeros((1, len(input_names)), dtype=np.float32)
        )
        input_feed = {
            name: input_data[[name]].values.astype(np.float32)
            if name in input_data.columns
            else np.zeros((1, 1), dtype=np.float32)
            for name in input_names
        }

    else:
        input_feed, X_explain = build_input_feed_from_array(input_data, input_names)

    
    outputs = session.run(None, input_feed)
    probabilities, prediction_class = parse_supervised_outputs(outputs, output_names)
    
    if probabilities is None:
        probabilities = np.array([0.5, 0.5])
    
    probabilities = np.array(probabilities, dtype=np.float64)
    fraud_prob = float(probabilities[1]) if len(probabilities) > 1 else 0.5
    normal_prob = float(probabilities[0]) if len(probabilities) > 0 else (1 - fraud_prob)
    prediction = 1 if fraud_prob > 0.5 else 0
    confidence = float(np.max(probabilities))
    
    background_samples = create_background_samples(X_explain, input_names, num_background, background_data)
    shap_values = calculate_shap_values(session, X_explain, input_names, background_samples, is_supervised=True, nsamples=shap_samples)
    feature_importance, shap_dict = compute_feature_importance(shap_values, input_names)
    top_features = build_top_features(feature_importance, shap_dict, input_names, X_explain, is_supervised=True)
    
    return {
        'prediction': prediction,
        'prediction_label': 'Fraud' if prediction == 1 else 'Normal',
        'probability': [normal_prob, fraud_prob],
        'confidence': confidence,
        'fraud_probability': fraud_prob,
        'shap_values': shap_dict,
        'feature_importance': feature_importance,
        'top_features': top_features,
        'input_names': input_names,
        'background_samples_used': len(background_samples),
        'shap_calculation_method': 'KernelExplainer'
    }

def predict_unsupervised(onnx_path: str, input_data: Union[Dict, pd.DataFrame, np.ndarray], feature_names: List[str] = None, background_data: pd.DataFrame = None, num_background: int = 100, shap_samples: int = 100) -> Dict[str, Any]:
    # Unsupervised model prediction with SHAP explanation
    session = create_onnx_session(onnx_path)
    input_names, output_names = get_session_io_names(session)
    
    input_data = round_input_data(input_data, decimal_places=5)
    
    if isinstance(input_data, dict):
        input_feed, X_explain = build_input_feed_from_dict(input_data, input_names)
    elif isinstance(input_data, pd.DataFrame):
        if all(name in input_data.columns for name in input_names):
            X_explain = np.round(input_data[input_names].values, 5).astype(np.float32)
        else:
            X_explain = np.zeros((1, len(input_names)), dtype=np.float32)
        input_feed = {name: np.round(input_data[[name]].values, 5).astype(np.float32) if name in input_data.columns else np.zeros((1, 1), dtype=np.float32) for name in input_names}
    else:
        input_feed, X_explain = build_input_feed_from_array(input_data, input_names)
        X_explain = np.round(X_explain, 5)
        input_feed = {k: np.round(v, 5) for k, v in input_feed.items()}
    
    outputs = session.run(None, input_feed)
    label, anomaly_score, proba = parse_unsupervised_outputs(outputs, output_names)
    
    if label == -1:
        prediction = -1
    elif label == 1:
        prediction = 1
    else:
        if anomaly_score is not None:
            normalized_score = (anomaly_score + 1) / 2 if -1 <= anomaly_score <= 1 else anomaly_score
            prediction = 0 if normalized_score > 0.5 else 1
        else:
            prediction = 0
    
    if anomaly_score is not None:
        if -1 <= anomaly_score <= 1:
            normalized_score = (anomaly_score + 1) / 2
        else:
            normalized_score = 1 / (1 + np.exp(-anomaly_score))
        normal_prob = normalized_score
        fraud_prob = 1 - normalized_score
    else:
        fraud_prob = 1.0 if prediction == 1 else 0.0
        normal_prob = 1.0 - fraud_prob
    
    confidence = max(fraud_prob, normal_prob)
    
    background_samples = create_background_samples(X_explain, input_names, num_background, background_data)
    shap_values = calculate_shap_values(session, X_explain, input_names, background_samples, is_supervised=False, nsamples=shap_samples)
    feature_importance, shap_dict = compute_feature_importance(shap_values, input_names)
    top_features = build_top_features(feature_importance, shap_dict, input_names, X_explain, is_supervised=False)
    
    result = {
        'prediction': prediction,
        'prediction_label': 'Fraud' if prediction == -1 else 'Normal',
        'probability': [normal_prob, fraud_prob],
        'confidence': normal_prob,
        'fraud_probability': fraud_prob,
        'shap_values': shap_dict,
        'feature_importance': feature_importance,
        'top_features': top_features,
        'input_names': input_names,
        'background_samples_used': len(background_samples),
        'shap_calculation_method': 'KernelExplainer'
    }
    
    if anomaly_score is not None:
        result['raw_score'] = anomaly_score
    
    return result

def evaluate_onnx(onnx_path: str, csv_path: str, target_col: str = None, feature_names: List[str] = None, threshold: float = 0.5) -> Dict[str, Any]:
    # 1) Get spark session (prefer get_spark_session if provided in utils.data_utils)
    spark = get_spark_session()

    # 2) Read CSV with Spark (schema inference and header)
    sdf = (
        spark.read
        .option("header", "true")
        .option("inferSchema", "true")
        .csv(csv_path)
    )

    logger.log_info(f"Loaded CSV into Spark DataFrame: rows={sdf.count()}, cols={len(sdf.columns)}")

    # 3) Infer target column if not provided (same behaviour as previous implementation: last column)
    if target_col is None:
        cols = sdf.columns
        if len(cols) == 0:
            raise ValueError("CSV has no columns")
        target_col = cols[-1]

    # 4) Determine feature columns
    if feature_names:
        feature_cols = feature_names
    else:
        feature_cols = [c for c in sdf.columns if c != target_col]

    # 5) Prepare ONNX session and I/O names
    session = create_onnx_session(onnx_path)
    input_names, output_names = get_session_io_names(session)

    # 6) We'll iterate the Spark DF in batches using toLocalIterator (row-wise), collect small lists of row dicts,
    #    create small Spark DataFrames from those lists and convert them to pandas via toPandas() for preprocessing + inference.
    batch_size = 2000
    rows_batch = []
    pred_raw_batches = []
    y_true_batches = []

    select_cols = feature_cols + [target_col]
    iterator = sdf.select(*select_cols).toLocalIterator()

    count_processed = 0
    for row in iterator:
        rows_batch.append(row.asDict())
        if len(rows_batch) >= batch_size:
            # create a small Spark DataFrame from collected rows and convert to pandas using toPandas()
            spark_batch = spark.createDataFrame(rows_batch)
            df_batch = spark_batch.toPandas()

            # reset collector immediately
            rows_batch = []

            if df_batch.empty:
                continue

            # Ensure column order exists (safeguard)
            for c in select_cols:
                if c not in df_batch.columns:
                    df_batch[c] = np.nan

            # Preprocess (expects pandas df and target_col)
            X_batch, y_batch = preprocess_dataframe(df_batch, target_col)

            if feature_names:
                X_batch = X_batch[feature_names]

            # Build input feed and run the session for this batch
            feed = build_input_feed_dict(X_batch, input_names)
            raw = session.run(None, feed)

            pred_raw_batches.append(raw)
            y_true_batches.append(np.asarray(y_batch))

            count_processed += len(df_batch)
            logger.log_info(f"Processed {count_processed} rows (batch)")

    # process remaining rows if any
    if rows_batch:
        spark_batch = spark.createDataFrame(rows_batch)
        df_batch = spark_batch.toPandas()
        rows_batch = []
        if not df_batch.empty:
            for c in select_cols:
                if c not in df_batch.columns:
                    df_batch[c] = np.nan

            X_batch, y_batch = preprocess_dataframe(df_batch, target_col)
            if feature_names:
                X_batch = X_batch[feature_names]

            feed = build_input_feed_dict(X_batch, input_names)
            raw = session.run(None, feed)
            pred_raw_batches.append(raw)
            y_true_batches.append(np.asarray(y_batch))
            count_processed += len(df_batch)
            logger.log_info(f"Processed final {len(df_batch)} rows (final batch)")

    # 7) If nothing processed (e.g., empty file), fallback to previous behaviour but using Spark -> toPandas()
    if len(pred_raw_batches) == 0:
        df_empty_spark = (
            spark.read
            .option("header", "true")
            .option("inferSchema", "true")
            .csv(csv_path)
            .limit(0)
        )
        df_empty = df_empty_spark.toPandas()
        if target_col is None and len(df_empty.columns) > 0:
            target_col = df_empty.columns[-1]
        X_empty, y_empty = preprocess_dataframe(df_empty, target_col)
        if feature_names:
            X_empty = X_empty[feature_names]
        feed = build_input_feed_dict(X_empty, input_names)
        raw = session.run(None, feed)
        out_map = {output_names[i]: raw[i] for i in range(len(output_names))}
        kind, pred_raw = infer_output_type(raw, output_names, out_map)

        if is_classification_task(y_empty):
            y_true = y_empty
            if kind == "proba":
                proba = pred_raw
                y_pred = np.argmax(proba, axis=1)
                labels = pd.Series(y_true).astype("category").cat.categories.tolist()
                probabilities = pred_raw if kind == "proba" else None
                return compute_classification_metrics(y_true, y_pred, labels, probabilities)
            else:
                a = pred_raw
                if a.ndim == 2 and a.shape[1] == 1:
                    p = a.ravel()
                    y_pred = (p >= threshold).astype(int) if len(np.unique(y_true)) == 2 else p
                else:
                    y_pred = a.ravel()
                labels = pd.Series(y_true).astype("category").cat.categories.tolist()
                probabilities = pred_raw if kind == "proba" else None
                return compute_classification_metrics(y_true, y_pred, labels, probabilities)
        else:
            y_true = y_empty.astype(float)
            pred = pred_raw
            if pred.ndim == 2 and pred.shape[1] > 1:
                pred = pred.mean(axis=1)
            y_pred = pred.ravel().astype(float)
            return compute_regression_metrics(y_true, y_pred)

    # 8) Concatenate raw outputs collected across batches (same as before)
    n_outputs = len(pred_raw_batches[0])
    stacked_outputs = []
    for out_idx in range(n_outputs):
        pieces = []
        for raw in pred_raw_batches:
            arr = np.asarray(raw[out_idx])
            pieces.append(arr)
        try:
            stacked = np.concatenate(pieces, axis=0)
        except ValueError:
            stacked = np.hstack([p.ravel() for p in pieces])
        stacked_outputs.append(stacked)

    out_map = {output_names[i]: stacked_outputs[i] for i in range(len(output_names))}
    kind, pred_raw_total = infer_output_type(stacked_outputs, output_names, out_map)

    # 9) Concatenate all y_true batches
    y_true_total = np.concatenate(y_true_batches, axis=0)

    # 10) Decide classification/regression and compute metrics (exact same logic as before)
    if is_classification_task(y_true_total):
        y_true = y_true_total

        if kind == "proba":
            proba = pred_raw_total
            y_pred = np.argmax(proba, axis=1)

            if np.array(y_true).dtype.kind in "OUS":
                classes = pd.Series(y_true).astype("category").cat.categories.tolist()
                if proba.shape[1] == len(classes):
                    y_pred = np.array([classes[i] for i in y_pred])
        else:
            a = pred_raw_total
            if a.ndim == 2 and a.shape[1] == 1:
                p = a.ravel()
                y_pred = (p >= threshold).astype(int) if len(np.unique(y_true)) == 2 else p
            else:
                y_pred = a.ravel()

            if np.array(y_true).dtype.kind in "OUS" and not (np.array(y_pred).dtype.kind in "OUS"):
                classes = pd.Series(y_true).astype("category").cat.categories.tolist()
                y_pred = np.array([classes[int(v)] if int(v) < len(classes) and int(v) >= 0 else classes[0] for v in y_pred])

        labels = pd.Series(y_true).astype("category").cat.categories.tolist()
        probabilities = pred_raw_total if kind == "proba" else None

        return compute_classification_metrics(y_true, y_pred, labels, probabilities)

    else:
        y_true = y_true_total.astype(float)
        pred = pred_raw_total
        if pred.ndim == 2 and pred.shape[1] > 1:
            pred = pred.mean(axis=1)
        y_pred = pred.ravel().astype(float)

        return compute_regression_metrics(y_true, y_pred)


def _evaluate_unsupervised_with_shap_from_pandas_df(
    onnx_path: str,
    df_all: pd.DataFrame,
    target_col: str | None = None,
    max_points: int | None = None,
    background_size: int = 100,
    shap_nsamples: int = 50
) -> Dict[str, Any]:
    """
    Internal helper that contains the *existing* logic of evaluate_unsupervised_with_shap,
    but works directly from a pandas DataFrame instead of reading CSV.
    """
    from sklearn.metrics import confusion_matrix  # local import to avoid cycles

    logger.log_info(f"Evaluating unsupervised model on pandas DF with {len(df_all)} rows")

    df = df_all.copy()

    # 2) Infer target column if not provided
    if target_col is None:
        for cand in ("IS_FRAUD", "is_fraud", "Label", "label", "target", "y"):
            if cand in df.columns:
                target_col = cand
                break

    # 3) Preprocess dataframe
    X, y_true = preprocess_dataframe(df, target_col)

    # 4) Load ONNX and prepare inputs
    session = create_onnx_session(onnx_path)
    input_names, output_names = get_session_io_names(session)

    X_align = align_dataframe_to_inputs(X, input_names)

    feed = build_input_feed_dict(X_align, input_names)
    outputs = session.run(None, feed)

    # 5) Parse unsupervised outputs -> anomaly score
    label, score, proba = parse_unsupervised_outputs(outputs, output_names)

    raw_score = None
    if score is not None:
        raw_score = score.copy()
        normal_prob = normalize_scores_to_probability(score)
        anomaly_score = 1.0 - normal_prob
    elif proba is not None:
        pos = 1 if proba.shape[1] > 1 else 0
        raw_score = proba[:, pos].copy()
        anomaly_score = proba[:, pos].astype(np.float64)
    elif label is not None:
        raw_score = label.astype(float).copy()
        anomaly_score = (label.astype(int) == -1).astype(np.float64)
    else:
        raw_score = np.zeros(len(X_align), dtype=np.float64)
        anomaly_score = np.zeros(len(X_align), dtype=np.float64)

    # 6) Threshold using quantiles
    q90, q95, q99 = np.quantile(anomaly_score, [0.90, 0.95, 0.99])
    threshold = float(q95)
    y_pred = (anomaly_score >= threshold).astype(int)

    # 7) Confusion matrix if ground truth exists
    cm = None
    labels = [0, 1]
    if y_true is not None:
        yb = pd.Series(y_true).astype("category").cat.codes.values
        cm = confusion_matrix(yb, y_pred, labels=[0, 1]).tolist()

    # 8) Sampling logic for SHAP (reusing your current approach)
    if max_points is None:
        logger.log_info("max_points=None → using ALL rows for SHAP (no sampling).")
        X_sample = X_align.copy()
        scores_sample = anomaly_score
        raw_scores_sample = raw_score
    else:
        if len(X_align) > max_points:
            logger.log_info(f"Sampling {max_points} points from {len(X_align)} for SHAP.")
            sample_indices = X_align.sample(n=max_points, random_state=42).index
            X_sample = X_align.loc[sample_indices]
            scores_sample = anomaly_score[sample_indices]
            raw_scores_sample = raw_score[sample_indices]
        else:
            logger.log_info(
                f"Dataset size ({len(X_align)}) <= max_points ({max_points}), using all rows for SHAP."
            )
            X_sample = X_align.copy()
            scores_sample = anomaly_score
            raw_scores_sample = raw_score

    # 9) Background data for KernelExplainer
    if len(X_align) > background_size:
        background_df = X_align.sample(n=background_size, random_state=42)
    else:
        background_df = X_align.copy()

    # 10) SHAP KernelExplainer
    model_fn = create_model_wrapper(session, input_names, is_supervised=False)
    explainer = shap.KernelExplainer(
        model_fn,
        background_df.to_numpy(np.float32),
        link="identity"
    )
    sv = explainer.shap_values(
        X_sample.to_numpy(np.float32),
        nsamples=shap_nsamples,
        l1_reg="num_features(10)"
    )

    if isinstance(sv, list):
        sv = sv[0]
    sv = np.array(sv, dtype=np.float64)
    if sv.ndim == 1:
        sv = sv.reshape(1, -1)

    feat_names = input_names if len(input_names) > 1 else list(X_sample.columns)

    # Fraud / anomaly stats
    fraud_mask = scores_sample >= threshold
    fraud_indices_in_sample = np.where(fraud_mask)[0]
    fraud_shap_stats = []

    if len(fraud_indices_in_sample) > 0:
        fraud_sv = sv[fraud_indices_in_sample]
        fraud_X_sample = X_sample.iloc[fraud_indices_in_sample]

        for j, f in enumerate(feat_names):
            fraud_shaps = fraud_sv[:, j]
            if f in fraud_X_sample.columns:
                vals = fraud_X_sample[f].values
                feature_min = float(np.min(vals))
                feature_max = float(np.max(vals))
            else:
                feature_min = 0.0
                feature_max = 0.0

            fraud_shap_stats.append({
                "feature": f,
                "mean_shap": float(np.mean(fraud_shaps)),
                "max_shap": float(np.max(fraud_shaps)),
                "min_shap": float(np.min(fraud_shaps)),
                "abs_mean": float(np.mean(np.abs(fraud_shaps))),
                "feature_min": feature_min,
                "feature_max": feature_max
            })

        fraud_shap_stats = sorted(
            fraud_shap_stats,
            key=lambda x: x["abs_mean"],
            reverse=True
        )

    # Global feature importance
    feature_importance: Dict[str, float] = {}
    for j, f in enumerate(feat_names):
        feature_importance[f] = float(np.mean(np.abs(sv[:, j])))

    sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
    sorted_feature_names = [f for f, _ in sorted_features]

    # Scatter payload
    scatter = []
    for f in sorted_feature_names:
        j = feat_names.index(f)
        if f not in X_sample.columns:
            vals = np.zeros(len(X_sample), dtype=np.float32)
        else:
            vals = X_sample[f].to_numpy(np.float32)

        scatter.append({
            "feature": f,
            "values": vals.tolist(),
            "shap": sv[:, j].astype(np.float64).tolist()
        })

    return {
        "task": "unsupervised",
        "n": int(len(df_all)),
        "labels": labels,
        "confusion_matrix": cm,
        "feature_names": sorted_feature_names,
        "scatter": scatter,
        "max_points": int(len(X_sample)),
        "scores_sample": scores_sample.astype(float).tolist(),
        "raw_scores_sample": raw_scores_sample.astype(float).tolist(),
        "quantiles": {"q90": float(q90), "q95": float(q95), "q99": float(q99)},
        "threshold": threshold,
        "fraud_shap_analysis": fraud_shap_stats,
        "fraud_count": int(np.sum(fraud_mask)),
        "positive_definition": "1 = anomaly (score >= threshold)",
    }


def evaluate_unsupervised_with_shap(
    onnx_path: str,
    csv_path: str,
    target_col: Optional[str] = None,
    max_points: Optional[int] = None,   # None = use ALL rows for SHAP sampling
    background_size: int = 100,
    shap_nsamples: int = 50,
    max_rows: Optional[int] = None
) -> Dict[str, Any]:
    """
    NEW: Unsupervised evaluation + SHAP where the *public* input is a PySpark DataFrame.
    We use PySpark for filtering/limiting, and convert only the final data to pandas for SHAP.
    """

    spark = get_spark_session()

    sdf = (
        spark.read
        .option("header", "true")
        .option("inferSchema", "true")
        .csv(csv_path)
    )

    logger.log_info(f"Received Spark DataFrame with {sdf.count()} rows and {len(sdf.columns)} columns")

    # Optional: limit rows in Spark before bringing to driver
    if max_rows is not None:
        sdf = sdf.limit(max_rows)
        logger.log_info(f"Limiting to {max_rows} rows in Spark before toPandas()")

    # You can also do Spark-side filtering here if needed, e.g.:
    # sdf = sdf.filter("some_condition")

    # Convert Spark DF → pandas once
    df_all = sdf.toPandas()
    logger.log_info(f"Converted Spark DF to pandas DF with {len(df_all)} rows")

    return _evaluate_unsupervised_with_shap_from_pandas_df(
        onnx_path=onnx_path,
        df_all=df_all,
        target_col=target_col,
        max_points=max_points,
        background_size=background_size,
        shap_nsamples=shap_nsamples,
    )


# def evaluate_unsupervised_with_shap(
#     onnx_path: str,
#     csv_path: str,
#     target_col: str | None = None,
#     max_points: int | None = None,         # ← None = use ALL rows for SHAP
#     background_size: int = 100,
#     shap_nsamples: int = 50,
#     max_csv_rows: int | None = None
# ) -> Dict[str, Any]:
#     # Evaluate unsupervised model with SHAP analysis

#     # 1) Load CSV
#     if max_csv_rows is None:
#         df_all = pd.read_csv(csv_path)
#         logger.log_info(f"Processing all {len(df_all)} rows from CSV")
#     else:
#         df_all = pd.read_csv(csv_path, nrows=max_csv_rows)
#         logger.log_info(f"Processing {len(df_all)} rows from CSV (limited to {max_csv_rows})")

#     df = df_all.copy()

#     # 2) Infer target column if not provided
#     if target_col is None:
#         for cand in ("IS_FRAUD", "is_fraud", "Label", "label", "target", "y"):
#             if cand in df.columns:
#                 target_col = cand
#                 break

#     # 3) Preprocess dataframe
#     X, y_true = preprocess_dataframe(df, target_col)

#     # 4) Load ONNX and prepare inputs
#     session = create_onnx_session(onnx_path)
#     input_names, output_names = get_session_io_names(session)

#     X_align = align_dataframe_to_inputs(X, input_names)

#     feed = build_input_feed_dict(X_align, input_names)
#     outputs = session.run(None, feed)

#     # 5) Parse unsupervised outputs -> anomaly score
#     label, score, proba = parse_unsupervised_outputs(outputs, output_names)

#     raw_score = None
#     if score is not None:
#         raw_score = score.copy()
#         normal_prob = normalize_scores_to_probability(score)
#         anomaly_score = 1.0 - normal_prob
#     elif proba is not None:
#         pos = 1 if proba.shape[1] > 1 else 0
#         raw_score = proba[:, pos].copy()
#         anomaly_score = proba[:, pos].astype(np.float64)
#     elif label is not None:
#         raw_score = label.astype(float).copy()
#         anomaly_score = (label.astype(int) == -1).astype(np.float64)
#     else:
#         raw_score = np.zeros(len(X_align), dtype=np.float64)
#         anomaly_score = np.zeros(len(X_align), dtype=np.float64)

#     # 6) Threshold using quantiles
#     q90, q95, q99 = np.quantile(anomaly_score, [0.90, 0.95, 0.99])
#     threshold = float(q95)
#     y_pred = (anomaly_score >= threshold).astype(int)

#     # 7) Confusion matrix if ground truth exists
#     cm = None
#     labels = [0, 1]
#     if y_true is not None:
#         yb = pd.Series(y_true).astype("category").cat.codes.values
#         cm = confusion_matrix(yb, y_pred, labels=[0, 1]).tolist()

#     # 8) Sampling logic for SHAP – remove hard limit of 300
#     #    - If max_points is None: use ALL rows
#     #    - Else: sample up to max_points
#     if max_points is None:
#         logger.log_info("max_points=None → using ALL rows for SHAP (no sampling).")
#         X_sample = X_align.copy()
#         scores_sample = anomaly_score
#         raw_scores_sample = raw_score
#     else:
#         if len(X_align) > max_points:
#             logger.log_info(f"Sampling {max_points} points from {len(X_align)} for SHAP.")
#             sample_indices = X_align.sample(n=max_points, random_state=42).index
#             X_sample = X_align.loc[sample_indices]
#             scores_sample = anomaly_score[sample_indices]
#             raw_scores_sample = raw_score[sample_indices]
#         else:
#             logger.log_info(
#                 f"Dataset size ({len(X_align)}) <= max_points ({max_points}), using all rows for SHAP."
#             )
#             X_sample = X_align.copy()
#             scores_sample = anomaly_score
#             raw_scores_sample = raw_score

#     # 9) Background data for KernelExplainer
#     if len(X_align) > background_size:
#         background_df = X_align.sample(n=background_size, random_state=42)
#     else:
#         background_df = X_align.copy()

#     # 10) SHAP KernelExplainer
#     model_fn = create_model_wrapper(session, input_names, is_supervised=False)
#     explainer = shap.KernelExplainer(
#         model_fn,
#         background_df.to_numpy(np.float32),
#         link="identity"
#     )
#     sv = explainer.shap_values(
#         X_sample.to_numpy(np.float32),
#         nsamples=shap_nsamples,
#         l1_reg="num_features(10)"
#     )

#     # 11) Normalize SHAP output shape
#     if isinstance(sv, list):
#         sv = sv[0]
#     sv = np.array(sv, dtype=np.float64)
#     if sv.ndim == 1:
#         sv = sv.reshape(1, -1)

#     # Feature names: prefer ONNX input names if multiple inputs, else dataframe cols
#     feat_names = input_names if len(input_names) > 1 else list(X_sample.columns)

#     # 12) Fraud/anomaly-specific SHAP stats
#     fraud_mask = scores_sample >= threshold
#     fraud_indices_in_sample = np.where(fraud_mask)[0]
#     fraud_shap_stats = []

#     if len(fraud_indices_in_sample) > 0:
#         fraud_sv = sv[fraud_indices_in_sample]
#         fraud_X_sample = X_sample.iloc[fraud_indices_in_sample]

#         for j, f in enumerate(feat_names):
#             if len(fraud_sv) > 0:
#                 fraud_shaps = fraud_sv[:, j]
#                 if f in fraud_X_sample.columns:
#                     fraud_feature_values = fraud_X_sample[f].values
#                     feature_min = float(np.min(fraud_feature_values))
#                     feature_max = float(np.max(fraud_feature_values))
#                 else:
#                     feature_min = 0.0
#                     feature_max = 0.0

#                 fraud_shap_stats.append({
#                     "feature": f,
#                     "mean_shap": float(np.mean(fraud_shaps)),
#                     "max_shap": float(np.max(fraud_shaps)),
#                     "min_shap": float(np.min(fraud_shaps)),
#                     "abs_mean": float(np.mean(np.abs(fraud_shaps))),
#                     "feature_min": feature_min,
#                     "feature_max": feature_max
#                 })

#         fraud_shap_stats = sorted(
#             fraud_shap_stats,
#             key=lambda x: x["abs_mean"],
#             reverse=True
#         )

#     # 13) Global feature importance
#     feature_importance: Dict[str, float] = {}
#     for j, f in enumerate(feat_names):
#         abs_shap_mean = float(np.mean(np.abs(sv[:, j])))
#         feature_importance[f] = abs_shap_mean

#     sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
#     sorted_feature_names = [f for f, _ in sorted_features]

#     # 14) Scatter data for frontend viz
#     scatter = []
#     for f in sorted_feature_names:
#         j = feat_names.index(f)
#         if f not in X_sample.columns:
#             vals = np.zeros(len(X_sample), dtype=np.float32)
#         else:
#             vals = X_sample[f].to_numpy(np.float32)

#         scatter.append({
#             "feature": f,
#             "values": vals.tolist(),
#             "shap": sv[:, j].astype(np.float64).tolist()
#         })

#     # 15) Final payload
#     return {
#         "task": "unsupervised",
#         "n": int(len(df_all)),
#         "labels": labels,
#         "confusion_matrix": cm,
#         "feature_names": sorted_feature_names,
#         "scatter": scatter,
#         "max_points": int(len(X_sample)),  # actual number of points used for SHAP
#         "scores_sample": scores_sample.astype(float).tolist(),
#         "raw_scores_sample": raw_scores_sample.astype(float).tolist(),
#         "quantiles": {"q90": float(q90), "q95": float(q95), "q99": float(q99)},
#         "threshold": threshold,
#         "fraud_shap_analysis": fraud_shap_stats,
#         "fraud_count": int(np.sum(fraud_mask)),
#         "positive_definition": "1 = anomaly (score >= threshold)",
#     }
