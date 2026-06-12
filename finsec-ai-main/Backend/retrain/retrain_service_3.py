from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime, timezone
from decimal import Decimal
import json
import math

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from pyspark.sql import DataFrame as SparkDataFrame
from pyspark.sql import functions as F
from pyspark.sql.types import DoubleType

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (accuracy_score, 
                             classification_report,
                             confusion_matrix,
                             roc_auc_score,
                             precision_score,
                             recall_score,
                             f1_score
                             )
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

from imblearn.over_sampling import SMOTE
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import joblib

from model import ModelConfiguration, DataFile, ModelVersion, RetrainingStatus, RetrainingStage
from utils.log_utils import session_logger as logger
from config import SPARK_APP_NAME, SPARK_MASTER, SPARK_DRIVER_MEMORY, SPARK_EXECUTOR_MEMORY, SPARK_SQL_SHUFFLE_PARTITIONS
from .retrain_schema_2 import RetrainFileRequest
from spark.spark_config import get_spark_session


def sanitize_for_json(obj, max_depth: int = 10):
    if max_depth <= 0:
        return str(obj)
    if obj is None:
        return None
    if isinstance(obj, (int, float, bool, str)):
        if isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return 0.0
        return obj
    if isinstance(obj, list):
        return [sanitize_for_json(v, max_depth - 1) for v in obj]
    if isinstance(obj, tuple):
        return tuple(sanitize_for_json(v, max_depth - 1) for v in obj)
    if isinstance(obj, dict):
        return {str(k): sanitize_for_json(v, max_depth - 1) for k, v in obj.items()}
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        if math.isnan(obj) or math.isinf(obj):
            return 0.0
        return float(obj)
    if isinstance(obj, np.ndarray):
        return sanitize_for_json(obj.tolist(), max_depth - 1)
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if hasattr(obj, "__dict__"):
        return sanitize_for_json(obj.__dict__, max_depth - 1)
    return str(obj)


class RetrainService:
    def __init__(self, db: Session, data_dir: Path, model_dir: Path):
        self.db = db
        self.data_dir = Path(data_dir)
        self.model_dir = Path(model_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.current_status_id: Optional[int] = None
        self.spark = get_spark_session()

    def get_model_config(self, model_id: int) -> ModelConfiguration:
        model_config = self.db.query(ModelConfiguration).filter(ModelConfiguration.id == model_id).first()
        if not model_config:
            raise ValueError("Model configuration not found")
        return model_config

    def create_retraining_status(self, model_config: ModelConfiguration) -> RetrainingStatus:
        status = RetrainingStatus(
            model_config_id=model_config.id,
            alert_category=model_config.alert_category,
            current_stage=RetrainingStage.STARTED,
            stage_status="in_progress",
            total_stages=8,
            completed_stages=0,
            progress_percentage=0,
            stage_details=json.dumps({"message": "Retraining process initiated"}),
            started_at=datetime.now(timezone.utc)
        )
        self.db.add(status)
        self.db.commit()
        self.db.refresh(status)
        self.current_status_id = status.id
        logger.log_info(f"Created retraining status record: {status.id}")
        return status

    def update_retraining_stage(self, stage: RetrainingStage, details: Dict[str, Any]):
        if not self.current_status_id:
            return
        status = self.db.query(RetrainingStatus).filter(RetrainingStatus.id == self.current_status_id).first()
        if not status:
            return
        stage_order = [
            RetrainingStage.STARTED,
            RetrainingStage.DATA_LOADING,
            RetrainingStage.FEATURE_MAPPING,
            RetrainingStage.DATA_PROCESSING,
            RetrainingStage.MODEL_TRAINING,
            RetrainingStage.MODEL_SAVING,
            RetrainingStage.DATABASE_UPDATE,
            RetrainingStage.MODEL_EVALUATION,
            RetrainingStage.COMPLETED,
            RetrainingStage.FAILED,
        ]
        total_stages = 8
        try:
            idx = stage_order.index(stage)
            completed = max(0, min(idx, total_stages))
            progress = int(completed * 100 / total_stages)
        except ValueError:
            completed = status.completed_stages or 0
            progress = status.progress_percentage or 0
        status.current_stage = stage
        status.stage_status = "in_progress"
        status.completed_stages = completed
        status.progress_percentage = progress
        status.stage_details = json.dumps(sanitize_for_json(details))
        status.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        logger.log_info(f"Updated retraining status {status.id} to stage {stage.value}")

    def finalize_retraining_status(self, success: bool, version_number: Optional[int] = None, new_rows: Optional[int] = None, total_rows: Optional[int] = None, error: Optional[str] = None):
        if not self.current_status_id:
            return
        status = self.db.query(RetrainingStatus).filter(RetrainingStatus.id == self.current_status_id).first()
        if not status:
            return
        if success:
            status.current_stage = RetrainingStage.COMPLETED
            status.stage_status = "completed"
        else:
            status.current_stage = RetrainingStage.FAILED
            status.stage_status = "failed"
            status.error_message = error
        if version_number is not None:
            status.version_number = version_number
        if new_rows is not None:
            status.new_rows_added = new_rows
        if total_rows is not None:
            status.total_data_rows = total_rows
        status.progress_percentage = 100 if success else status.progress_percentage or 0
        status.completed_at = datetime.now(timezone.utc)
        status.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        logger.log_info(f"Finalized retraining status {status.id} success={success}")

    def map_incoming_data(self, incoming_data: List[Dict[str, Any]], feature_mappings: Dict[str, str], target_column: str) -> SparkDataFrame:
        if not incoming_data:
            raise ValueError("Incoming data is empty")
        if isinstance(feature_mappings, str):
            feature_mappings = json.loads(feature_mappings)
        df_spark = self.spark.createDataFrame(incoming_data)
        select_exprs = []
        for target_col, source_col in feature_mappings.items():
            if source_col in df_spark.columns:
                select_exprs.append(F.col(source_col).alias(target_col))
            else:
                select_exprs.append(F.lit(None).cast(DoubleType()).alias(target_col))
        if target_column and target_column not in feature_mappings.keys():
            if "CLOSEREASON" in df_spark.columns:
                target_expr = F.when(F.col("CLOSEREASON").isin(["FRAUD_FOR_CUSTOMER", "FRAUD"]), 1).otherwise(0).alias(target_column)
                select_exprs.append(target_expr)
            else:
                select_exprs.append(F.lit(0).alias(target_column))
        mapped_df = df_spark.select(*select_exprs)
        return mapped_df

    def read_file_to_spark(self, file_path: str, file_type: str) -> SparkDataFrame:
        path_obj = Path(file_path)
        if not path_obj.exists():
            raise ValueError(f"File does not exist: {file_path}")
        if file_type == "csv":
            df_spark = self.spark.read.csv(str(path_obj), header=True, inferSchema=True)
        elif file_type in ("xlsx", "xls"):
            df_pd = pd.read_excel(str(path_obj))
            df_spark = self.spark.createDataFrame(df_pd)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
        cols = df_spark.columns
        logger.log_info(f"Loaded file '{file_path}' type='{file_type}' with {len(cols)} columns: {cols}")
        return df_spark

    def join_persistence_and_transaction(
        self,
        persistance_path: str,
        transaction_path: str,
        persistance_file_type: str,
        transaction_file_type: str,
        join_left_columns: List[str],
        join_right_columns: List[str],
        join_type: str = "left",
    ) -> SparkDataFrame:
        df_left = self.read_file_to_spark(persistance_path, persistance_file_type)
        df_right = self.read_file_to_spark(transaction_path, transaction_file_type)
        logger.log_info(f"Persistence file columns ({len(df_left.columns)}): {df_left.columns}")
        logger.log_info(f"Transaction file columns ({len(df_right.columns)}): {df_right.columns}")
        if not join_left_columns or not join_right_columns:
            raise ValueError("Join columns must be provided for both files")
        if len(join_left_columns) != len(join_right_columns):
            raise ValueError("join_left_columns and join_right_columns must have same length")
        conditions = None
        for l, r in zip(join_left_columns, join_right_columns):
            if l not in df_left.columns:
                raise ValueError(f"Left join column {l} not found")
            if r not in df_right.columns:
                raise ValueError(f"Right join column {r} not found")
            cond = df_left[l] == df_right[r]
            conditions = cond if conditions is None else conditions & cond
        joined_df = df_left.join(df_right, conditions, how=join_type or "left")
        logger.log_info(f"Joined dataframe columns ({len(joined_df.columns)}): {joined_df.columns}")
        return joined_df

    def map_spark_dataframe(
        self,
        df_spark: SparkDataFrame,
        feature_mappings: Dict[str, str],
        target_column: Optional[str] = None
    ) -> SparkDataFrame:
        if isinstance(feature_mappings, str):
            feature_mappings = json.loads(feature_mappings)
        select_exprs = []
        mapped_cols = []
        for target_col, source_col in feature_mappings.items():
            if source_col in df_spark.columns:
                select_exprs.append(F.col(source_col).alias(target_col))
            else:
                select_exprs.append(F.lit(None).cast(DoubleType()).alias(target_col))
            mapped_cols.append(target_col)
        if target_column and target_column not in mapped_cols:
            if "CLOSEREASON" in df_spark.columns:
                target_expr = F.when(
                    F.col("CLOSEREASON").isin(["FRAUD_FOR_CUSTOMER", "FRAUD"]),
                    1
                ).otherwise(0).alias(target_column)
                select_exprs.append(target_expr)
            else:
                select_exprs.append(F.lit(0).alias(target_column))
            mapped_cols.append(target_column)
        mapped_df = df_spark.select(*select_exprs)
        return mapped_df

    def append_to_csv(self, csv_path: str, new_data: SparkDataFrame) -> int:
        path_obj = Path(csv_path)
        if path_obj.exists():
            existing = self.spark.read.csv(str(path_obj), header=True, inferSchema=True)
            logger.log_info(f"Existing CSV '{csv_path}' Spark shape: ({existing.count()}, {len(existing.columns)})")
            logger.log_info(f"Existing CSV columns: {existing.columns}")
            existing_cols = existing.columns
            existing_schema = {field.name: field.dataType for field in existing.schema}
            logger.log_info(f"Existing CSV schema: {existing_schema}")
            new_cols = new_data.columns
            for col_name, data_type in existing_schema.items():
                if col_name not in new_cols:
                    new_data = new_data.withColumn(col_name, F.lit(None).cast(data_type))
            new_data = new_data.select([F.col(c) for c in existing_cols])
            for field in existing.schema:
                new_data = new_data.withColumn(field.name, F.col(field.name).cast(field.dataType))
            logger.log_info(f"New mapped Spark shape before union: ({new_data.count()}, {len(new_data.columns)})")
            combined = existing.unionByName(new_data, allowMissingColumns=False)
        else:
            logger.log_info(f"No existing CSV at '{csv_path}', using only new mapped data")
            combined = new_data
        tmp_dir = path_obj.parent / (path_obj.stem + "_tmp")
        combined.coalesce(1).write.mode("overwrite").option("header", True).csv(str(tmp_dir))
        csv_files = list(tmp_dir.glob("*.csv"))
        if not csv_files:
            raise ValueError("No CSV file written by Spark")
        path_obj.parent.mkdir(parents=True, exist_ok=True)
        csv_files[0].replace(path_obj)
        for p in tmp_dir.glob("*"):
            p.unlink()
        tmp_dir.rmdir()
        total_rows = combined.count()
        total_cols = len(combined.columns)
        logger.log_info(f"Combined CSV Spark shape after append: ({total_rows}, {total_cols})")
        logger.log_info(f"Combined CSV columns after append: {combined.columns}")
        return total_rows

    def get_or_infer_csv_path(self, model_config: ModelConfiguration) -> str:
        data_file = self.db.query(DataFile).filter(
            DataFile.model_config_id == model_config.id,
            DataFile.file_type == "csv"
        ).order_by(DataFile.uploaded_at.desc()).first()
        if data_file:
            return data_file.file_path
        path = self.data_dir / f"{model_config.alert_category}_data.csv"
        return str(path)

    def update_or_create_data_file(self, model_config: ModelConfiguration, csv_path: str, row_count: int):
        data_file = self.db.query(DataFile).filter(
            DataFile.model_config_id == model_config.id,
            DataFile.file_type == "csv"
        ).order_by(DataFile.uploaded_at.desc()).first()
        if data_file:
            data_file.file_path = csv_path
            data_file.file_name = Path(csv_path).name
            data_file.row_count = row_count
            data_file.file_type = "csv"
        else:
            data_file = DataFile(
                model_config_id=model_config.id,
                file_type="csv",
                file_path=csv_path,
                file_name=Path(csv_path).name,
                row_count=row_count
            )
            self.db.add(data_file)
        self.db.commit()

    def train_random_forest_model(self, csv_path: str, target_column: str, feature_columns: List[str]):
        df_spark = self.read_file_to_spark(csv_path, "csv")
        raw_rows = df_spark.count()
        raw_cols = len(df_spark.columns)
        logger.log_info(f"Training data Spark shape before dropna: ({raw_rows}, {raw_cols})")
        cols = [c for c in feature_columns if c in df_spark.columns]
        if target_column not in df_spark.columns:
            raise ValueError(f"Target column {target_column} not found in data")
        df_spark = df_spark.dropna(subset=cols + [target_column])
        cleaned_rows = df_spark.count()
        cleaned_cols = len(df_spark.columns)
        logger.log_info(f"Training data Spark shape after dropna: ({cleaned_rows}, {cleaned_cols})")
        df = df_spark.select(cols + [target_column]).toPandas()
        logger.log_info(f"Training data pandas shape after Spark to_pandas: {df.shape}")
        X = df[cols]
        y = df[target_column]
        if X.empty:
            raise ValueError("No data available for training after dropping missing values")
        stratify_arg = y if len(y.unique()) > 1 else None
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=stratify_arg
        )
        smote = SMOTE(random_state=42)
        X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
        logger.log_info(f"SMOTE resampled training pandas shape: {X_train_res.shape}")
        pre = ColumnTransformer([(c, "passthrough", [c]) for c in feature_columns])
        rf = RandomForestClassifier(random_state=42)
        pipe = Pipeline([("pre", pre), ("rf", rf)])
        pipe.fit(X_train_res, y_train_res)

        # Predictions
        y_pred = pipe.predict(X)
        # Try to get probabilities for ROC AUC (binary classification)
        y_proba = None
        try:
            proba = pipe.predict_proba(X)
            # If binary, take probability of positive class (label 1)
            if proba.shape[1] == 2:
                y_proba = proba[:, 1]
        except Exception:
            y_proba = None

        # Basic info
        acc = float(accuracy_score(y, y_pred))
        labels = sorted(list(set(y)))
        n_samples = int(len(y))

        # Macro / weighted metrics
        precision_macro = float(precision_score(y, y_pred, average="macro", zero_division=0))
        recall_macro = float(recall_score(y, y_pred, average="macro", zero_division=0))
        f1_macro = float(f1_score(y, y_pred, average="macro", zero_division=0))

        precision_weighted = float(precision_score(y, y_pred, average="weighted", zero_division=0))
        recall_weighted = float(recall_score(y, y_pred, average="weighted", zero_division=0))
        f1_weighted = float(f1_score(y, y_pred, average="weighted", zero_division=0))
        # Per-class metrics from classification_report
        report = classification_report(y, y_pred, output_dict=True)
        cm = confusion_matrix(y, y_pred, labels=labels).tolist()

        per_class = {}
        for lab in labels:
            key = str(lab)
            if key in report:
                per_class[key] = {
                    "precision": float(report[key].get("precision", 0.0)),
                    "recall": float(report[key].get("recall", 0.0)),
                    "f1": float(report[key].get("f1-score", 0.0)),
                }

        # ROC AUC (only if we have probabilities and binary labels)
        roc_auc = None
        if y_proba is not None and len(labels) == 2:
            roc_auc = float(roc_auc_score(y, y_proba))

        evaluation_result = {
            "task": "classification",
            "n": n_samples,
            "labels": labels,
            "confusion_matrix": cm,
            "accuracy": acc,
            "precision_macro": precision_macro,
            "recall_macro": recall_macro,
            "f1_macro": f1_macro,
            "precision_weighted": precision_weighted,
            "recall_weighted": recall_weighted,
            "f1_weighted": f1_weighted,
            "per_class": per_class,
        }
        if roc_auc is not None:
            evaluation_result["roc_auc"] = roc_auc

        # Return the evaluation_result instead of the simple metrics dict
        return pipe, evaluation_result, acc


    def save_model_as_pkl(self, model, path: str) -> str:
        path_obj = Path(path)
        path_obj.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, path_obj)
        return str(path_obj)

    def save_model_as_onnx(self, pipe: Pipeline, feature_columns: List[str], output_path: str) -> str:
        rf = pipe.named_steps['rf']
        initial_types = [(c, FloatTensorType([None, 1])) for c in feature_columns]
        options = {id(rf): {"zipmap": False}}
        onnx_model = convert_sklearn(pipe, initial_types=initial_types, options=options, target_opset={"": 17, "ai.onnx.ml": 3})
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(onnx_model.SerializeToString())
        logger.log_info(f"ONNX model saved: {output_path}")
        return output_path

    def get_next_version_number(self, model_config_id: int) -> int:
        last = self.db.query(ModelVersion).filter(
            ModelVersion.model_config_id == model_config_id
        ).order_by(ModelVersion.version_number.desc()).first()
        if not last:
            return 1
        return (last.version_number or 0) + 1

    def save_model_version(self, model_config: ModelConfiguration, onnx_path: str, pkl_path: str, accuracy: float, metrics: Dict[str, Any]) -> ModelVersion:
        version_number = self.get_next_version_number(model_config.id)
        mv = ModelVersion(
            model_config_id=model_config.id,
            version_number=version_number,
            model_path_onnx=onnx_path,
            model_path_pkl=pkl_path,
            accuracy=accuracy,
            metrics=json.dumps(sanitize_for_json(metrics)),
        )
        self.db.add(mv)
        self.db.commit()
        self.db.refresh(mv)
        return mv

    def _retrain_from_mapped_df(self, model_config: ModelConfiguration, mapped_df: SparkDataFrame, feature_mappings: Dict[str, str], target_column: str) -> Dict[str, Any]:
        mapped_rows = mapped_df.count()
        logger.log_info(f"Mapped data Spark shape: ({mapped_rows}, {len(mapped_df.columns)})")
        csv_path = self.get_or_infer_csv_path(model_config)
        total_rows = self.append_to_csv(csv_path, mapped_df)
        self.update_or_create_data_file(model_config, csv_path, total_rows)
        self.update_retraining_stage(
            RetrainingStage.DATA_PROCESSING,
            {
                "mapped_rows": mapped_rows,
                "csv_total_rows_after_append": total_rows
            }
        )
        feature_columns = [c for c in feature_mappings.keys() if c != target_column]
        self.update_retraining_stage(
            RetrainingStage.MODEL_TRAINING,
            {"features": len(feature_columns)}
        )
        model, metrics, accuracy = self.train_random_forest_model(csv_path, target_column, feature_columns)
        self.update_retraining_stage(
            RetrainingStage.MODEL_SAVING,
            {"accuracy": accuracy}
        )
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_filename = f"{model_config.alert_category}_{timestamp}"
        pkl_path = self.save_model_as_pkl(model, str(self.model_dir / f"{model_filename}.pkl"))
        onnx_path = self.save_model_as_onnx(model, feature_columns, str(self.model_dir / f"{model_filename}.onnx"))
        mv = self.save_model_version(model_config, onnx_path, pkl_path, accuracy, metrics)
        model_config.model_path = onnx_path
        model_config.model_filename = model_filename
        model_config.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.update_retraining_stage(
            RetrainingStage.DATABASE_UPDATE,
            {"version_number": mv.version_number}
        )
        self.finalize_retraining_status(
            True,
            version_number=mv.version_number,
            new_rows=mapped_rows,
            total_rows=total_rows
        )
        return {
            "status": "success",
            "message": "Model retrained successfully",
            "model_id": model_config.id,
            "version_number": mv.version_number,
            "alert_category": model_config.alert_category,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": metrics,
        }

    def retrain_model(self, model_id: int, incoming_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        try:
            model_config = self.get_model_config(model_id)
            self.create_retraining_status(model_config)
            self.update_retraining_stage(
                RetrainingStage.DATA_LOADING,
                {"message": "Loading alert data"}
            )
            if not model_config.feature_mappings:
                raise ValueError("Feature mappings not defined in model configuration")
            feature_mappings = json.loads(model_config.feature_mappings)
            target_column = model_config.target_column
            if not target_column:
                raise ValueError("Target column not defined in model configuration")
            self.update_retraining_stage(
                RetrainingStage.FEATURE_MAPPING,
                {"target": target_column, "num_features": len(feature_mappings)}
            )
            mapped_df = self.map_incoming_data(incoming_data, feature_mappings, target_column)
            return self._retrain_from_mapped_df(model_config, mapped_df, feature_mappings, target_column)
        except Exception as e:
            logger.log_error(f"Error during model retraining: {e}", exc_info=True)
            self.finalize_retraining_status(False, error=str(e))
            raise

    def retrain_model_v2(
        self,
        file_request: RetrainFileRequest,
        persistance_path: Optional[str],
        transaction_path: Optional[str],
    ) -> Dict[str, Any]:
        try:
            # 1) Load model config & create status
            model_config = self.get_model_config(file_request.model_id)
            self.create_retraining_status(model_config)

            # 2) Decide feature_mappings (prefer request, else DB)
            if file_request.feature_mappings:
                feature_mappings = (
                    json.loads(file_request.feature_mappings)
                    if isinstance(file_request.feature_mappings, str)
                    else file_request.feature_mappings
                )
            else:
                if not model_config.feature_mappings:
                    raise ValueError("Feature mappings not provided in request or model config")
                feature_mappings = json.loads(model_config.feature_mappings)

            target_column = (
                getattr(file_request, "target_column", None)
                or model_config.target_column
            )
            if not target_column:
                raise ValueError("Target column not defined in request or model configuration")

            self.update_retraining_stage(
                RetrainingStage.FEATURE_MAPPING,
                {"target": target_column, "num_features": len(feature_mappings)},
            )

            mapped_dfs: List[SparkDataFrame] = []

            # 3a) Joined persistence + transaction → map
            if persistance_path != 'None' and transaction_path != 'None':
                if not file_request.persistance_file_type or not file_request.transaction_file_type:
                    raise ValueError("persistance_file_type and transaction_file_type are required when paths are given")

                joined_df = self.join_persistence_and_transaction(
                    persistance_path=persistance_path,
                    transaction_path=transaction_path,
                    persistance_file_type=file_request.persistance_file_type,
                    transaction_file_type=file_request.transaction_file_type,
                    join_left_columns=file_request.join_left_columns or [],
                    join_right_columns=file_request.join_right_columns or [],
                    join_type=file_request.join_type or "left",
                )

                joined_row_count = joined_df.count()
                joined_col_count = len(joined_df.columns)
                logger.log_info(f"Joined data Spark shape: ({joined_row_count}, {joined_col_count})")
                self.update_retraining_stage(
                    RetrainingStage.DATA_LOADING,
                    {"joined_rows": joined_row_count, "joined_cols": joined_col_count},
                )

                mapped_joined_df = self.map_spark_dataframe(
                    joined_df, feature_mappings, target_column
                )
                mapped_dfs.append(mapped_joined_df)

            # 3b) Alert rows → Spark → map
            if file_request.alert_rows:
                alert_df = self.spark.createDataFrame(file_request.alert_rows)
                alert_row_count = alert_df.count()
                alert_col_count = len(alert_df.columns)
                logger.log_info(f"Alert rows Spark shape: ({alert_row_count}, {alert_col_count})")

                mapped_alert_df = self.map_spark_dataframe(
                    alert_df, feature_mappings, target_column
                )
                mapped_dfs.append(mapped_alert_df)

            if not mapped_dfs:
                raise ValueError("No data provided: either files or alert_rows must be present")

            # 4) Union **mapped** dataframes (same schema)
            mapped_df = mapped_dfs[0]
            for extra_df in mapped_dfs[1:]:
                mapped_df = mapped_df.unionByName(extra_df, allowMissingColumns=True)

            # 5) Reuse existing helper to append + train
            return self._retrain_from_mapped_df(
                model_config=model_config,
                mapped_df=mapped_df,
                feature_mappings=feature_mappings,
                target_column=target_column,
            )

        except Exception as e:
            logger.log_error(f"Error during model retraining v2: {e}", exc_info=True)
            self.finalize_retraining_status(False, error=str(e))
            raise


