from pyspark.sql import SparkSession
import uuid
import os
import json
import sys

json_file_path = sys.argv[1]

try:
    with open(json_file_path, 'r') as f:
        args = json.load(f)
except json.JSONDecodeError as e:
    raise
except FileNotFoundError as e:
    raise
config = args["config"]
id_value = args["id"]
results = args["results"]
parent_result = config.get("parent_result", {})

spark = SparkSession.builder.appName("CSV2ParquetActivity").config("spark.executor.memory", "2g") .config("spark.executor.cores", "2").config("spark.driver.memory", "2g").getOrCreate()
               
current_dir = os.getcwd()
required_keys = ["output_path"]
missing = [k for k in required_keys if k not in config]
if missing:
    raise ValueError(f"Missing Column in config keys: {missing}")
    
try:
    input_path = config["csv_path"]['filePath']
except:
    parent_node = parent_result['mappings']['parquet_path']
    input_path = results[parent_node] if results else None

#Pyspark operation                        
df = spark.read.csv(input_path, header=True, inferSchema=True)
        
try:
    os.makedirs("Outfiles", exist_ok=True)
except OSError as e:
    if e.errno != os.errno.EEXIST:
        raise
                
par_name = f"{str(uuid.uuid4())}.parquet"
par_path = os.path.join(config["output_path"]['filePath'], par_name)
abs_par_path = os.path.abspath(par_path)
df.write.mode("overwrite").parquet(abs_par_path)
print(abs_par_path)
spark.stop()