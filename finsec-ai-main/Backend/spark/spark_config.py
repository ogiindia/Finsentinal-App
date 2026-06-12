from pyspark.sql import SparkSession
from config import (SPARK_APP_NAME, SPARK_MASTER, SPARK_DRIVER_MEMORY,
                    SPARK_EXECUTOR_MEMORY, SPARK_SQL_SHUFFLE_PARTITIONS,
                    SPARK_CORE_COUNT, SPARK_MAX_CORE_COUNT, SPARK_EXECUTOR_CORE_COUNT)

def get_spark_session() -> SparkSession:
    spark = SparkSession.getActiveSession()
    if spark is None:
        spark = SparkSession.builder.appName(SPARK_APP_NAME).master(SPARK_MASTER) \
                .config("spark.sql.adaptive.enabled", "true") \
                .config("spark.driver.memory", SPARK_DRIVER_MEMORY) \
                .config("spark.executor.cores", SPARK_EXECUTOR_CORE_COUNT)\
                .config("spark.driver.cores", SPARK_CORE_COUNT)\
                .config("spark.cores.max", SPARK_MAX_CORE_COUNT) \
                .config("spark.executor.memory", SPARK_EXECUTOR_MEMORY) \
                .config("spark.sql.shuffle.partitions", str(SPARK_SQL_SHUFFLE_PARTITIONS)) \
                .getOrCreate()
    return spark
