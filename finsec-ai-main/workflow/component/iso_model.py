from pyspark.sql import SparkSession
from sklearn.ensemble import IsolationForest
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import uuid
import sys
import json
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
spark = SparkSession.builder.appName("IForestTrain").getOrCreate()

df = spark.read.parquet(input_path)
feature_cols = [col for col in df.columns if col != 'id']
X = df.select(*feature_cols).toPandas().values.astype('float32')

clf = IsolationForest(contamination=float(config.get('contamination', 0.001)), random_state=int(config.get('random_state', 42)))
clf.fit(X)
output_path = config.get("output_path")
if isinstance(output_path, dict):
    output_path = output_path.get("filePath") or output_path.get("fileName")
# if not output_path:
#     output_path = f"/home/fis/MLDashboard/MLDashboard/Backend/model/"
model_path = os.path.join(output_path, f"{str(uuid.uuid4())}_isolation_forest.onnx")
initial_type = [('input', FloatTensorType([None, X.shape[1]]))]
onnx_model = convert_sklearn(clf, initial_types=initial_type, target_opset={"":12, "ai.onnx.ml": 3})
with open(model_path, "wb") as f:
    f.write(onnx_model.SerializeToString())

print(model_path)
spark.stop()