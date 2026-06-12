from reportlab.pdfgen import canvas
from io import BytesIO
import matplotlib.pyplot as plt
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from spark.spark_config import get_spark_session
from pyspark.sql import DataFrame
from utils.onnx_utils import run_onnx_inference
import numpy as np

def fig_to_img(fig) -> BytesIO:
    buf = BytesIO()
    fig.savefig(buf, dpi=200, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


def risk_level(pct: float) -> str:
    if pct < 30:
        return "LOW"
    if pct < 60:
        return "MEDIUM"
    return "HIGH"


def watermark(c: canvas.Canvas, doc):
    w, h = A4
    c.saveState()
    c.setFont("Helvetica-Bold", 42)
    c.setFillColorRGB(0.7, 0.7, 0.7, alpha=0.12)
    c.translate(w / 2, h / 2)
    c.rotate(45)
    c.drawCentredString(0, 0, "Finsentinel AI")
    c.restoreState()

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.grey)
    c.drawString(36, 24, "Finsentinel AI - Confidential")
    c.drawRightString(w - 36, 24, f"Page {doc.page}")

def load_dataframe(
    file_path: str,
    file_format: str = "parquet"
) -> DataFrame:
    """
    Load large datasets using Spark.

    Supported formats:
    - parquet
    - csv
    """

    spark = get_spark_session()

    if file_format.lower() == "parquet":
        return spark.read.parquet(file_path)

    if file_format.lower() == "csv":
        return (
            spark.read
            .option("header", "true")
            .option("inferSchema", "true")
            .csv(file_path)
        )

    raise ValueError(f"Unsupported file format: {file_format}")

def onnx_shap_predictor(onnx_model_path, feature_names):
    inference_fn = run_onnx_inference(onnx_model_path, feature_names)

    def predict(X):
        if isinstance(X, np.ndarray):
            X = X.astype(np.float32)
        return inference_fn(X)

    return predict

def scalar(v, default=0.0):
    if isinstance(v, list):
        return float(v[0]) if v else default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default
    
def risk_level_from_raw_score(raw_score: float) -> str:
    if raw_score < 0:
        return "HIGH"
    elif raw_score <= 2:
        return "MEDIUM"
    return "LOW"