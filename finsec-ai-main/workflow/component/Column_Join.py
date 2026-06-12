
from pyspark.sql import SparkSession
from pyspark.sql.types import StringType
from pyspark.sql import DataFrame
from functools import reduce
from pyspark.sql.functions import monotonically_increasing_id
import uuid
import os
import json
import sys

# Usage: spark-submit script.py /path/to/config.json
json_file_path = sys.argv[1]
with open(json_file_path, 'r') as f:
    args = json.load(f)

config = args["config"]
results = args["results"]
print(args)
# -------------------------------------------------------------------
# Resolve source node IDs
# -------------------------------------------------------------------
source_node_ids = config.get("parent_result", {}).get("sourceNodeId")

if isinstance(source_node_ids, list):
    node_ids = source_node_ids

elif isinstance(source_node_ids, str):
    if source_node_ids.upper() == "ALL":
        # Union all results available
        node_ids = list(results.keys())
    else:
        # Single node ID
        node_ids = [source_node_ids]
else:
    raise TypeError(f"Invalid sourceNodeId type: {type(source_node_ids)}")

if not node_ids:
    raise ValueError("No source nodes provided for union")

# Map node IDs to parquet paths
paths = []
for nid in node_ids:
    p = results.get(nid)
    if not p:
        raise KeyError(f"Could not find parquet path for node: {nid}")
    paths.append(p)
print(paths)
# -------------------------------------------------------------------
# Spark
# -------------------------------------------------------------------
spark = SparkSession.builder.appName("Spark Column Join").getOrCreate()


# Read all input Parquet datasets
dfs = [spark.read.parquet(p) for p in paths]

if len(dfs) == 0:
    raise ValueError("No DataFrames were read from provided paths")

# -------------------------------------------------------------------
# Union strategy
# -------------------------------------------------------------------
# Config options (optional, with sensible defaults)
# If your inputs are single-column and you want them aligned to a common name/type:

dfs = [df.withColumn("row_id", monotonically_increasing_id()) for df in dfs]

df_final = reduce(
    lambda left, right: left.join(right, on="row_id"),
    dfs
).drop("row_id")



# output_base = config["output_path"]["filePath"]
output_path_cfg = config["output_path"]

if isinstance(output_path_cfg, dict):
    output_base = output_path_cfg.get("filePath")
elif isinstance(output_path_cfg, str):
    output_base = output_path_cfg
else:
    raise TypeError(
        f"Invalid output_path type: {type(output_path_cfg)}"
    )

if not output_base:
    raise ValueError("Output path is empty or undefined")
out_path = os.path.join(
    output_base,
    f"{uuid.uuid4()}_joined_output.parquet"
)

# df_final.write.mode("overwrite").parquet()
df_final.write.mode("overwrite").parquet(out_path)

print(out_path)

spark.stop()