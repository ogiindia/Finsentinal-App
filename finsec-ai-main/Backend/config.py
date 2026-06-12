from dotenv import load_dotenv
from os import getenv, path

load_dotenv()

class Settings:
    # External API Configuration
    EXTERNAL_API_IP = getenv('EXTERNAL_API_IP')
    EXTERNAL_API_PORT = int(getenv('EXTERNAL_API_PORT'))
    DEFAULT_DOMAIN = getenv('DEFAULT_DOMAIN')
    
    # Session Configuration
    SESSION_TIMEOUT_MINUTES = int(getenv('SESSION_TIMEOUT_MINUTES'))
    SESSION_SECRET_KEY = getenv('SESSION_SECRET_KEY')

    
    SECRET_KEY: str = "your-secret-key-change-this-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    SESSION_TIMEOUT_MINUTES: int = 60
    
    # SSL/TLS Configuration
    VERIFY_SSL = getenv('VERIFY_SSL', 'False').lower() in ('true', '1', 'yes')
    
    # Request Configuration
    REQUEST_TIMEOUT = float(getenv('REQUEST_TIMEOUT', '30'))

    # Credentials
    API_USERNAME = getenv('USERNAME')
    API_PASSWORD = getenv('PASSWORD')
    API_DOMAIN = getenv('DEFAULT_DOMAIN')
    
    # Uvicorn
    HOST = getenv('HOST', '0.0.0.0')
    PORT = int(getenv("PORT", '8010'))
    RELOAD = getenv("RELOAD", 'True').lower() in ('true', '1', 'yes')
    LOG_LEVEL = getenv("LOG_LEVEL", 'info')
    
    # API Configuration
    API_TITLE = "FinSentinal AI"
    API_DESCRIPTION = """
    ## Case Management System Backend with Session Management
    ### Features:
    - Secure session-based authentication
    - Automatic session timeout (1 hour)
    - Token storage on backend
    - Dynamic response table rendering
    - Environment-based configuration
    """
    API_VERSION = "1.0.0"
    
    # # ONNX Model Paths
    # ONNX_PATH = getenv('ONNX_PATH')
    # ONNX_SUP_PATH = getenv('ONNX_SUP_PATH')

    
    # # CSV Paths
    # CSV_PATH = getenv("CSV_PATH")
    # UNSUP_CSV_PATH = getenv("UNSUP_CSV_PATH")
    # TARGET_COLUMN = getenv('TARGET_COLUMN')
    
    # Database
    DB_URL = getenv("DB_URL")
    
    # Customer Data
    CUST_DATA = getenv('CUST_DATA')
    
    # CORS Configuration
    ORIGIN = [getenv("ORIGIN")]

# Create a singleton instance
settings = Settings()


# EXTERNAL_API_IP = getenv('EXTERNAL_API_IP')
# EXTERNAL_API_PORT = int(getenv('EXTERNAL_API_PORT'))
# DEFAULT_DOMAIN = getenv('DEFAULT_DOMAIN')

# # Session Configuration
# SESSION_TIMEOUT_MINUTES = int(getenv('SESSION_TIMEOUT_MINUTES'))
# SESSION_SECRET_KEY = getenv('SESSION_SECRET_KEY')

# # SSL/TLS Configuration
# VERIFY_SSL = getenv('VERIFY_SSL', 'False').lower()

# Request Configuration
REQUEST_TIMEOUT = int(getenv('REQUEST_TIMEOUT'))

#Uvicorn
HOST = getenv('HOST')
PORT = int(getenv("PORT"))
REPORT_SERVICE_PORT = int(getenv("REPORT_SERVICE_PORT"))
MULE_SERVICE_PORT = int(getenv("MULE_SERVICE_PORT"))
GRAPHQL_SERVICE_PORT = int(getenv("GRAPHQL_SERVICE_PORT"))
ALERT_SERVICE_PORT = int(getenv("ALERT_SERVICE_PORT"))
RELOAD = getenv("RELOAD")
FORWARDED_ALLOW_IPS = getenv("FORWARDED_ALLOW_IPS")
LIMIT_CONCURRENCY = int(getenv("LIMIT_CONCURRENCY"))
# LIMIT_MAX_REQUESTS = int(getenv("LIMIT_MAX_REQUESTS"))
TIMEOUT_KEEP_ALIVE = int(getenv("TIMEOUT_KEEP_ALIVE"))
# WORKERS = int(getenv("WORKERS"))
BACKLOG = int(getenv("BACKLOG"))
LOG_LEVEL = getenv("LOG_LEVEL")
API_TITLE = "FinSentinal AI"
API_DESCRIPTION = """
    ## Case Management System Backend with Session Management
    ### Features:
    - Secure session-based authentication
    - Automatic session timeout (15 minutes)
    - Token storage on backend
    - Dynamic response table rendering
    - Environment-based configuration
    """
API_VERION = "1.0.0"

# LOG CONFIG
LOG_DIR = getenv("LOG_DIR", "logs")
LOGGING_CONFIG = LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        # CORRECTED: Simple format for access logs
        "access": {
            "format": "%(asctime)s - %(levelname)s - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
            "formatter": "default",
            "stream": "ext://sys.stdout",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "DEBUG",
            "formatter": "default",
            "filename": path.join(LOG_DIR, "server.log"),
            # "maxBytes": 52428800,  # 50MB
            "backupCount": 10,
            "encoding": "utf8",
        },
        "access_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "INFO",
            "formatter": "access",
            "filename": path.join(LOG_DIR, "access.log"),
            # "maxBytes": 52428800,
            "backupCount": 10,
            "encoding": "utf8",
        },
        "error_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "ERROR",
            "formatter": "default",
            "filename": path.join(LOG_DIR, "error.log"),
            # "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
            "encoding": "utf8",
        },
    },
    "loggers": {
        "uvicorn": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
        "uvicorn.error": {
            "handlers": ["console", "file", "error_file"],
            "level": "INFO",
            "propagate": False,
        },
        "uvicorn.access": {
            "handlers": ["console", "access_file"],
            "level": "INFO",
            "propagate": False,
        },
        "fastapi": {
            "handlers": ["console", "file"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["console", "file"],
    },
}

# Onnx
ONNX_PATH = getenv('ONNX_PATH')
ONNX_SUP_PATH = getenv('ONNX_SUP_PATH')
ONNX_UNSUP_PATH = getenv('ONNX_UNSUP_PATH')

# Retrain csv
CSV_PATH = getenv("CSV_PATH")
UNSUP_CSV_PATH = getenv("UNSUP_CSV_PATH")
TARGET_COLUMN = getenv('TARGET_COLUMN')

# Database
# DB_URL = mysql+pymysql://root:Passw0rd123!@localhost:3306/demo
DB_URL = getenv("DB_URL")

# Customer data
CUST_DATA = getenv('CUST_DATA')


# CORS CONFIG
ORIGIN = getenv("ORIGIN")

# DATA_DIR
DATA_DIR = getenv("DATA_DIR")

# FILE_DIR
FILE_DIR = getenv("FILE_DIR")

#MODEL_DIR
MODEL_DIR = getenv("MODEL_DIR")


# ALERT DIR
ALERT_DIR = getenv("ALERT_DIR")

# FEATURE DIR
FEATURE_DIR = getenv("FEATURE_DIR")

# SPARK CONFIG
SPARK_APP_NAME = getenv('SPARK_APP_NAME')
SPARK_MASTER = getenv('SPARK_MASTER')
SPARK_DRIVER_MEMORY = getenv('SPARK_DRIVER_MEMORY')
SPARK_EXECUTOR_MEMORY = getenv('SPARK_EXECUTOR_MEMORY')
SPARK_SQL_SHUFFLE_PARTITIONS = int(getenv('SPARK_SQL_SHUFFLE_PARTITIONS'))
SPARK_CORE_COUNT = getenv('SPARK_CORE_COUNT')
SPARK_EXECUTOR_CORE_COUNT = getenv('SPARK_EXECUTOR_CORE_COUNT')
SPARK_MAX_CORE_COUNT = getenv('SPARK_MAX_CORE_COUNT')


########################### TABLE CONFIG ###############################
class TableNames:
    """Table names configuration from environment variables"""
    ALERTS = getenv('TABLE_ALERTS', 'alerts')
    ALSALAM_TRANS = getenv('TABLE_ALSALAM_TRANS', 'alsalam_transactions_1y')
    FEATURE_DATA = getenv('TABLE_FEATURE_DATA', 'feature_data_1')
    MODEL_CONFIG = getenv('TABLE_MODEL_CONFIG', 'model_configurations')
    MODEL_VERSION = getenv('TABLE_MODEL_VERSION', 'model_versions')
    DATA_FILE = getenv('TABLE_DATA_FILE', 'data_files')
    CALCULATION_RESULT = getenv('TABLE_CALCULATION_RESULT', 'calculation_results')
    ALERT_CATEGORY_FILE = getenv('TABLE_ALERT_CATEGORY_FILE', 'alert_category_files')
    RETRAINING_STATUS = getenv('TABLE_RETRAINING_STATUS', 'retraining_status')
    USER_TABLE = getenv('TABLE_USER', 'users')
    USERBASE_TABLE = getenv('TABLE_USERBASE', 'user_bases')
    CUSTOMER_TABLE = getenv('TABLE_CUSTOMER', 'customers')
    FEATURETABLE= getenv('FEATURETABLE', 'feature_table')
    RISKTABLE = getenv("RISK_TABLE", "risktable")


class AlertColumns:
    """Alert table column names from environment variables"""
    ID = getenv('ALERT_COL_ID', 'id')
    CATEGORY = getenv('ALERT_COL_CATEGORY', 'alert_category')
    MODEL_PATH = getenv('ALERT_COL_MODEL_PATH', 'model_path')
    RETRAIN_DATE = getenv('ALERT_COL_RETRAIN_DATE', 'retrain_date')
    UPDATED_DATE = getenv('ALERT_COL_UPDATED_DATE', 'updated_date')


class AlsalamColumns:
    """Alsalam transactions table column names from environment variables"""
    ID = getenv('ALSALAM_COL_ID', 'id')
    CUSTOMER_ID = getenv('ALSALAM_COL_CUSTOMER_ID', 'Customer_Id')
    TIMESTAMP = getenv('ALSALAM_COL_TIMESTAMP', 'Timestamp')
    AMOUNT = getenv('ALSALAM_COL_AMOUNT', 'Amount')
    LOCATION = getenv('ALSALAM_COL_LOCATION', 'Location')
    TO_CUSTOMER_ID = getenv('ALSALAM_COL_TO_CUSTOMER_ID', 'To_Customer_Id')
    TRAN_FOREIGN = getenv('ALSALAM_COL_TRAN_FOREIGN', 'Tran_Foreign')
    DEVICE_CHANGE = getenv('ALSALAM_COL_DEVICE_CHANGE', 'Device_Change')
    IP_CHANGE = getenv('ALSALAM_COL_IP_CHANGE', 'IP_Change')
    BENEFICIARY = getenv('ALSALAM_COL_BENEFICIARY', 'Beneficiery_Name')


class FeatureColumns:
    """Feature data table column names from environment variables"""
    ID = getenv('FEATURE_COL_ID', 'id')
    ALSALAM_ID = getenv('FEATURE_COL_ALSALAM_ID', 'alsalam_id')
    FRAUD = getenv('FEATURE_COL_FRAUD', 'fraud')
    RISK_SCORE = getenv('FEATURE_COL_RISK_SCORE', 'risk_score')


class ModelConfigColumns:
    """Model configuration table column names from environment variables"""
    ID = getenv('MODEL_CONFIG_COL_ID', 'id')
    ALERT_CATEGORY = getenv('MODEL_CONFIG_COL_ALERT_CATEGORY', 'alert_category')
    MODEL_NAME = getenv('MODEL_CONFIG_COL_MODEL_NAME', 'model_name')
    MODEL_FILENAME = getenv('MODEL_CONFIG_COL_MODEL_FILENAME', 'model_filename')
    MODEL_PATH = getenv('MODEL_CONFIG_COL_MODEL_PATH', 'model_path')
    MODEL_TYPE = getenv('MODEL_CONFIG_COL_MODEL_TYPE', 'model_type')
    TARGET_COLUMN = getenv('MODEL_CONFIG_COL_TARGET_COLUMN', 'target_column')
    FEATURE_MAPPINGS = getenv('MODEL_CONFIG_COL_FEATURE_MAPPINGS', 'feature_mappings')
    CREATED_AT = getenv('MODEL_CONFIG_COL_CREATED_AT', 'created_at')
    UPDATED_AT = getenv('MODEL_CONFIG_COL_UPDATED_AT', 'updated_at')


class ModelVersionColumns:
    """Model version table column names from environment variables"""
    ID = getenv('MODEL_VERSION_COL_ID', 'id')
    MODEL_CONFIG_ID = getenv('MODEL_VERSION_COL_MODEL_CONFIG_ID', 'model_config_id')
    VERSION_NUMBER = getenv('MODEL_VERSION_COL_VERSION_NUMBER', 'version_number')
    MODEL_PATH_ONNX = getenv('MODEL_VERSION_COL_MODEL_PATH_ONNX', 'model_path_onnx')
    MODEL_PATH_PKL = getenv('MODEL_VERSION_COL_MODEL_PATH_PKL', 'model_path_pkl')
    ACCURACY = getenv('MODEL_VERSION_COL_ACCURACY', 'accuracy')
    METRICS = getenv('MODEL_VERSION_COL_METRICS', 'metrics')
    CREATED_AT = getenv('MODEL_VERSION_COL_CREATED_AT', 'created_at')


class DataFileColumns:
    """Data file table column names from environment variables"""
    ID = getenv('DATA_FILE_COL_ID', 'id')
    MODEL_CONFIG_ID = getenv('DATA_FILE_COL_MODEL_CONFIG_ID', 'model_config_id')
    FILE_TYPE = getenv('DATA_FILE_COL_FILE_TYPE', 'file_type')
    FILE_PATH = getenv('DATA_FILE_COL_FILE_PATH', 'file_path')
    FILE_NAME = getenv('DATA_FILE_COL_FILE_NAME', 'file_name')
    FILE_SIZE = getenv('DATA_FILE_COL_FILE_SIZE', 'file_size')
    ROW_COUNT = getenv('DATA_FILE_COL_ROW_COUNT', 'row_count')
    COLUMN_COUNT = getenv('DATA_FILE_COL_COLUMN_COUNT', 'column_count')
    COLUMNS_INFO = getenv('DATA_FILE_COL_COLUMNS_INFO', 'columns_info')
    UPLOADED_AT = getenv('DATA_FILE_COL_UPLOADED_AT', 'uploaded_at')


class CalculationResultColumns:
    """Calculation result table column names from environment variables"""
    ID = getenv('CALC_RESULT_COL_ID', 'id')
    MODEL_CONFIG_ID = getenv('CALC_RESULT_COL_MODEL_CONFIG_ID', 'model_config_id')
    CALCULATION_TYPE = getenv('CALC_RESULT_COL_CALCULATION_TYPE', 'calculation_type')
    RESULT_DATA = getenv('CALC_RESULT_COL_RESULT_DATA', 'result_data')
    CALCULATION_METADATA = getenv('CALC_RESULT_COL_CALCULATION_METADATA', 'calculation_metadata')
    CALCULATED_AT = getenv('CALC_RESULT_COL_CALCULATED_AT', 'calculated_at')


class AlertCategoryFileColumns:
    """Alert category file table column names from environment variables"""
    ID = getenv('ALERT_CAT_FILE_COL_ID', 'id')
    ALERT_CATEGORY = getenv('ALERT_CAT_FILE_COL_ALERT_CATEGORY', 'alertcategory')
    FILE_PATH = getenv('ALERT_CAT_FILE_COL_FILE_PATH', 'filepath')
    LAST_UPDATED = getenv('ALERT_CAT_FILE_COL_LAST_UPDATED', 'last_updated')
    CREATED_AT = getenv('ALERT_CAT_FILE_COL_CREATED_AT', 'created_at')


class RetrainingStatusColumns:
    """Retraining status table column names from environment variables"""
    ID = getenv('RETRAIN_STATUS_COL_ID', 'id')
    MODEL_CONFIG_ID = getenv('RETRAIN_STATUS_COL_MODEL_CONFIG_ID', 'model_config_id')
    ALERT_CATEGORY = getenv('RETRAIN_STATUS_COL_ALERT_CATEGORY', 'alert_category')
    CURRENT_STAGE = getenv('RETRAIN_STATUS_COL_CURRENT_STAGE', 'current_stage')
    STAGE_STATUS = getenv('RETRAIN_STATUS_COL_STAGE_STATUS', 'stage_status')
    TOTAL_STAGES = getenv('RETRAIN_STATUS_COL_TOTAL_STAGES', 'total_stages')
    COMPLETED_STAGES = getenv('RETRAIN_STATUS_COL_COMPLETED_STAGES', 'completed_stages')
    PROGRESS_PERCENTAGE = getenv('RETRAIN_STATUS_COL_PROGRESS_PERCENTAGE', 'progress_percentage')
    STAGE_DETAILS = getenv('RETRAIN_STATUS_COL_STAGE_DETAILS', 'stage_details')
    ERROR_MESSAGE = getenv('RETRAIN_STATUS_COL_ERROR_MESSAGE', 'error_message')
    STARTED_AT = getenv('RETRAIN_STATUS_COL_STARTED_AT', 'started_at')
    UPDATED_AT = getenv('RETRAIN_STATUS_COL_UPDATED_AT', 'updated_at')
    COMPLETED_AT = getenv('RETRAIN_STATUS_COL_COMPLETED_AT', 'completed_at')
    NEW_ROWS_ADDED = getenv('RETRAIN_STATUS_COL_NEW_ROWS_ADDED', 'new_rows_added')
    TOTAL_DATA_ROWS = getenv('RETRAIN_STATUS_COL_TOTAL_DATA_ROWS', 'total_data_rows')
    VERSION_NUMBER = getenv('RETRAIN_STATUS_COL_VERSION_NUMBER', 'version_number')


class UserColumns:
    ID = getenv('USER_COL_ID', 'id')
    USERNAME = getenv('USER_COL_USERNAME', 'username')
    PASSWORD_HASH = getenv('USER_COL_PASSWORD_HASH', 'password_hash')
    EMAIL = getenv('USER_COL_EMAIL', 'email')
    FULL_NAME = getenv('USER_COL_FULL_NAME', 'full_name')


class UserBaseColumns:
    ID = getenv('USERBASE_COL_ID', 'id')
    USER_ID = getenv('USERBASE_COL_USER_ID', 'user_id')
    ADDRESS = getenv('USERBASE_COL_ADDRESS', 'address')
    USER_TYPE = getenv('USERBASE_COL_USER_TYPE', 'user_type')
    IS_ACTIVE = getenv('USERBASE_COL_IS_ACTIVE', 'is_active')
    LAST_LOGIN = getenv('USERBASE_COL_LAST_LOGIN', 'last_login')
    CREATED_AT = getenv('USERBASE_COL_CREATED_AT', 'created_at')
    UPDATED_AT = getenv('USERBASE_COL_UPDATED_AT', 'updated_at')


class CustomerColumns:
    ID = getenv('CUSTOMER_COL_ID', 'id')
    CUSTOMER_ID = getenv('CUSTOMER_COL_CUSTOMER_ID', 'customer_id')
    FIRST_NAME = getenv('CUSTOMER_COL_FIRST_NAME', 'first_name')
    LAST_NAME = getenv('CUSTOMER_COL_LAST_NAME', 'last_name')
    EMAIL = getenv('CUSTOMER_COL_EMAIL', 'email')
    PHONE = getenv('CUSTOMER_COL_PHONE', 'phone')
    GENDER = getenv('CUSTOMER_COL_GENDER', 'gender')
    AGE = getenv('CUSTOMER_COL_AGE', 'age')
    IS_MARRIED = getenv('CUSTOMER_COL_IS_MARRIED', 'is_married')
    ADDRESS = getenv('CUSTOMER_COL_ADDRESS', 'address')
    MERCHANT_ADDRESS = getenv('CUSTOMER_COL_MERCHANT_ADDRESS', 'merchant_address')
    STATE = getenv('CUSTOMER_COL_STATE', 'state')
    GEO_LOCATION = getenv('CUSTOMER_COL_GEO_LOCATION', 'geo_location')
    REGISTERED = getenv('CUSTOMER_COL_REGISTERED', 'registered')
    ACCOUNT_HOLDING = getenv('CUSTOMER_COL_ACCOUNT_HOLDING', 'account_holding')
    LOAN_ACCOUNT = getenv('CUSTOMER_COL_LOAN_ACCOUNT', 'loan_account')
    CURRENT_BALANCE = getenv('CUSTOMER_COL_CURRENT_BALANCE', 'current_balance')
    INCOME = getenv('CUSTOMER_COL_INCOME', 'income')
    ORDERS = getenv('CUSTOMER_COL_ORDERS', 'orders')
    SPENT = getenv('CUSTOMER_COL_SPENT', 'spent')
    JOB = getenv('CUSTOMER_COL_JOB', 'job')
    HOBBIES = getenv('CUSTOMER_COL_HOBBIES', 'hobbies')
    VULNERABILITY = getenv('CUSTOMER_COL_VULNERABILITY', 'vulnerability')
    DEVICE_ID = getenv('CUSTOMER_COL_DEVICE_ID', 'device_id')
    CREATED_AT = getenv('CUSTOMER_COL_CREATED_AT', 'created_at')
    UPDATED_AT = getenv('CUSTOMER_COL_UPDATED_AT', 'updated_at')


class FeatureTableColumns:
    ID = getenv('FEATURETABLE_COL_ID')
    NAME = getenv('FEATURETABLE_COL_NAME')
    CHANNEL = getenv('FEATURETABLE_COL_CHANNEL')
    QUERY = getenv('FEATURETABLE_COL_QUERY')
    DESCRIPTION = getenv('FEATURETABLE_COL_DESCRIPTION')
    CREATED = getenv('FEATURETABLE_COL_CREATED')
    UPDATED_AT = getenv('FEATURETABLE_COL_UPDATED_AT')
    WORKFLOW_ID = getenv('FEATURETABLE_COL_WORKFLOW_ID')

class RiskTableColumn:
    id = getenv('RISKTABLE_COL_ID')
    customer_id = getenv('RISKTABLE_COL_CUSTOMER_ID')
    weekly_avg_debit_amount = getenv('RISKTABLE_COL_WEEKLY_DEBIT_AVG')
    monthly_avg_debit_amount = getenv('RISKTABLE_COL_MONTHLY_DEBIT_AVG')
    most_active_weekday = getenv('RISKTABLE_COL_MOST_ACTIVE_WEEKDAY')
    most_active_hour = getenv('RISKTABLE_COL_MOST_ACTIVE_HOUR')
    weekly_low_avg_amount = getenv('RISKTABLE_COL_WEEKLY_LOW')
    weekly_high_avg_amount = getenv('RISKTABLE_COL_WEEKLY_HIGH')
    foreign_transaction_flag = getenv('RISKTABLE_COL_FOREIGN_FLAG')
    volatility_risk = getenv('RISKTABLE_COL_VOLATILITY_FLAG')
    deviation_risk = getenv('RISKTABLE_COL_DEVIATION_RISK')
    time_risk = getenv('RISKTABLE_COL_TIME_RISK')
    foreign_risk = getenv('RISKTABLE_COL_FOREIGN_RISK')
    risk_score = getenv('RISKTABLE_COL_RISK_SCORE')
    risk_probability = getenv('RISKTABLE_COL_RISK_PROBABILITY')
    risk_level = getenv('RISKTABLE_COL_RISK_LEVEL')