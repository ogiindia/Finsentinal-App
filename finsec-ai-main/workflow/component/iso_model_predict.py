from pyspark.sql import SparkSession
from pyspark.sql.functions import pandas_udf
from pyspark.sql.types import FloatType
import pandas as pd
import onnxruntime as rt
import sys
import json
import uuid
import os

json_file_path = sys.argv[1]

try:
    with open(json_file_path, 'r') as f:
        args = json.load(f)
except json.JSONDecodeError as e:
    raise
except FileNotFoundError as e:
    raise

config = args.get("config", {})
results = args.get("results", {})
parent_result = config.get("parent_result", {})

try:
    input_path = args["parquet_path"]['filePath']
except KeyError:
    parent_node = parent_result['mappings']['parquet_path']
    input_path = results[parent_node] if results else None
required_keys = ["output_path"]
missing = [k for k in required_keys if k not in config]
if missing:
    raise ValueError(f"Missing Column in config keys: {missing}")

spark = SparkSession.builder.appName("IForestScoring").config("spark.sql.execution.arrow.pyspark.enabled", "true").getOrCreate()

df = spark.read.parquet(input_path)
feature_cols = [col for col in df.columns if col != 'id']
onnx_model_path = config['model_path']['filePath']

@pandas_udf(FloatType())
def predict_anomaly_score(*cols):
    import numpy as np
    X = np.stack([c.values.astype(np.float32) for c in cols], axis=1)
    if not hasattr(predict_anomaly_score, "sess"):
        predict_anomaly_score.sess = rt.InferenceSession(onnx_model_path)
        predict_anomaly_score.input_name = predict_anomaly_score.sess.get_inputs()[0].name
        predict_anomaly_score.output_names = [o.name for o in predict_anomaly_score.sess.get_outputs()]
    sess = predict_anomaly_score.sess
    input_name = predict_anomaly_score.input_name
    output_names = predict_anomaly_score.output_names
    outputs = sess.run(None, {input_name: X})
    scores_idx = 1 if 'scores' in output_names[1].lower() else 0
    return pd.Series(outputs[scores_idx].ravel())

df = df.withColumn(
    "anomaly_score",
    predict_anomaly_score(*[df[c] for c in feature_cols])
)
# if isinstance(output_path, dict):
#     output_path = output_path.get('filePath', '')  # Or 'fileName' if that's what you want
output_path = os.path.join(config["output_path"]['filePath'], f"{str(uuid.uuid4())}_anomaly_scores.csv")

df.write.csv(output_path, header=True, mode=config.get("output_mode", "overwrite"))
print(output_path)
spark.stop()