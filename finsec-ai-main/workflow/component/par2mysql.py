from pyspark.sql import SparkSession
import uuid
import os
import json
import sys
import logging

# Configure logging to avoid duplicates
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("par2mysql")
logger.propagate = False

def main():
    if len(sys.argv) < 2:
        logger.error("No JSON file path provided")
        sys.exit(1)

    json_file_path = sys.argv[1]
    logger.info(f"Reading arguments from: {json_file_path}")

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

    logger.info(f"Arguments: config={config}, id={id_value}, results={results}")

    try:
        # Simple Spark session - all configuration comes from spark-submit
        spark = SparkSession.builder \
            .appName("ParquetToMySQL") \
            .config("spark.executor.instances", "1") \
            .config("spark.executor.cores", "4") \
            .config("spark.executor.memory", "8g") \
            .config("spark.driver.memory", "8g") \
            .config("spark.driver.maxResultSize", "6g") \
            .config("spark.default.parallelism", "4") \
            .config("spark.sql.shuffle.partitions", "4") \
            .config("spark.sql.adaptive.enabled", "true") \
            .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
            .config("spark.sql.adaptive.skewJoin.enabled", "true") \
            .config("spark.sql.adaptive.localShuffleReader.enabled", "true") \
            .config("spark.dynamicAllocation.enabled", "false") \
            .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer") \
            .config("spark.sql.execution.arrow.pyspark.enabled", "true") \
            .config("spark.sql.execution.arrow.maxRecordsPerBatch", "10000") \
            .config("spark.network.timeout", "1800s") \
            .config("spark.sql.broadcastTimeout", "1800") \
            .config("spark.rpc.askTimeout", "1800s") \
            .config("spark.executor.heartbeatInterval", "60s") \
            .config("spark.sql.sources.batchSize", "10000") \
            .getOrCreate()
        
        logger.info("Spark session initialized using external configuration")
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

        # Read Parquet file - leverage cluster for processing
        df = spark.read.parquet(input_path)
        
        row_count = df.count()
        logger.info(f"Parquet file read successfully. Row count: {row_count}")

        # MySQL connection configuration
        mysql_host = os.getenv("MYSQL_HOST", "10.74.169.120")
        mysql_port = os.getenv("MYSQL_PORT", "3306")
        mysql_database = os.getenv("MYSQL_DATABASE", "workflow_db")
        mysql_user = os.getenv("MYSQL_USER", "ml_dash")
        mysql_password = os.getenv("MYSQL_PASSWORD", "Mysql1234")
        
        # Create unique table name
        table_name = f"customer_data_{str(uuid.uuid4()).replace('-', '_')}"
        
        # MySQL JDBC URL
        mysql_url = f"jdbc:mysql://{mysql_host}:{mysql_port}/{mysql_database}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
        
        logger.info(f"Writing to MySQL database: {mysql_host}:{mysql_port}/{mysql_database}")
        logger.info(f"Table name: {table_name}")

        # Write to MySQL with distributed execution support
        try:
            # Optimize DataFrame partitioning for MySQL writes
            # Use reasonable number of partitions for parallel writes
            optimal_partitions = min(max(1, row_count // 100000), 10)  # 1-10 partitions
            df_optimized = df.repartition(optimal_partitions)
            
            logger.info(f"Using {optimal_partitions} partitions for optimal MySQL write performance")
            
            # Write to MySQL - this will leverage multiple executors
            df_optimized.write \
                .format("jdbc") \
                .option("url", mysql_url) \
                .option("dbtable", table_name) \
                .option("user", mysql_user) \
                .option("password", mysql_password) \
                .option("driver", "com.mysql.cj.jdbc.Driver") \
                .option("batchsize", "10000") \
                .option("isolationLevel", "READ_COMMITTED") \
                .option("numPartitions", str(optimal_partitions)) \
                .mode("overwrite") \
                .save()
            
            logger.info("Data written to MySQL successfully using distributed execution")
            
        except Exception as e:
            logger.error(f"Failed to write to MySQL: {e}")
            # Fallback: Try with single partition if distributed write fails
            logger.info("Attempting single-partition fallback...")
            try:
                df.coalesce(1).write \
                    .format("jdbc") \
                    .option("url", mysql_url) \
                    .option("dbtable", table_name) \
                    .option("user", mysql_user) \
                    .option("password", mysql_password) \
                    .option("driver", "com.mysql.cj.jdbc.Driver") \
                    .option("batchsize", "5000") \
                    .option("isolationLevel", "READ_COMMITTED") \
                    .mode("overwrite") \
                    .save()
                logger.info("Fallback write to MySQL successful")
            except Exception as fallback_error:
                logger.error(f"Fallback method also failed: {fallback_error}")
                raise

        # Return connection string for accessing the data
        result_info = {
            "database_type": "mysql",
            "host": mysql_host,
            "port": mysql_port,
            "database": mysql_database,
            "table": table_name,
            "connection_url": mysql_url,
            "row_count": row_count
        }
        
        # Print the result for the workflow
        print(json.dumps(result_info))
        logger.info(f"MySQL table created: {table_name} with {row_count} rows")

    except Exception as e:
        logger.error(f"Error in processing: {e}")
        raise
    finally:
        spark.stop()
        logger.info("Spark session stopped")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error(f"Script failed: {e}")
        sys.exit(1)