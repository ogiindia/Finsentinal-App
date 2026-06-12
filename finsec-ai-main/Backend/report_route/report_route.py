from fastapi import APIRouter, Response, HTTPException, Depends
from io import BytesIO
import uuid
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    PageBreak,
)
from sqlalchemy.orm import Session
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from report_route.schema import ReportPayload
from report_route.utils_report import fig_to_img, risk_level, watermark, risk_level_from_raw_score
from report_route.graphs import plot_feature_summary, plot_summary, plot_timeline
from utils.onnx_utils import (create_onnx_session,
                              get_session_io_names,
                              parse_supervised_outputs,
                              parse_unsupervised_outputs,
                              normalize_scores_to_probability
                              )
from utils.shap_utils import create_background_samples, calculate_shap_values
from sklearn.metrics import (
    confusion_matrix, roc_curve, precision_recall_curve,
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score
)
from sklearn.calibration import calibration_curve
# from report_route.graphs import (
#     plot_anomaly_ranking,
#     plot_anomaly_score_distribution,
#     plot_calibration_curve,
#     plot_confusion_matrix,
#     plot_feature_summary,
#     plot_ks_curve,
#     plot_pr_curve,
#     plot_roc_curve,
#     plot_shap_summary,
#     plot_summary,
#     plot_timeline,
#     plot_training_validation_loss
# )
from database import get_db
from model import ModelConfiguration, ModelVersion, DataFile, ModelType
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import json
from spark.spark_config import get_spark_session
from fastapi.responses import FileResponse
import os
import tempfile


router = APIRouter(prefix="/report", tags=["Report"])

@router.post("/customer-dashboard")
def generate_customer_dashboard_report(payload: ReportPayload):

    buffer = BytesIO()
    filename = f"Finsentinel_Report_{payload.customer_id}_{str(uuid.uuid4())}.pdf"

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=48,
    )

    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="CoverTitle",
        fontSize=15,
        textColor=colors.white,
        alignment=1,
        leading=20,
        spaceAfter=6,
        wordWrap="CJK"
    ))

    styles.add(ParagraphStyle(
        name="Cell",
        fontSize=9,
        leading=12,
        wordWrap="CJK"
    ))

    elements = []

    # ============================================================
    # PAGE 1 – COVER
    # ============================================================

    analysis = payload.dashboard_analysis or {}
    txn = analysis.get("transaction_analysis", {})

    model_info = analysis.get("model_info", {})
    model_type = model_info.get("model_type", "").lower()

    fraud_score = as_float(txn.get("raw_score"))
    fraud_prob  = as_float(txn.get("fraud_probability_score"))

    if model_type == "unsupervised":
        risk = risk_level_from_raw_score(fraud_score)
    else:
        risk = risk_level(fraud_prob * 100)

    risk_bg = {
        "LOW": colors.HexColor("#16a34a"),     # green
        "MEDIUM": colors.HexColor("#f59e0b"),  # amber
        "HIGH": colors.HexColor("#dc2626"),    # red
    }[risk]

    styles.add(ParagraphStyle(
        name="CoverTitleMain",
        fontSize=22,
        alignment=1,
        spaceAfter=24,
        leading=26,
        textColor=colors.HexColor("#0f172a")
    ))

    styles.add(ParagraphStyle(
        name="CoverText",
        fontSize=14,
        alignment=1,
        spaceAfter=14,
        leading=18,
        textColor=colors.HexColor("#1f2937")
    ))

    styles.add(ParagraphStyle(
        name="RiskBadge",
        fontSize=14,
        alignment=1,
        textColor=colors.white,
        leading=18
    ))

    # vertical centering
    elements.append(Spacer(1, 200))

    # Title
    elements.append(
        Paragraph("Finsentinel Alert Analysis Report", styles["CoverTitleMain"])
    )

    # Customer ID
    elements.append(
        Paragraph(f"Customer Id: <b>{payload.customer_id}</b>", styles["CoverText"])
    )

    # Risk badge (background ONLY here)
    risk_table = Table(
        [[Paragraph(f"Risk : {risk}", styles["RiskBadge"])]],
        colWidths=[260],
        rowHeights=[34]
    )

    risk_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), risk_bg),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))

    elements.append(risk_table)
    elements.append(Spacer(1, 16))

    # Fraud score (RAW SCORE, not percentage)
    elements.append(
        Paragraph(
            f"Fraud score: <b>{fraud_score:.4f}</b>",
            styles["CoverText"]
        )
    )

    elements.append(PageBreak())

    # ============================================================
    # ALERT DETAILS (WRAPPED)
    # ============================================================

    if payload.alert_details:
        elements.append(Paragraph("Alert Details", styles["Heading2"]))

        rows = [
            [Paragraph(str(k), styles["Cell"]),
             Paragraph(str(v), styles["Cell"])]
            for k, v in payload.alert_details.items()
        ]

        for i in range(0, len(rows), 26):
            table = Table(rows[i:i+26], colWidths=[240, 300])
            table.setStyle(TableStyle([
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]))
            elements.append(table)
            elements.append(PageBreak())

    # ============================================================
    # RISK ANALYSIS
    # ============================================================

    if analysis:
        elements.append(Paragraph("Risk Analysis", styles["Heading2"]))

        probs = analysis.get("probabilities")
        if probs:
            elements.append(Image(fig_to_img(plot_summary(probs)), 450, 220))

        features = analysis.get("top_risk_factors", [])
        if features:
            elements.append(Spacer(1, 12))
            elements.append(Image(fig_to_img(plot_feature_summary(features)), 460, 260))

            table = Table(
                [["Feature", "Contribution %"]] +
                [[Paragraph(f["feature"], styles["Cell"]),
                  Paragraph(f"{f['contribution_percentage']}%", styles["Cell"])]
                 for f in features],
                colWidths=[300, 160]
            )

            table.setStyle(TableStyle([
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
            ]))
            elements.append(Spacer(1, 8))
            elements.append(table)

        elements.append(PageBreak())

    # ============================================================
    # CUSTOMER DETAILS (WRAPPED)
    # ============================================================

    fraud_block = payload.fraud_statistics or {}
    cust = fraud_block.get("customer", {}).get("customer_data")

    if cust:
        elements.append(Paragraph("Customer Details", styles["Heading2"]))

        table = Table(
            [[Paragraph(k.replace("_", " ").title(), styles["Cell"]),
              Paragraph(str(v), styles["Cell"])]
             for k, v in cust.items()],
            colWidths=[220, 300]
        )

        table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))

        elements.append(table)
        elements.append(PageBreak())

    # ============================================================
    # FRAUD STATISTICS (TABLE)
    # ============================================================

    fraud = fraud_block.get("fraud")
    if fraud:
        elements.append(Paragraph("Fraud Statistics", styles["Heading2"]))

        for section in ["overall_statistics", "received_transactions", "sent_transactions"]:
            block = fraud.get(section)
            if block:
                elements.append(Paragraph(section.replace("_", " ").title(), styles["Heading3"]))
                table = Table(
                    [[Paragraph(k.replace("_", " ").title(), styles["Cell"]),
                      Paragraph(str(v), styles["Cell"])]
                     for k, v in block.items()],
                    colWidths=[300, 200]
                )
                table.setStyle(TableStyle([
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ]))
                elements.append(table)
                elements.append(Spacer(1, 8))

        elements.append(PageBreak())

    # ============================================================
    # TIMELINE
    # ============================================================

    if payload.timeline:
        elements.append(Paragraph("Transaction Timeline", styles["Heading2"]))
        elements.append(Image(fig_to_img(plot_timeline(payload.timeline)), 460, 250))

    # ============================================================
    # BUILD
    # ============================================================

    doc.build(elements, onFirstPage=watermark, onLaterPages=watermark)

    buffer.seek(0)
    return Response(
        content=buffer.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# @router.post("/model-performance/{model_id}", response_model=None)
# def generate_model_performance_report(
#     model_id: int,
#     db: Session = Depends(get_db)
# ):
#     model = db.query(ModelConfiguration).filter(
#         ModelConfiguration.id == model_id
#     ).first()
#     if not model:
#         raise HTTPException(status_code=404, detail="Model not found")

#     data = db.query(DataFile).filter(
#         DataFile.model_config_id == model_id
#     ).first()
#     if not data:
#         raise HTTPException(status_code=404, detail="Data file not found")

#     column_info = json.loads(data.columns_info)
#     feature_cols = list(column_info.keys())
#     label_col = model.target_column

#     spark = get_spark_session()
#     df = load_dataframe(data.file_path, data.file_type)
#     df = df.select(feature_cols + ([label_col] if label_col else []))
#     pdf = df.toPandas()

#     X = pdf[feature_cols].values
#     y = pdf[label_col].values if label_col else None

#     session = ort.InferenceSession(
#         model.model_path,
#         providers=["CPUExecutionProvider"]
#     )

#     input_name = session.get_inputs()[0].name

#     def onnx_predict(X_batch):
#         outputs = session.run(None, {input_name: X_batch})
#         if outputs[0].ndim == 2:
#             return outputs[0][:, 1]
#         return outputs[0]

#     metrics = {}
#     if model.model_type == "SUPERVISED" and y is not None:
#         probs = onnx_predict(X)
#         preds = (probs >= 0.5).astype(int)
#         metrics["accuracy"] = float(accuracy_score(y, preds))
#         metrics["roc_auc"] = float(roc_auc_score(y, probs))

#     shap_result = compute_shap_summary(
#         session=session,
#         X_explain=X,
#         input_names=feature_cols,
#         is_supervised=model.model_type == "SUPERVISED",
#         real_data=pdf[feature_cols]
#     )

#     shap_plot_payload = {
#         "features": list(shap_result["feature_importance"].keys()),
#         "importance": list(shap_result["feature_importance"].values())
#     }

#     buffer = BytesIO()
#     filename = f"Model_Report_{model_id}_{uuid.uuid4().hex}.pdf"

#     doc = SimpleDocTemplate(
#         buffer,
#         pagesize=A4,
#         leftMargin=36,
#         rightMargin=36,
#         topMargin=36,
#         bottomMargin=48,
#     )

#     styles = getSampleStyleSheet()
#     elements = []

#     elements.append(Paragraph("Model Performance Report", styles["Title"]))
#     elements.append(Spacer(1, 12))

#     if metrics:
#         table = Table(
#             [["Metric", "Value"]] +
#             [[k.upper(), f"{v:.4f}"] for k, v in metrics.items()],
#             colWidths=[200, 200]
#         )
#         table.setStyle(TableStyle([
#             ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
#             ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
#         ]))
#         elements.append(table)
#         elements.append(PageBreak())

#     shap_plot = plot_shap_summary(shap_plot_payload)

#     if isinstance(shap_plot, BytesIO):
#         shap_img = shap_plot
#     else:
#         shap_img = fig_to_img(shap_plot)

#     elements.append(Paragraph("SHAP Feature Importance", styles["Heading2"]))
#     elements.append(Image(shap_img, 460, 300))

#     doc.build(elements, onFirstPage=watermark, onLaterPages=watermark)

#     buffer.seek(0)
#     return Response(
#         content=buffer.read(),
#         media_type="application/pdf",
#         headers={
#             "Content-Disposition": f"inline; filename={filename}"
#         }
#     )


def as_float(value, default=0.0):
    if value is None:
        return default
    if isinstance(value, list):
        return float(value[0]) if value else default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default
    
def get_model_and_version(db: Session, model_id: int):
    model_cfg = (
        db.query(ModelConfiguration)
        .filter(ModelConfiguration.id == model_id)
        .first()
    )

    if not model_cfg:
        raise HTTPException(404, "Model not found")

    version = None

    # Only fetch version if model is SUPERVISED
    if model_cfg.model_type == ModelType.SUPERVISED:
        version = (
            db.query(ModelVersion)
            .filter(ModelVersion.model_config_id == model_id)
            .order_by(ModelVersion.version_number.desc())
            .first()
        )

        if not version:
            raise HTTPException(404, "Model version not found")

    return model_cfg, version


def load_training_data(db, model_config_id):
    spark = get_spark_session()
    data_file = (
        db.query(DataFile)
        .filter(DataFile.model_config_id == model_config_id)
        .order_by(DataFile.uploaded_at.desc())
        .first()
    )
    if not data_file:
        raise HTTPException(404, "Training data not found")

    path = data_file.file_path.lower()
    if path.endswith(".parquet"):
        return spark.read.parquet(data_file.file_path)
    elif path.endswith(".csv"):
        return spark.read.option("header", "true").option("inferSchema", "true").csv(data_file.file_path)
    else:
        raise HTTPException(400, "Unsupported data format")


# =====================================================
# PLOTTING
# =====================================================
def save_plot(fig_fn, filename):
    fig_fn()
    plt.savefig(filename)
    plt.close()


def normalize_binary_probs(probs: np.ndarray) -> np.ndarray:
    """
    Ensure probabilities are shape (N,) for positive class
    """
    probs = np.asarray(probs)

    # Case 1: (N, 2)
    if probs.ndim == 2 and probs.shape[1] == 2:
        return probs[:, 1]

    # Case 2: (2, N)  <-- THIS IS YOUR BUG
    if probs.ndim == 2 and probs.shape[0] == 2:
        return probs[1, :]

    # Case 3: already (N,)
    if probs.ndim == 1:
        return probs

    raise ValueError(f"Unexpected probability shape: {probs.shape}")

# def run_onnx_batch(session, X: pd.DataFrame, input_names: list) -> np.ndarray:
#     feed = {}

#     # Case 1: single tensor input (most sklearn → ONNX exports)
#     if len(input_names) == 1:
#         feed[input_names[0]] = X.values.astype(np.float32)

#     # Case 2: multiple scalar inputs
#     else:
#         for name in input_names:
#             feed[name] = X[[name]].values.astype(np.float32)

#     outputs = session.run(None, feed)
#     return outputs

def run_onnx_rowwise(session, X: pd.DataFrame, input_names: list) -> np.ndarray:
    """
    Guaranteed-safe inference for ONNX models with fixed batch size = 1
    """
    outputs_all = []

    available_cols = set(X.columns)

    valid_inputs = [name for name in input_names if name in available_cols]

    if not valid_inputs:
        raise RuntimeError(
            f"No matching ONNX inputs found in dataframe. "
            f"ONNX expects {input_names}, but dataframe has {list(available_cols)}"
        )

    for i in range(len(X)):
        row = X.iloc[[i]]
        feed = {}

        if len(valid_inputs) == 1:
            feed[valid_inputs[0]] = row[valid_inputs[0]].values.astype(np.float32)
        else:
            for name in valid_inputs:
                feed[name] = row[[name]].values.astype(np.float32)

        outputs = session.run(None, feed)
        outputs_all.append(outputs)

    return outputs_all

def plot_confusion_matrix_colored(cm, labels=("Non-Fraud", "Fraud")):
    total = cm.sum()
    pct = (cm / total) * 100

    fig, ax = plt.subplots(figsize=(5, 4))
    im = ax.imshow(cm, cmap="Blues")

    ax.set_xticks(np.arange(2))
    ax.set_yticks(np.arange(2))
    ax.set_xticklabels(labels)
    ax.set_yticklabels(labels)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title("Confusion Matrix")

    for i in range(2):
        for j in range(2):
            ax.text(
                j, i,
                f"{cm[i,j]}\n({pct[i,j]:.2f}%)",
                ha="center", va="center",
                color="white" if cm[i,j] > cm.max() / 2 else "black",
                fontsize=10, fontweight="bold"
            )

    plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    plt.tight_layout()

def plot_shap_bar(features, shap_vals):
    plt.figure(figsize=(8, max(4, len(features) * 0.4)))
    plt.barh(features, np.abs(shap_vals))
    plt.xlabel("Mean |SHAP Value|")
    plt.tight_layout()

# =====================================================
# SUPERVISED REPORT
# =====================================================
def generate_supervised_report(model_cfg, version, db):
    spark_df = load_training_data(db, model_cfg.id)

    feature_cols = list(json.loads(model_cfg.feature_mappings).keys())
    target_col = model_cfg.target_column
    available_cols = set(spark_df.columns)

    valid_features = [c for c in feature_cols if c in available_cols]
    missing_features = list(set(feature_cols) - set(valid_features))

    if target_col not in available_cols:
        raise HTTPException(
            500,
            f"Target column `{target_col}` not found in training data"
        )

    if len(valid_features) < len(feature_cols) * 0.7:
        raise HTTPException(
            500,
            f"Too many missing features in dataset: {missing_features}"
        )

    # -------------------------------
    # Load only valid columns
    # -------------------------------
    pdf = spark_df.select(valid_features + [target_col]).toPandas()

    X = pdf[valid_features]
    y_true = pdf[target_col].values

    session = create_onnx_session(version.model_path_onnx)
    input_names, output_names = get_session_io_names(session)

    outputs = run_onnx_rowwise(session, X, input_names)
    probs = np.vstack([parse_supervised_outputs(o, output_names)[0] for o in outputs])
    y_prob = normalize_binary_probs(probs)
    y_pred = (y_prob > 0.5).astype(int)

    # ================= METRICS =================
    metrics = [
        ["Accuracy", f"{accuracy_score(y_true, y_pred):.4f}"],
        ["Precision", f"{precision_score(y_true, y_pred):.4f}"],
        ["Recall", f"{recall_score(y_true, y_pred):.4f}"],
        ["F1 Score", f"{f1_score(y_true, y_pred):.4f}"],
        ["ROC AUC", f"{roc_auc_score(y_true, y_prob):.4f}"],
    ]

    cm = confusion_matrix(y_true, y_pred)
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    prec, rec, _ = precision_recall_curve(y_true, y_prob)
    cal_y, cal_x = calibration_curve(y_true, y_prob, n_bins=10)
    ks_stat = np.max(np.abs(tpr - fpr))

    # ================= SHAP =================
    X_explain = X.iloc[[0]].values.astype(np.float32)
    background = create_background_samples(X_explain, input_names, use_real_data=X)
    shap_vals = calculate_shap_values(
        session, X_explain, input_names, background, is_supervised=True
    ).flatten()

    # ================= PLOTS =================
    tmp = tempfile.mkdtemp()

    paths = {
        "cm": os.path.join(tmp, "cm.png"),
        "roc": os.path.join(tmp, "roc.png"),
        "pr": os.path.join(tmp, "pr.png"),
        "ks": os.path.join(tmp, "ks.png"),
        "cal": os.path.join(tmp, "cal.png"),
        "shap": os.path.join(tmp, "shap.png"),
    }

    save_plot(lambda: plot_confusion_matrix_colored(cm), paths["cm"])
    save_plot(lambda: plt.plot(fpr, tpr), paths["roc"])
    save_plot(lambda: plt.plot(rec, prec), paths["pr"])
    save_plot(lambda: plt.plot(fpr, tpr - fpr), paths["ks"])
    save_plot(lambda: plt.plot(cal_x, cal_y, marker="o"), paths["cal"])
    save_plot(lambda: plot_shap_bar(feature_cols, shap_vals), paths["shap"])

    # ================= PDF =================
    pdf_path = os.path.join(tmp, "model_performance.pdf")
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="CenterTitle", alignment=1, fontSize=22))
    styles.add(ParagraphStyle(name="CenterText", alignment=1, fontSize=14))

    doc = SimpleDocTemplate(pdf_path, pagesize=A4)
    elements = []

    # Cover Page
    cover_table = Table(
        [
            [Paragraph("Finsentinel AI", styles["CenterTitle"])],
            [Spacer(1, 12)],
            [Paragraph("Model Stats", styles["CenterText"])],
            [Spacer(1, 24)],
            [Paragraph(f"Model ID : {model_cfg.id}", styles["CenterText"])],
            [Spacer(1, 8)],
            [Paragraph(f"Model Type : Supervised", styles["CenterText"])],
            [Spacer(1, 8)],
            [Paragraph(f"Version Number : {version.version_number}", styles["CenterText"])],
        ],
        colWidths=[450],
        rowHeights=None
    )

    cover_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    elements.append(Spacer(1, 150))   # Safe top spacing
    elements.append(cover_table)
    elements.append(PageBreak())

    # Metrics Table
    elements.append(Paragraph("Performance Metrics", styles["Heading2"]))
    elements.append(Table([["Metric", "Value"]] + metrics,
        style=[("GRID", (0,0), (-1,-1), 0.5, colors.grey)]))
    elements.append(PageBreak())

    # Confusion Matrix
    elements.append(Paragraph("Confusion Matrix", styles["Heading2"]))
    elements.append(Image(paths["cm"], 420, 320))
    elements.append(PageBreak())

    # Curves
    for title, key in [
        ("ROC Curve", "roc"),
        ("Precision-Recall Curve", "pr"),
        ("KS Curve", "ks"),
        ("Calibration Curve", "cal"),
    ]:
        elements.append(Paragraph(title, styles["Heading2"]))
        elements.append(Image(paths[key], 420, 300))
        elements.append(PageBreak())

    # SHAP
    elements.append(Paragraph("SHAP Summary", styles["Heading2"]))
    elements.append(Image(paths["shap"], 420, 300))

    # SHAP Contribution Table
    total = np.abs(shap_vals).sum()
    shap_table = [["Feature", "Contribution %"]] + [
        [feature_cols[i], f"{(abs(shap_vals[i])/total)*100:.2f}%"]
        for i in range(len(feature_cols))
    ]
    elements.append(Spacer(1, 12))
    elements.append(Table(shap_table,
        style=[("GRID", (0,0), (-1,-1), 0.5, colors.grey)]))

    doc.build(elements, onFirstPage=watermark, onLaterPages=watermark)
    return pdf_path


# =====================================================
# UNSUPERVISED REPORT (ISOLATION FOREST)
# =====================================================
def generate_unsupervised_report(model_cfg, version, db) -> str:
    # -------------------------------
    # Load data
    # -------------------------------
    spark_df = load_training_data(db, model_cfg.id)

    feature_info = json.loads(model_cfg.feature_mappings)
    feature_cols = list(feature_info.keys())

    pdf = spark_df.select(feature_cols).toPandas()

    # -------------------------------
    # Resolve ONNX path (version optional)
    # -------------------------------
    onnx_path = (
        version.model_path_onnx
        if version is not None
        else model_cfg.model_path
    )

    session = create_onnx_session(onnx_path)
    input_names, output_names = get_session_io_names(session)

    # -------------------------------
    # ONNX inference (ROW-WISE SAFE)
    # -------------------------------
    outputs = run_onnx_rowwise(session, pdf, input_names)

    # -------------------------------
    # FIX: parse outputs row-by-row
    # -------------------------------
    scores_all = []

    for out in outputs:
        _, score, _ = parse_unsupervised_outputs(out, output_names)
        scores_all.append(score)

    scores = np.array(scores_all).reshape(-1)
    scores = normalize_scores_to_probability(scores)

    if scores.size == 0:
        raise HTTPException(500, "No anomaly scores generated from model")

    # -------------------------------
    # Threshold
    # -------------------------------
    threshold = np.percentile(scores, 95)
    anomaly_count = int(np.sum(scores >= threshold))

    # -------------------------------
    # SHAP (single-row explanation)
    # -------------------------------
    X_explain = pdf.iloc[[0]].values.astype(np.float32)

    background = create_background_samples(
        X_explain,
        input_names,
        use_real_data=pdf
    )

    shap_vals = calculate_shap_values(
        session,
        X_explain,
        input_names,
        background,
        is_supervised=False
    ).flatten()

    # -------------------------------
    # Plots
    # -------------------------------
    tmpdir = tempfile.mkdtemp()

    score_img = os.path.join(tmpdir, "score_distribution.png")
    shap_img = os.path.join(tmpdir, "shap_summary.png")

    save_plot(lambda: plt.hist(scores, bins=50), score_img)
    save_plot(lambda: plot_shap_bar(feature_cols, shap_vals), shap_img)

    # -------------------------------
    # PDF
    # -------------------------------
    pdf_path = os.path.join(tmpdir, "unsupervised_model_report.pdf")

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="CenterTitle", alignment=1, fontSize=22))
    styles.add(ParagraphStyle(name="CenterText", alignment=1, fontSize=14))

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=48,
    )

    elements = []

    # -------------------------------
    # Cover Page
    # -------------------------------
    cover_table = Table(
        [
            [Paragraph("Finsentinel AI", styles["CenterTitle"])],
            [Spacer(1, 12)],
            [Paragraph("Model Stats", styles["CenterText"])],
            [Spacer(1, 24)],
            [Paragraph(f"Model ID : {model_cfg.id}", styles["CenterText"])],
            [Spacer(1, 8)],
            [Paragraph("Model Type : Unsupervised", styles["CenterText"])],
            [Spacer(1, 8)],
            [Paragraph("Version Number : 1", styles["CenterText"])],
        ],
        colWidths=[450],
    )

    cover_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    elements.append(Spacer(1, 150))
    elements.append(cover_table)
    elements.append(PageBreak())

    # -------------------------------
    # Metrics
    # -------------------------------
    elements.append(Paragraph("Anomaly Detection Metrics", styles["Heading2"]))

    metrics_table = [
        ["Metric", "Value"],
        ["Total Samples", f"{len(scores)}"],
        ["Anomaly Threshold (95%)", f"{threshold:.4f}"],
        ["Anomalies Detected", f"{anomaly_count}"],
    ]

    elements.append(
        Table(
            metrics_table,
            colWidths=[260, 140],
            style=[
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
            ],
        )
    )
    elements.append(PageBreak())

    # -------------------------------
    # Score Distribution
    # -------------------------------
    elements.append(Paragraph("Anomaly Score Distribution", styles["Heading2"]))
    elements.append(Image(score_img, 420, 300))
    elements.append(PageBreak())

    # -------------------------------
    # SHAP Summary
    # -------------------------------
    elements.append(Paragraph("SHAP Feature Importance", styles["Heading2"]))
    elements.append(Image(shap_img, 420, 300))

    # -------------------------------
    # SHAP Contribution Table
    # -------------------------------
    total = np.abs(shap_vals).sum()

    shap_table = [["Feature", "Contribution %"]] + [
        [feature_cols[i], f"{(abs(shap_vals[i]) / total) * 100:.2f}%"]
        for i in range(len(feature_cols))
    ]

    elements.append(Spacer(1, 12))
    elements.append(
        Table(
            shap_table,
            colWidths=[300, 140],
            style=[
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
            ],
        )
    )

    anomaly_mask = scores >= threshold

    if anomaly_mask.sum() == 0:
        anomaly_ranges = []
    else:
        anomaly_df = pdf.loc[anomaly_mask]

        anomaly_ranges = [
            [
                feature,
                f"{anomaly_df[feature].min():.4f}",
                f"{anomaly_df[feature].max():.4f}",
            ]
            for feature in feature_cols
            if pd.api.types.is_numeric_dtype(anomaly_df[feature])
        ]
    # -------------------------------
    # Feature Range Table (Anomalies)
    # -------------------------------
    elements.append(PageBreak())
    elements.append(
        Paragraph(
            "Feature Value Ranges for Anomalous Transactions",
            styles["Heading2"]
        )
    )

    if anomaly_ranges:
        range_table = (
            [["Feature", "Min Value", "Max Value"]] + anomaly_ranges
        )

        elements.append(
            Table(
                range_table,
                colWidths=[220, 120, 120],
                style=[
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ],
            )
        )
    else:
        elements.append(
            Paragraph(
                "No anomalies detected above the defined threshold.",
                styles["BodyText"]
            )
        )
    # -------------------------------
    # Build
    # -------------------------------
    doc.build(elements, onFirstPage=watermark, onLaterPages=watermark)

    return pdf_path


@router.post("/model-performance/{model_id}")
def get_model_performance_report(
    model_id: int,
    db: Session = Depends(get_db)
):
    model_cfg, version = get_model_and_version(db, model_id)

    if model_cfg.model_type == ModelType.SUPERVISED:
        pdf_path = generate_supervised_report(model_cfg, version, db)
    else:
        pdf_path = generate_unsupervised_report(model_cfg, version, db)

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"model_{model_id}_performance_report_{str(uuid.uuid4())}.pdf"
    )