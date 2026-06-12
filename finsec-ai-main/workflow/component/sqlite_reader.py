from pyspark.sql import SparkSession
import logging
import sys
import json
import os
import uuid

# Configure logging to STDERR only (not STDOUT)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr)  # Only log to stderr, not stdout
    ]
)
logger = logging.getLogger("Sqlite_reader")
if len(sys.argv) < 2:
    logger.error("No JSON file path provided")
    sys.exit(1)

json_file_path = sys.argv[1]
logger = logging.getLogger("Sqlite_reader")
try:
    # Initialize Spark session
    spark = SparkSession.builder \
        .appName("Sqlite_reader") \
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


    if not input_path:
        logger.error("No input Parquet path provided")
        raise ValueError("No input Parquet path provided")

    if not os.path.exists(input_path):
        logger.error(f"Input Parquet file does not exist: {input_path}")
        raise FileNotFoundError(f"Input Parquet file does not exist: {input_path}")

    logger.info(f"Reading Parquet file: {input_path}")
    
    jdbc_url = f"jdbc:sqlite:{input_path}"
    df = spark.read.format("jdbc") \
        .options(driver="org.sqlite.JDBC",
                dbtable=config['table_name'],
                url=jdbc_url) \
        .load()

    logger.info(f"Parquet file read successfully. Row count: {df.count()}")

    logger.info(f"Data written to {config['table_name']} successfully")
    
    try:
        os.makedirs("Outfiles", exist_ok=True)
    except OSError as e:
        if e.errno != os.errno.EEXIST:
            raise
                    
    par_dir = "Outfiles"
    par_name = f"{str(uuid.uuid4())}.parquet"
    par_path = os.path.join(par_dir, par_name)
    abs_par_path = os.path.abspath(par_path)
    df.write.mode("overwrite").parquet(abs_par_path)
    print(abs_par_path)
except Exception as e:
    logger.error(f"Error processing Parquet file: {e}")
    raise
finally:
    spark.stop()
    logger.info("Spark session stopped")