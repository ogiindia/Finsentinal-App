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

# Initialize Spark session
spark = SparkSession.builder.appName("Derived Feature").getOrCreate()

try:
    # Handle input path based on whether it's from a parent node or direct input
    if config:
        # Get the source node ID (it's already a string, not a list)
        parent_node = parent_result['mappings']['parquet_path']
        
        # Get the result from the previous node
        input_path = results.get(parent_node)
        
        if not input_path:
            raise ValueError(f"No result found from parent node '{parent_node}'. Available results: {list(results.keys())}")
        
        print(f"Using input path from {parent_node}: {input_path}")
    
    elif "parquet_path" in config:
        # Direct parquet path provided
        input_path = config["parquet_path"]['filePath']
        print(f"Using direct input path: {input_path}")
    
    else:
        raise ValueError("No input path specified. Expected either 'parent_result' or 'parquet_path' in config")
    
    # Validate the input path
    if not input_path or input_path == "None":
        raise ValueError(f"Invalid input path: {input_path}")
    
    # Read the parquet file
    print(f"Reading parquet from: {input_path}")
    df = spark.read.parquet(input_path)
    

    drop_columns = config['drop_columns']    
    print(f"Column Selection formula: {drop_columns}")

    
    col_list = [item.strip() for item in drop_columns.split(",")]
    print(col_list)

    df_drop = df.drop(*col_list)

        
    # Add new column using expr()
    # df = df.withColumn(new_column, expr(formula_string))
    
    # Generate output path
    output_dir = config["output_path"]["filePath"]
    output_filename = f"{uuid.uuid4()}"
    # out_path = os.path.join(output_dir, output_filename)
    out_path = os.path.abspath(os.path.join(config["output_path"]['filePath'], str(uuid.uuid4())))
    
    # Ensure output directory exists
    # os.makedirs(output_dir, exist_ok=True)
    
    # Write the result
    print(f"Writing output to: {out_path}")
    df_drop = df_drop.repartition(1)
    df_drop.write.mode("overwrite").parquet(out_path)
    
    # Print the output path (this will be captured as the activity result)
    print(out_path)
    
except Exception as e:
    print(f"Error in Spark job: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    spark.stop()