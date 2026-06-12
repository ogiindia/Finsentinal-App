import uuid
from pyspark.sql import SparkSession
import logging
import sys
import json
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)
logger = logging.getLogger("Sqlite_reader")

if len(sys.argv) < 2:
    logger.error("No JSON file path provided")
    sys.exit(1)

json_file_path = sys.argv[1]

try:
    spark = SparkSession.builder \
        .appName("ColumnSelector") \
        .config("spark.executor.memory", "2g") \
        .config("spark.executor.cores", "2") \
        .config("spark.driver.memory", "2g") \
        .getOrCreate()
    logger.info("Spark session initialized")
except Exception as e:
    logger.error(f"Failed to initialize Spark session: {e}")
    raise

try:
    with open(json_file_path, 'r') as f:
        args = json.load(f)
except Exception as e:
    logger.error(f"Error reading JSON: {e}")
    raise

config = args.get("config", {})
results = args.get("results", {})
id_value = args.get("id")
parent_result = config.get("parent_result", {})

try:
    def extract_node_id(sourceNodeId):
        if isinstance(sourceNodeId, list):
            if not sourceNodeId:
                return None
            if isinstance(sourceNodeId[0], list):
                return extract_node_id(sourceNodeId[0])
            return sourceNodeId[0]
        return sourceNodeId

    input_path = config.get("upload_parquet", {}).get("filePath")
    if not input_path:
            parent_node = parent_result['mappings']['parquet_path']
            input_path = results.get(parent_node)
            if not input_path or not os.path.exists(input_path):
                raise FileNotFoundError(f"No valid input path found from parent node: {parent_node}")
    else:
        raise FileNotFoundError("No valid input path found from parent nodes!")


    if not input_path or not os.path.exists(input_path):
        raise FileNotFoundError(f"Input Parquet file does not exist: {input_path}")

    output_path = config.get("sqlite_path")
    logger.info(f"Reading Parquet file: {input_path}")
    df = spark.read.parquet(input_path)
    

    logger.info(f"Parquet file read successfully. Row count: {df.count()}")
    df = df.repartition(1)
    logger.info("Repartition completed!")
    logger.info(f"mode: {config.get('mode')}")
    os.makedirs(output_path, exist_ok=True)
    file_path = os.path.join(output_path, f"{str(uuid.uuid4())}.db")
    df.write.format("jdbc") \
        .options(driver="org.sqlite.JDBC",
                 dbtable=config['table_name'],
                 url=f"jdbc:sqlite:{file_path}") \
        .mode(config['mode']) \
        .save()

    logger.info(f"Data written to {config['table_name']} successfully")
    print(file_path)

except Exception as e:
    logger.error(f"Error saving sqlite db: {e}")
    raise
finally:
    spark.stop()
    logger.info("Spark session stopped")
