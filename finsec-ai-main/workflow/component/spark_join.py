from pyspark.sql import SparkSession
from pyspark.sql.functions import expr
import uuid
import os
import json
import sys

json_file_path = sys.argv[1]
with open(json_file_path, 'r') as f:
    args = json.load(f)

# print(args)
config = args["config"]
results = args["results"]

# source_node_ids = config["parent_result"]["sourceNodeId"]

# if not isinstance(source_node_ids, list) or len(source_node_ids) != 2:
#     raise ValueError(f"Join requires exactly two source nodes, got: {source_node_ids}")

# left_node, right_node = source_node_ids

# input_path1 = results.get(left_node)
# input_path2 = results.get(right_node)

# if not input_path1 or not input_path2:
#     raise KeyError(
#         f"Could not find parquet paths for nodes: {left_node}, {right_node}"
#     )

# if isinstance(source_node_ids, list):
#     if len(source_node_ids) < 2:
#         raise ValueError(
#             f"Join requires exactly two source nodes, got: {source_node_ids}"
#         )
#     left_node, right_node = [source_node_ids[-2], source_node_ids[-1]]

# elif isinstance(source_node_ids, str):
#     right_node = source_node_ids

#     candidate_nodes = [
#         k for k in results.keys()
#         if k != right_node
#     ]
#     # print(candidate_nodes)
#     # if len(candidate_nodes) != 1:
#     #     raise ValueError(
#     #         f"Unable to infer second join input. "
#     #         f"sourceNodeId={right_node}, available results={list(results.keys())}, Cadnidate_node={candidate_nodes}"
#     #     )

#     left_node = candidate_nodes[-1]

# else:
#     raise TypeError(
#         f"Invalid sourceNodeId type: {type(source_node_ids)}"
#     )



parent_result = config.get("parent_result", {})

if not parent_result.get("isPreviousOutput"):
    raise ValueError("parent_result.isPreviousOutput must be true")

mappings = parent_result.get("mappings")

if not isinstance(mappings, dict) or len(mappings) < 2:
    raise ValueError(
        f"Join requires at least two parent mappings, got: {mappings}"
    )

# parent_nodes = list(mappings.values())

left_node = mappings['parquet_path_1']
right_node = mappings['parquet_path_2']

input_path1 = results.get(left_node)
input_path2 = results.get(right_node)

if not input_path1 or not input_path2:
    raise KeyError(
        f"Could not find parquet paths for nodes: {left_node}, {right_node}"
    )

spark = SparkSession.builder.appName("Spark Join").getOrCreate()

df1 = spark.read.parquet(input_path1).alias("left")
df2 = spark.read.parquet(input_path2).alias("right")

join_expr = config["method"]
join_type = config["condition"]


# Determine common columns automatically (if needed)
common_cols = list(set(df1.columns).intersection(df2.columns))

print(join_type,join_expr)
joined_df = df1.join(df2, on=common_cols, how=join_type)

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

joined_df.write.mode("overwrite").parquet(out_path)

print(out_path)

spark.stop()