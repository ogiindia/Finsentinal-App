import matplotlib.pyplot as plt
import numpy as np
from io import BytesIO
from report_route.utils_report import scalar

def plot_summary(prob):
    fig, ax = plt.subplots(figsize=(5, 2.2))
    ax.bar(
    ["Fraud", "Normal"],
    [
        scalar(prob.get("fraud")),
        scalar(prob.get("normal")),
    ], color=["#ef4444", "#10b981"])
    ax.set_ylim(0, 1)
    ax.set_ylabel("Probability")
    ax.set_title("Fraud Probability Summary")
    return fig


def plot_feature_summary(features):
    names = [f["feature"] for f in features]
    vals = [f["contribution_percentage"] for f in features]

    fig, ax = plt.subplots(figsize=(6, 3))
    ax.barh(names, vals, color="#2563eb")
    ax.set_xlabel("Contribution %")
    ax.set_title("Feature Contribution")
    ax.invert_yaxis()
    return fig


def plot_timeline(timeline):
    x = list(range(len(timeline)))
    y = [t.get("score", 0) for t in timeline]

    fig, ax = plt.subplots(figsize=(6, 2.5))
    ax.plot(x, y, marker="o")
    ax.axhline(0, linestyle="--", color="grey")
    ax.set_title("Transaction Risk Timeline")
    ax.set_ylabel("Score")
    return fig

def fig_to_buf(fig):
    buf = BytesIO()
    fig.savefig(buf, dpi=200, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


# ---------------------------------------------------------
# SUPERVISED MODEL GRAPHS
# ---------------------------------------------------------

def plot_confusion_matrix(predictions):
    """
    predictions must contain:
    {
        "y_true": np.array,
        "y_pred": np.array
    }
    """
    y_true = predictions["y_true"]
    y_pred = predictions["y_pred"]

    cm = np.zeros((2, 2), dtype=int)
    for t, p in zip(y_true, y_pred):
        cm[int(t)][int(p)] += 1

    fig, ax = plt.subplots(figsize=(4, 4))
    im = ax.imshow(cm, cmap="Blues")

    for i in range(2):
        for j in range(2):
            ax.text(j, i, cm[i, j], ha="center", va="center")

    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title("Confusion Matrix")
    ax.set_xticks([0, 1])
    ax.set_yticks([0, 1])

    return fig_to_buf(fig)


def plot_roc_curve(predictions):
    y_true = predictions["y_true"]
    y_score = predictions["y_score"]

    thresholds = np.linspace(0, 1, 100)
    tpr, fpr = [], []

    for th in thresholds:
        tp = np.sum((y_score >= th) & (y_true == 1))
        fp = np.sum((y_score >= th) & (y_true == 0))
        fn = np.sum((y_score < th) & (y_true == 1))
        tn = np.sum((y_score < th) & (y_true == 0))

        tpr.append(tp / (tp + fn + 1e-6))
        fpr.append(fp / (fp + tn + 1e-6))

    fig, ax = plt.subplots(figsize=(5, 4))
    ax.plot(fpr, tpr, label="ROC Curve")
    ax.plot([0, 1], [0, 1], linestyle="--", color="grey")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curve")
    ax.legend()

    return fig_to_buf(fig)


def plot_pr_curve(predictions):
    y_true = predictions["y_true"]
    y_score = predictions["y_score"]

    thresholds = np.linspace(0, 1, 100)
    precision, recall = [], []

    for th in thresholds:
        tp = np.sum((y_score >= th) & (y_true == 1))
        fp = np.sum((y_score >= th) & (y_true == 0))
        fn = np.sum((y_score < th) & (y_true == 1))

        precision.append(tp / (tp + fp + 1e-6))
        recall.append(tp / (tp + fn + 1e-6))

    fig, ax = plt.subplots(figsize=(5, 4))
    ax.plot(recall, precision)
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title("Precision-Recall Curve")

    return fig_to_buf(fig)


def plot_ks_curve(predictions):
    y_true = predictions["y_true"]
    y_score = predictions["y_score"]

    sorted_idx = np.argsort(y_score)
    sorted_true = y_true[sorted_idx]

    cum_pos = np.cumsum(sorted_true) / np.sum(sorted_true)
    cum_neg = np.cumsum(1 - sorted_true) / np.sum(1 - sorted_true)

    fig, ax = plt.subplots(figsize=(5, 4))
    ax.plot(cum_pos, label="Cumulative Fraud")
    ax.plot(cum_neg, label="Cumulative Normal")
    ax.set_title("KS Curve")
    ax.legend()

    return fig_to_buf(fig)


def plot_calibration_curve(predictions):
    y_true = predictions["y_true"]
    y_score = predictions["y_score"]

    bins = np.linspace(0, 1, 10)
    bin_ids = np.digitize(y_score, bins)

    avg_pred, avg_true = [], []

    for b in range(1, len(bins)):
        mask = bin_ids == b
        if mask.any():
            avg_pred.append(y_score[mask].mean())
            avg_true.append(y_true[mask].mean())

    fig, ax = plt.subplots(figsize=(5, 4))
    ax.plot(avg_pred, avg_true, marker="o")
    ax.plot([0, 1], [0, 1], linestyle="--")
    ax.set_xlabel("Predicted Probability")
    ax.set_ylabel("Observed Frequency")
    ax.set_title("Calibration Curve")

    return fig_to_buf(fig)


def plot_training_validation_loss(metrics):
    """
    metrics = {
        "train_loss": [...],
        "val_loss": [...]
    }
    """
    fig, ax = plt.subplots(figsize=(5, 4))
    ax.plot(metrics["train_loss"], label="Train Loss")
    ax.plot(metrics["val_loss"], label="Validation Loss")
    ax.set_title("Training vs Validation Loss")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Loss")
    ax.legend()

    return fig_to_buf(fig)


# ---------------------------------------------------------
# SHAP
# ---------------------------------------------------------

def plot_shap_summary(shap_values):
    """
    shap_values = {
        "features": [...],
        "importance": [...]
    }
    """
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.barh(shap_values["features"], shap_values["importance"])
    ax.set_title("SHAP Feature Importance")
    ax.invert_yaxis()

    return fig_to_buf(fig)


# ---------------------------------------------------------
# UNSUPERVISED (ISOLATION FOREST)
# ---------------------------------------------------------

def plot_anomaly_score_distribution(predictions):
    scores = predictions["anomaly_score"]

    fig, ax = plt.subplots(figsize=(5, 4))
    ax.hist(scores, bins=50)
    ax.set_title("Anomaly Score Distribution")
    ax.set_xlabel("Score")
    ax.set_ylabel("Frequency")

    return fig_to_buf(fig)


def plot_anomaly_ranking(predictions):
    scores = np.sort(predictions["anomaly_score"])[::-1]

    fig, ax = plt.subplots(figsize=(5, 4))
    ax.plot(scores)
    ax.set_title("Anomaly Ranking")
    ax.set_xlabel("Rank")
    ax.set_ylabel("Anomaly Score")

    return fig_to_buf(fig)
