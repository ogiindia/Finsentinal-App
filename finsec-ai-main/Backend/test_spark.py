
from pyspark.sql import SparkSession

SPARK_MASTER_URL = "spark://10.247.208.107:7077"
PYTHON_EXECUTABLE = r"C:\AIML\Finsentinel_AI\venv\Scripts\python.exe"  # adjust if needed

spark = (
    SparkSession.builder
    .appName("FinSentinel_Retrain")
    .master(SPARK_MASTER_URL)
    # Driver settings – important when executors connect back:
    .config("spark.driver.host", "10.247.208.107")
    .config("spark.driver.bindAddress", "0.0.0.0")
    # Make sure executors use the same Python
    .config("spark.pyspark.python", PYTHON_EXECUTABLE)
    # Your existing configs
    .config("spark.sql.shuffle.partitions", "16")
    .config("spark.sql.execution.arrow.pyspark.enabled", "true")
    .getOrCreate()
)


df = spark.createDataFrame([(1, "a"), (2, "b")], ["id", "val"])
# df.show()

spark.stop()
