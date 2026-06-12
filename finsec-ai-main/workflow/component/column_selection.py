from pyspark.sql import SparkSession
import uuid
import os
import json
import sys
import logging

# Configure logging to STDERR only (not STDOUT)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr)  # Only log to stderr, not stdout
    ]
)
logger = logging.getLogger("columnSelector")

if len(sys.argv) < 2:
    logger.error("No JSON file path provided")
    sys.exit(1)

json_file_path = sys.argv[1]
logger.info(f"Reading arguments from: {json_file_path}")

try:
    with open(json_file_path, 'r') as f:
        args = json.load(f)
except json.JSONDecodeError as e:
    logger.error(f"Failed to parse JSON: {e}")
    raise
except FileNotFoundError as e:
    logger.error(f"JSON file not found: {e}")
    raise
except Exception as e:
    logger.error(f"Unexpected error reading JSON: {e}")
    raise

config = args.get("config", {})
results = args.get("results", {})
id_value = args.get("id")
parent_result = config.get("parent_result", {})

logger.info(f"Arguments: config={config}, id={id_value}, results={results}")

try:
    # Initialize Spark session
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
    # Get input Parquet path
    input_path = config.get("parquet_path", {}).get("filePath")
    if not input_path:
        parent_node = parent_result['mappings']['parquet_path']
        input_path = results[parent_node] if results else None

    if not input_path:
        logger.error("No input Parquet path provided")
        raise ValueError("No input Parquet path provided")

    if not os.path.exists(input_path):
        logger.error(f"Input Parquet file does not exist: {input_path}")
        raise FileNotFoundError(f"Input Parquet file does not exist: {input_path}")

    logger.info(f"Reading Parquet file: {input_path}")
    df = spark.read.parquet(input_path)
    logger.info(f"Parquet file read successfully. Row count: {df.count()}")
    df1 = df[config['columns']]
    filename = f"parquet_{id_value}.parquet"
    parquet_path = os.path.join(os.getcwd(), filename)
    abs_db_path = os.path.abspath(parquet_path)
    df1.write.mode("overwrite").parquet(abs_db_path)
    logger.info(f"Data written to {abs_db_path} successfully")
    
    print(abs_db_path)
    
except Exception as e:
    logger.error(f"Error processing Parquet file: {e}")
    raise
finally:
    spark.stop()
    logger.info("Spark session stopped")
spark.stop()