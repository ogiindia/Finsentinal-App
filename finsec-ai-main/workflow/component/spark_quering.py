from pyspark.sql import SparkSession
from pyspark.sql.functions import expr, lit, col
import json
import sys
import uuid
import os

# Read arguments from JSON file
json_file_path = sys.argv[1]
with open(json_file_path, 'r') as f:
    args = json.load(f)

config = args["config"]
results = args.get("results", {})
parent_result = config.get("parent_result", {})

# Debug: Print the configuration to understand what we're receiving
print(f"Config received: {json.dumps(config, indent=2)}")
print(f"Results received: {json.dumps(results, indent=2)}")

# Initialize Spark session
spark = SparkSession.builder.appName("Derived Feature").getOrCreate()

try:
    try:
        input_path = config["parquet_path"]['filePath']
    except:
        parent_node = parent_result['mappings']['parquet_path']
        input_path = results[parent_node] if results else None
    # Validate the input path
    if not input_path or input_path == "None":
        raise ValueError(f"Invalid input path: {input_path}")
    
    # Read the parquet file
    print(f"Reading parquet from: {input_path}")
    df = spark.read.parquet(input_path)
    
    # Get the new column name and formula
    new_column = config['new_column']
    formula_string = config['query']
    
    print(f"Adding column '{new_column}' with formula: {formula_string}")
    
    # Add new column using expr()
    df = df.withColumn(new_column, expr(formula_string))
    
    # Generate output path
    output_dir = config["output_path"]["filePath"]
    output_filename = f"{uuid.uuid4()}_derived_output.parquet"
    out_path = os.path.join(output_dir, output_filename)
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Write the result
    print(f"Writing output to: {out_path}")
    df = df.repartition(1)
    df.write.mode("overwrite").parquet(out_path)
    
    # Print the output path (this will be captured as the activity result)
    print(out_path)
    
except Exception as e:
    print(f"Error in Spark job: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    spark.stop()