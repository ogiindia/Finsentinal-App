from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from decimal import Decimal
import json
import numpy as np

# PySpark imports
from pyspark.sql import DataFrame as SparkDataFrame
from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType

# sklearn imports for model training
from sklearn.ensemble import RandomForestClassifier
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import joblib
from imblearn.over_sampling import SMOTE

from model import ModelConfiguration, DataFile, ModelVersion, CalculationResult, RetrainingStatus, RetrainingStage
from utils.log_utils import session_logger as logger
from config import SPARK_APP_NAME, SPARK_MASTER, SPARK_DRIVER_MEMORY, SPARK_EXECUTOR_MEMORY, SPARK_SQL_SHUFFLE_PARTITIONS
from spark.spark_config import get_spark_session

try:
    from utils.prediction_utils import evaluate_onnx, evaluate_unsupervised_with_shap
    EVALUATION_AVAILABLE = True
    logger.log_info("Evaluation module loaded successfully")
except ImportError:
    logger.log_warning("evaluation module not found - evaluation features will be disabled")
    EVALUATION_AVAILABLE = False
    evaluate_onnx = None
    evaluate_unsupervised_with_shap = None


def sanitize_for_json(obj, max_depth=10):
    """Sanitize objects for JSON serialization"""
    if max_depth <= 0:
        return str(obj)
    if obj is None:
        return None
    elif isinstance(obj, bool):
        return obj
    elif isinstance(obj, (int, float)):
        if isinstance(obj, float):
            import math
            if math.isnan(obj):
                logger.log_warning("Converting NaN to 0.0")
                return 0.0
            elif math.isinf(obj):
                logger.log_warning(f"Converting Infinity to {1.0 if obj > 0 else -1.0}")
                return 1.0 if obj > 0 else -1.0
        return obj
    elif isinstance(obj, str):
        return obj
    elif isinstance(obj, (list, tuple)):
        return [sanitize_for_json(item, max_depth - 1) for item in obj]
    elif isinstance(obj, dict):
        return {str(k): sanitize_for_json(v, max_depth - 1) for k, v in obj.items()}
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        import math
        if math.isnan(obj) or math.isinf(obj):
            return 0.0
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return sanitize_for_json(obj.tolist(), max_depth - 1)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, Decimal):
        return float(obj)
    elif hasattr(obj, '__dict__'):
        return sanitize_for_json(obj.__dict__, max_depth - 1)
    else:
        return str(obj)


class RetrainService:
    def __init__(self, db: Session, data_dir: str, model_dir: str):
        self.db = db
        self.data_dir = Path(data_dir)
        self.model_dir = Path(model_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.model_dir.mkdir(exist_ok=True)
        self.current_status_id = None

        # Initialize Spark Session
        self.spark = get_spark_session()

        logger.log_info("SparkSession initialized for RetrainService")

    def __del__(self):
        """Cleanup Spark session on deletion"""
        if hasattr(self, 'spark'):
            self.spark.stop()
            logger.log_info("SparkSession stopped")

    def create_retraining_status(self, model_config: ModelConfiguration) -> RetrainingStatus:
        status = RetrainingStatus(
            model_config_id=model_config.id,
            alert_category=model_config.alert_category,
            current_stage=RetrainingStage.STARTED,
            stage_status='in_progress',
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

    def update_retraining_stage(self, stage: RetrainingStage, details: Dict[str, Any] = None, error: str = None):
        if not self.current_status_id:
            logger.log_warning("No retraining status record to update")
            return

        status = self.db.query(RetrainingStatus).filter(RetrainingStatus.id == self.current_status_id).first()
        if not status:
            logger.log_error(f"Retraining status record {self.current_status_id} not found")
            return

        status.current_stage = stage
        status.updated_at = datetime.now(timezone.utc)

        stage_order = {
            RetrainingStage.STARTED: 0,
            RetrainingStage.DATA_LOADING: 1,
            RetrainingStage.FEATURE_MAPPING: 2,
            RetrainingStage.DATA_PROCESSING: 3,
            RetrainingStage.MODEL_TRAINING: 4,
            RetrainingStage.MODEL_SAVING: 5,
            RetrainingStage.DATABASE_UPDATE: 6,
            RetrainingStage.MODEL_EVALUATION: 7,
            RetrainingStage.COMPLETED: 8,
            RetrainingStage.FAILED: 8
        }

        completed = stage_order.get(stage, 0)
        status.completed_stages = completed
        status.progress_percentage = int((completed / status.total_stages) * 100)

        if stage == RetrainingStage.COMPLETED:
            status.stage_status = 'completed'
            status.completed_at = datetime.now(timezone.utc)
        elif stage == RetrainingStage.FAILED:
            status.stage_status = 'failed'
            status.completed_at = datetime.now(timezone.utc)
            status.error_message = error
        else:
            status.stage_status = 'in_progress'

        if details:
            status.stage_details = json.dumps(details) if isinstance(details, dict) else details

        self.db.commit()
        logger.log_info(f"Updated stage to {stage.value}: {status.progress_percentage}% complete")

    def finalize_retraining_status(self, success: bool, version_number: int = None, new_rows: int = None, 
                                   total_rows: int = None, error: str = None):
        if not self.current_status_id:
            return

        status = self.db.query(RetrainingStatus).filter(RetrainingStatus.id == self.current_status_id).first()
        if status:
            if success:
                status.current_stage = RetrainingStage.COMPLETED
                status.stage_status = 'completed'
                status.completed_stages = status.total_stages
                status.progress_percentage = 100
                status.stage_details = json.dumps({"message": "Retraining completed successfully"})
            else:
                status.current_stage = RetrainingStage.FAILED
                status.stage_status = 'failed'
                status.error_message = error
                status.stage_details = json.dumps({"message": "Retraining failed", "error": error})

            status.version_number = version_number
            status.new_rows_added = new_rows
            status.total_data_rows = total_rows
            status.completed_at = datetime.now(timezone.utc)
            status.updated_at = datetime.now(timezone.utc)
            self.db.commit()
            logger.log_info(f"Finalized retraining status: {'SUCCESS' if success else 'FAILED'}")

    def get_model_config(self, model_id: int) -> ModelConfiguration:
        model_config = self.db.query(ModelConfiguration).filter(ModelConfiguration.id == model_id).first()
        if not model_config:
            raise ValueError(f"Model configuration with id {model_id} not found")
        return model_config

    def set_csv_path_for_model(self, model_id: int, csv_path: str) -> DataFile:
        """Set CSV path for model using PySpark"""
        model_config = self.get_model_config(model_id)
        csv_path = str(Path(csv_path).resolve())

        if not Path(csv_path).exists():
            raise ValueError(f"CSV file does not exist: {csv_path}")

        # Read CSV with PySpark
        df_spark = self.spark.read.csv(csv_path, header=True, inferSchema=True)
        row_count = df_spark.count()
        column_count = len(df_spark.columns)
        column_list = df_spark.columns

        data_file = self.db.query(DataFile).filter(
            DataFile.model_config_id == model_id, 
            DataFile.file_type == "training"
        ).first()

        if data_file:
            data_file.file_path = csv_path
            data_file.file_name = Path(csv_path).name
            data_file.file_size = Path(csv_path).stat().st_size
            data_file.row_count = row_count
            data_file.column_count = column_count
            data_file.columns_info = json.dumps({"columns": column_list})
            data_file.uploaded_at = datetime.now(timezone.utc)
            logger.log_info(f"Updated DataFile entry for model {model_id} with CSV: {csv_path}")
        else:
            data_file = DataFile(
                model_config_id=model_id,
                file_type="training",
                file_path=csv_path,
                file_name=Path(csv_path).name,
                file_size=Path(csv_path).stat().st_size,
                row_count=row_count,
                column_count=column_count,
                columns_info=json.dumps({"columns": column_list}),
                uploaded_at=datetime.now(timezone.utc)
            )
            self.db.add(data_file)
            logger.log_info(f"Created DataFile entry for model {model_id} with CSV: {csv_path}")

        self.db.commit()
        self.db.refresh(data_file)
        return data_file

    def update_or_create_data_file(self, model_config: ModelConfiguration, csv_path: str, row_count: int) -> DataFile:
        """Update or create data file record"""
        data_file = self.db.query(DataFile).filter(
            DataFile.model_config_id == model_config.id, 
            DataFile.file_type == "training"
        ).first()

        if data_file:
            data_file.file_path = csv_path
            data_file.file_name = Path(csv_path).name
            data_file.file_size = Path(csv_path).stat().st_size if Path(csv_path).exists() else 0
            data_file.row_count = row_count
            data_file.uploaded_at = datetime.now(timezone.utc)
            logger.log_info(f"Updated existing DataFile entry for model {model_config.id}")
        else:
            # Read with PySpark to get columns
            df_spark = self.spark.read.csv(csv_path, header=True, inferSchema=True)
            column_count = len(df_spark.columns)
            column_list = df_spark.columns

            data_file = DataFile(
                model_config_id=model_config.id,
                file_type="training",
                file_path=csv_path,
                file_name=Path(csv_path).name,
                file_size=Path(csv_path).stat().st_size if Path(csv_path).exists() else 0,
                row_count=row_count,
                column_count=column_count,
                columns_info=json.dumps({"columns": column_list}),
                uploaded_at=datetime.now(timezone.utc)
            )
            self.db.add(data_file)
            logger.log_info(f"Created new DataFile entry for model {model_config.id}")

        self.db.commit()
        self.db.refresh(data_file)
        return data_file

    def get_or_infer_csv_path(self, model_config: ModelConfiguration) -> str:
        """Get or infer CSV path from database"""
        data_file = self.db.query(DataFile).filter(
            DataFile.model_config_id == model_config.id, 
            DataFile.file_type == "training"
        ).order_by(DataFile.uploaded_at.desc()).first()

        if not data_file:
            data_file = self.db.query(DataFile).filter(
                DataFile.model_config_id == model_config.id, 
                DataFile.file_type == "csv"
            ).order_by(DataFile.uploaded_at.desc()).first()

        if data_file and data_file.file_path:
            csv_path = data_file.file_path
            if Path(csv_path).exists():
                logger.log_info(f"Found CSV path in DataFile table: {csv_path}")
                return csv_path
            else:
                logger.log_warning(f"CSV path in DataFile table doesn't exist: {csv_path}")

        csv_filename = f"{model_config.alert_category}.csv"
        csv_path = self.data_dir / csv_filename

        if csv_path.exists():
            logger.log_info(f"Found existing CSV file in data_dir: {csv_path}")
            return str(csv_path)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_filename = f"{model_config.alert_category}_training_{timestamp}.csv"
        csv_path = self.data_dir / csv_filename
        logger.log_warning(f"No existing CSV found. Creating new CSV path: {csv_path}")
        return str(csv_path)

    def map_incoming_data(self, incoming_data: List[Dict[str, Any]], feature_mappings: Dict[str, str], 
                         target_column: str = None) -> SparkDataFrame:
        """Map incoming data using PySpark"""
        if isinstance(feature_mappings, str):
            try:
                feature_mappings = json.loads(feature_mappings)
                logger.log_info(f"Parsed feature_mappings from JSON string")
            except json.JSONDecodeError as e:
                logger.log_error(f"Failed to parse feature_mappings JSON: {e}")
                raise ValueError(f"Invalid feature_mappings JSON: {e}")

        if not isinstance(feature_mappings, dict):
            raise ValueError(f"feature_mappings must be a dict or JSON string, got {type(feature_mappings)}")

        # Create Spark DataFrame from incoming data
        df_spark = self.spark.createDataFrame(incoming_data)

        # Map columns using select and alias
        select_exprs = []
        mapped_column_names = []  # Keep track of mapped column names

        for target_col, source_col in feature_mappings.items():
            if source_col in df_spark.columns:
                select_exprs.append(F.col(source_col).alias(target_col))
            else:
                logger.log_warning(f"Source column {source_col} not found in incoming data")
                select_exprs.append(F.lit(None).cast(DoubleType()).alias(target_col))
            mapped_column_names.append(target_col)

        # Handle target column - transform it BEFORE selecting
        if target_column and target_column not in mapped_column_names:
            if 'CLOSEREASON' in df_spark.columns:
                # Create the target column in the original DataFrame BEFORE selecting
                target_col_expr = F.when(
                    F.col('CLOSEREASON').isin(['FRAUD_FOR_CUSTOMER', 'FRAUD']), 1
                ).otherwise(0).alias(target_column)

                # Add the target column to select expressions
                select_exprs.append(target_col_expr)
                mapped_column_names.append(target_column)

                logger.log_info(f"Added target column {target_column} based on CLOSEREASON")
            else:
                logger.log_warning(f"CLOSEREASON column not found. Setting {target_column} to 0.")
                select_exprs.append(F.lit(0).alias(target_column))
                mapped_column_names.append(target_column)

        # Now select all columns at once (including target if created)
        mapped_df = df_spark.select(*select_exprs)

        # Log value counts for target column if it exists
        if target_column and target_column in mapped_column_names:
            try:
                fraud_count = mapped_df.filter(F.col(target_column) == 1).count()
                non_fraud_count = mapped_df.filter(F.col(target_column) == 0).count()
                logger.log_info(f"Target column {target_column} distribution: {{0: {non_fraud_count}, 1: {fraud_count}}}")
            except Exception as e:
                logger.log_warning(f"Could not log target column distribution: {e}")

        return mapped_df

    def append_to_csv(self, csv_path: str, new_data: SparkDataFrame) -> int:
        """Append data to CSV using PySpark"""
        csv_path_obj = Path(csv_path)

        if csv_path_obj.exists():
            logger.log_info(f"Appending to existing CSV: {csv_path}")
            existing_data = self.spark.read.csv(str(csv_path), header=True, inferSchema=True)
            combined_data = existing_data.union(new_data)
        else:
            logger.log_info(f"Creating new CSV: {csv_path}")
            combined_data = new_data

        csv_path_obj.parent.mkdir(parents=True, exist_ok=True)

        # Write to CSV using PySpark (coalesce to single partition for single file output)
        temp_dir = csv_path_obj.parent / f"temp_{csv_path_obj.stem}"
        combined_data.coalesce(1).write.csv(
            str(temp_dir),
            header=True,
            mode='overwrite'
        )

        # Move the part file to the final location
        import glob
        import shutil
        temp_files = glob.glob(str(temp_dir / "part-*.csv"))
        if temp_files:
            shutil.move(temp_files[0], csv_path)
            shutil.rmtree(temp_dir)

        total_rows = combined_data.count()
        logger.log_info(f"Data saved. Total rows: {total_rows}")
        return total_rows

    def train_random_forest_model(self, csv_path: str, target_column: str, feature_columns: List[str]) -> tuple:
        """Train Random Forest model using sklearn (data loaded via PySpark)"""
        # Read CSV with PySpark
        df_spark = self.spark.read.csv(csv_path, header=True, inferSchema=True)

        # Check for missing columns
        missing_cols = [col for col in feature_columns + [target_column] if col not in df_spark.columns]
        if missing_cols:
            raise ValueError(f"Missing columns in CSV: {missing_cols}")

        # Fill nulls and select required columns
        df_spark = df_spark.fillna(0.0)

        # Select only required columns and convert to pandas for sklearn
        # Convert to pandas DataFrame for sklearn (keeping this conversion since sklearn is required)
        selected_cols = feature_columns + [target_column]
        df_pandas = df_spark.select(selected_cols).toPandas()

        y = df_pandas[target_column].fillna(0).values
        X = df_pandas[feature_columns].fillna(0).astype(np.float32)

        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, stratify=y, random_state=42)

        # Apply SMOTE
        sm = SMOTE(sampling_strategy=1/1, random_state=42)
        X_train_res, y_train_res = sm.fit_resample(X_train, y_train)
        X_test_res, y_test_res = sm.fit_resample(X_test, y_test)

        # Create pipeline
        pre = ColumnTransformer([(c, "passthrough", [c]) for c in feature_columns])
        rf = RandomForestClassifier(random_state=42)
        pipe = Pipeline([("pre", pre), ("rf", rf)])

        # Train model
        pipe.fit(X_train_res, y_train_res)

        # Predictions
        y_pred = pipe.predict(X)
        accuracy = accuracy_score(y, y_pred)

        # Calculate metrics
        unique_classes = np.unique(y)
        class_distribution = {int(cls): int(np.sum(y == cls)) for cls in unique_classes}

        metrics = {
            "accuracy": float(accuracy),
            "classification_report": classification_report(y, y_pred, output_dict=True, zero_division=0),
            "confusion_matrix": confusion_matrix(y, y_pred).tolist(),
            "feature_importance": dict(zip(feature_columns, rf.feature_importances_.tolist())),
            "n_estimators": rf.n_estimators,
            "total_samples": len(df_pandas),
            "class_distribution": class_distribution,
            "training_type": "full_dataset"
        }

        logger.log_info(f"Model trained on full dataset: {len(df_pandas)} samples, Accuracy: {accuracy:.4f}")
        logger.log_info(f"Class distribution: {class_distribution}")

        return pipe, metrics, accuracy

    def save_model_as_onnx(self, pipe: Pipeline, feature_columns: List[str], output_path: str) -> str:
        """Save sklearn pipeline as ONNX"""
        rf = pipe.named_steps['rf']
        initial_types = [(c, FloatTensorType([None, 1])) for c in feature_columns]
        options = {id(rf): {"zipmap": False}}
        onnx_model = convert_sklearn(
            pipe, 
            initial_types=initial_types, 
            options=options, 
            target_opset={"": 17, "ai.onnx.ml": 3}
        )

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(onnx_model.SerializeToString())

        logger.log_info(f"ONNX model saved: {output_path}")
        return output_path

    def save_model_as_pkl(self, pipe: Pipeline, output_path: str) -> str:
        """Save sklearn pipeline as pickle"""
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(pipe, output_path)
        logger.log_info(f"PKL model saved: {output_path}")
        return output_path

    def get_next_version_number(self, model_config_id: int) -> int:
        """Get next version number for model"""
        latest_version = self.db.query(ModelVersion).filter(
            ModelVersion.model_config_id == model_config_id
        ).order_by(ModelVersion.version_number.desc()).first()
        return (latest_version.version_number + 1) if latest_version else 1

    def save_model_version(self, model_config_id: int, onnx_path: str, pkl_path: str, 
                          accuracy: float, metrics: Dict[str, Any]) -> ModelVersion:
        """Save model version to database"""
        version_number = self.get_next_version_number(model_config_id)

        # Allow None and dict; always store as JSON string if present
        metrics_json = json.dumps(metrics) if metrics is not None else None

        model_version = ModelVersion(
            model_config_id=model_config_id,
            version_number=version_number,
            model_path_onnx=onnx_path,
            model_path_pkl=pkl_path,
            accuracy=accuracy,
            metrics=metrics_json,
            created_at=datetime.now(timezone.utc)
        )

        self.db.add(model_version)
        self.db.commit()
        self.db.refresh(model_version)
        logger.log_info(f"Model version {version_number} saved for model config {model_config_id}")

        return model_version

    def run_model_evaluation(self, model_config: ModelConfiguration, model_path: str, csv_path: str) -> Dict[str, Any]:
        """Run model evaluation"""
        try:
            if not EVALUATION_AVAILABLE:
                logger.log_warning("Evaluation module not available - skipping evaluation")
                return {
                    "error": "Evaluation module not available",
                    "message": "Install evaluation module to enable automatic evaluation"
                }

            logger.log_info(f"Starting evaluation for {model_config.alert_category}")
            calculation_type = "supervised_metrics"
            evaluation_result = {}

            if model_config.model_type.value == 'supervised':
                logger.log_info(f"Running supervised evaluation with evaluate_onnx")
                try:
                    eval_result = evaluate_onnx(model_path, csv_path, target_col=model_config.target_column)
                    eval_result_sanitized = sanitize_for_json(eval_result)
                    logger.log_info(f"Sanitized evaluation result keys: {list(eval_result_sanitized.keys())}")

                    evaluation_result = {
                        "evaluation_result": eval_result_sanitized,
                        "model_path": str(model_path),
                        "data_path": str(csv_path),
                        "target_column": model_config.target_column,
                        "calculation_type": calculation_type
                    }

                    try:
                        json.dumps(evaluation_result)
                        logger.log_info("✅ Calculation result is valid JSON")
                    except (TypeError, ValueError) as json_error:
                        logger.log_error(f"JSON validation error: {json_error}")
                        raise

                    logger.log_info(f"Supervised evaluation completed successfully")
                except Exception as eval_error:
                    logger.log_error(f"Error in evaluate_onnx: {eval_error}", exc_info=True)
                    evaluation_result = {
                        "error": str(eval_error),
                        "model_path": str(model_path),
                        "data_path": str(csv_path),
                        "calculation_type": calculation_type
                    }
            else:
                logger.log_info(f"Running unsupervised evaluation with SHAP")
                try:
                    eval_result = evaluate_unsupervised_with_shap(
                        onnx_path=model_path,
                        csv_path=csv_path,
                        target_col=None,
                        max_points=300,
                        background_size=100,
                        shap_nsamples=50,
                        max_csv_rows=None
                    )
                    eval_result_sanitized = sanitize_for_json(eval_result)
                    logger.log_info(f"Sanitized evaluation result keys: {list(eval_result_sanitized.keys())}")

                    evaluation_result = {
                        "evaluation_result": eval_result_sanitized,
                        "model_path": str(model_path),
                        "data_path": str(csv_path),
                        "calculation_type": calculation_type
                    }

                    try:
                        json.dumps(evaluation_result)
                        logger.log_info("✅ Calculation result is valid JSON")
                    except (TypeError, ValueError) as json_error:
                        logger.log_error(f"JSON validation error: {json_error}")
                        raise

                    logger.log_info(f"Unsupervised evaluation completed successfully")
                except Exception as eval_error:
                    logger.log_error(f"Error in evaluate_unsupervised_with_shap: {eval_error}", exc_info=True)
                    evaluation_result = {
                        "error": str(eval_error),
                        "model_path": str(model_path),
                        "data_path": str(csv_path),
                        "calculation_type": calculation_type
                    }

            # Store calculation result in database
            existing_calculations = self.db.query(CalculationResult).filter(
                CalculationResult.model_config_id == model_config.id,
                CalculationResult.calculation_type == calculation_type
            ).all()

            if existing_calculations:
                for calc in existing_calculations:
                    self.db.delete(calc)
                logger.log_info(f"Deleted {len(existing_calculations)} existing calculation record(s) for {model_config.alert_category}")

            result_data_json = json.dumps(evaluation_result, default=str)
            metadata = {
                "alert_category": model_config.alert_category,
                "model_type": str(model_config.model_type.value) if hasattr(model_config.model_type, 'value') else str(model_config.model_type),
                "retrain_timestamp": datetime.now(timezone.utc).isoformat()
            }
            metadata_json = json.dumps(metadata)

            calc_result = CalculationResult(
                model_config_id=model_config.id,
                calculation_type=calculation_type,
                result_data=result_data_json,
                calculation_metadata=metadata_json,
                calculated_at=datetime.now(timezone.utc)
            )

            self.db.add(calc_result)
            logger.log_info(f"Created new calculation record for {model_config.alert_category}")
            self.db.commit()

            return evaluation_result

        except Exception as e:
            logger.log_error(f"Error during model evaluation: {str(e)}", exc_info=True)
            self.db.rollback()
            return {"error": str(e)}

    def retrain_model(self, model_id: int, incoming_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Retrain model with new data using PySpark for data processing"""
        try:
            model_config = self.get_model_config(model_id)
            logger.log_info(f"Starting retrain for model_id: {model_id}, alert_category: {model_config.alert_category}")

            self.create_retraining_status(model_config)
            self.update_retraining_stage(
                RetrainingStage.DATA_LOADING,
                {"message": "Loading CSV data", "new_rows": len(incoming_data)}
            )

            csv_path = self.get_or_infer_csv_path(model_config)
            logger.log_info(f"Using CSV path: {csv_path}")

            target_column = model_config.target_column
            if not target_column:
                raise ValueError("Target column not specified in model configuration")

            self.update_retraining_stage(
                RetrainingStage.FEATURE_MAPPING,
                {"message": "Mapping features and target column", "target": target_column}
            )

            feature_mappings = model_config.feature_mappings
            if isinstance(feature_mappings, str):
                try:
                    feature_mappings = json.loads(feature_mappings)
                    logger.log_info(f"Parsed feature_mappings from JSON string: {list(feature_mappings.keys())}")
                except json.JSONDecodeError as e:
                    logger.log_error(f"Failed to parse feature_mappings: {e}")
                    raise ValueError(f"Invalid feature_mappings JSON: {e}")

            # Map data using PySpark
            mapped_data = self.map_incoming_data(incoming_data, feature_mappings, target_column)
            mapped_row_count = mapped_data.count()
            logger.log_info(f"Mapped {mapped_row_count} new rows")

            self.update_retraining_stage(
                RetrainingStage.DATA_PROCESSING,
                {"message": "Processing and saving data", "rows_added": mapped_row_count}
            )

            # Append to CSV using PySpark
            new_row_count = self.append_to_csv(csv_path, mapped_data)
            self.update_or_create_data_file(model_config, csv_path, new_row_count)

            feature_columns = [col for col in feature_mappings.keys() if col != target_column]

            self.update_retraining_stage(
                RetrainingStage.MODEL_TRAINING,
                {"message": "Training new model version", "features": len(feature_columns)}
            )

            # Train model using sklearn (data loaded via PySpark)
            pipe, metrics, accuracy = self.train_random_forest_model(csv_path, target_column, feature_columns)

            self.update_retraining_stage(
                RetrainingStage.MODEL_SAVING,
                {"message": "Saving model artifacts", "model_type": model_config.model_type.value}
            )

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            model_filename = f"{model_config.alert_category}_{timestamp}"
            pkl_path = str(self.model_dir / f"{model_filename}.pkl")
            onnx_path = str(self.model_dir / f"{model_filename}.onnx")

            pkl_path = self.save_model_as_pkl(pipe, pkl_path)
            onnx_path = self.save_model_as_onnx(pipe, feature_columns, onnx_path)

            version_number = self.get_next_version_number(model_config.id)
            model_version = self.save_model_version(model_config.id, onnx_path, pkl_path, accuracy, metrics)

            self.update_retraining_stage(
                RetrainingStage.DATABASE_UPDATE,
                {"message": "Updating database records", "version": version_number}
            )

            model_config.model_path = onnx_path
            model_config.updated_at = datetime.now(timezone.utc)
            self.db.commit()

            # Run evaluation
            evaluation_result = None
            if EVALUATION_AVAILABLE:
                try:
                    self.update_retraining_stage(
                        RetrainingStage.MODEL_EVALUATION,
                        {"message": "Evaluating model performance", "version": version_number}
                    )
                    evaluation_result = self.run_model_evaluation(model_config, onnx_path, csv_path)
                except Exception as eval_error:
                    logger.log_warning(f"Model evaluation failed: {eval_error}")
                    evaluation_result = {"error": str(eval_error)}
            else:
                logger.log_warning("Evaluation utilities not available, skipping model evaluation")

            # Update model version with evaluation results
            try:
                if evaluation_result and isinstance(evaluation_result, dict):
                    derived_accuracy = None
                    eval_inner = evaluation_result.get("evaluation_result")

                    if isinstance(eval_inner, dict):
                        for key in ["accuracy", "test_accuracy", "val_accuracy", "validation_accuracy"]:
                            if key in eval_inner:
                                try:
                                    derived_accuracy = float(eval_inner[key])
                                    break
                                except Exception:
                                    pass

                    model_version = self.db.query(ModelVersion).filter(
                        ModelVersion.model_config_id == model_config.id,
                        ModelVersion.version_number == version_number,
                    ).first()

                    if model_version:
                        model_version.metrics = json.dumps(evaluation_result, default=str)

                        if derived_accuracy is not None:
                            model_version.accuracy = derived_accuracy

                        self.db.commit()
                        self.db.refresh(model_version)
                        logger.log_info(
                            f"Updated ModelVersion v{version_number} with evaluation metrics "
                            f"in the same format as background calculation"
                        )
                    else:
                        logger.log_warning(
                            f"Could not find ModelVersion to update metrics for "
                            f"model_config_id={model_config.id}, version={version_number}"
                        )
            except Exception as ve:
                self.db.rollback()
                logger.log_error(f"Error updating version metrics after evaluation: {ve}", exc_info=True)

            self.finalize_retraining_status(
                success=True,
                version_number=version_number,
                new_rows=mapped_row_count,
                total_rows=new_row_count
            )

            return {
                "status": "success",
                "message": "Model retrained successfully",
                "model_id": model_id,
                "version_number": version_number,
                "alert_category": model_config.alert_category,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "metrics": evaluation_result if evaluation_result else metrics
            }

        except Exception as e:
            logger.log_error(f"Error during model retraining: {e}", exc_info=True)
            try:
                self.finalize_retraining_status(success=False, error=str(e))
            except Exception:
                self.db.rollback()
            raise