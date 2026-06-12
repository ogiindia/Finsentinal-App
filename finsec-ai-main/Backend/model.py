from sqlalchemy import Column, Integer, DateTime, String, Date, ForeignKey, Index, Float, Text, Enum, Boolean, Sequence, TypeDecorator
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
import json

# Import configuration
from config import (
    TableNames, AlertColumns, AlsalamColumns, FeatureColumns,
    ModelConfigColumns, ModelVersionColumns, DataFileColumns,
    CalculationResultColumns, AlertCategoryFileColumns,
    RetrainingStatusColumns, UserColumns, CustomerColumns, UserBaseColumns, FeatureTableColumns,
    RiskTableColumn
)


Base = declarative_base()


class JSONEncodedDict(TypeDecorator):
    """Enables JSON storage by encoding and decoding on the fly."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            value = json.dumps(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            value = json.loads(value)
        return value

class ModelType(enum.Enum):
    """Enum for model types"""
    SUPERVISED = "supervised"
    UNSUPERVISED = "unsupervised"


class RetrainingStage(enum.Enum):
    """Enum for retraining stages"""
    STARTED = "started"
    DATA_LOADING = "data_loading"
    FEATURE_MAPPING = "feature_mapping"
    DATA_PROCESSING = "data_processing"
    MODEL_TRAINING = "model_training"
    MODEL_SAVING = "model_saving"
    DATABASE_UPDATE = "database_update"
    MODEL_EVALUATION = "model_evaluation"
    COMPLETED = "completed"
    FAILED = "failed"


class UserType(enum.Enum):
    SUPERADMIN = 'superadmin'
    ADMIN = 'admin'
    USER = 'user'

class User(Base):
    __tablename__ = TableNames.USER_TABLE

    id = Column(
        UserColumns.ID,
        Integer,
        Sequence(f"{TableNames.USER_TABLE}_SEQ", start=1, increment=1),
        primary_key=True,
    )
    username = Column(UserColumns.USERNAME, String(255), unique=True, nullable=False)
    password_hash = Column(UserColumns.PASSWORD_HASH, String(255), nullable=False)
    email = Column(UserColumns.EMAIL, String(255), unique=True, nullable=True)
    full_name = Column(UserColumns.FULL_NAME, String(255), nullable=True)


class UserBase(Base):
    __tablename__ = TableNames.USERBASE_TABLE

    id = Column(
        UserBaseColumns.ID,
        Integer,
        Sequence(f"{TableNames.USERBASE_TABLE}_SEQ", start=1, increment=1),
        primary_key=True,
    )
    User_id = Column(UserBaseColumns.USER_ID, String(50), unique=True, nullable=False)
    user_type = Column(
        UserBaseColumns.USER_TYPE, 
        Enum(UserType), 
        native_enum=False, 
        validate_strings=False, 
        create_constraint=False, 
        default=UserType.USER, 
        nullable=False
    )
    is_active = Column(UserBaseColumns.IS_ACTIVE, Integer, default=1, nullable=False)
    created_at = Column(UserBaseColumns.CREATED_AT, DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(UserBaseColumns.UPDATED_AT, DateTime, default=None, nullable=True)
    last_login = Column(UserBaseColumns.LAST_LOGIN, DateTime, default=None, nullable=True)

    __table_args__ = (
        Index('idx_userbase_user_type', UserBaseColumns.USER_TYPE),
        Index('idx_userbase_active', UserBaseColumns.IS_ACTIVE),
    )


class Alert(Base):
    __tablename__ = TableNames.ALERTS

    id = Column(
        AlertColumns.ID,
        Integer,
        Sequence(f"{TableNames.ALERTS}_SEQ", start=1, increment=1),
        primary_key=True,
    )
    alert_category = Column(AlertColumns.CATEGORY, String(255), unique=True, nullable=False)
    model_path = Column(AlertColumns.MODEL_PATH, String(255))
    retrain_date = Column(AlertColumns.RETRAIN_DATE, Date, nullable=False)
    updated_date = Column(AlertColumns.UPDATED_DATE, DateTime, nullable=False, default=func.now(), server_default=func.now())


class AlsalamTrans(Base):
    __tablename__ = TableNames.ALSALAM_TRANS

    id = Column(
        AlsalamColumns.ID,
        Integer,
        Sequence(f"{TableNames.ALSALAM_TRANS}_SEQ", start=1, increment=1),
        primary_key=True,
    )
    Customer_Id = Column(AlsalamColumns.CUSTOMER_ID, String(64), nullable=False)
    Timestamp = Column(AlsalamColumns.TIMESTAMP, DateTime, nullable=False)
    Amount = Column(AlsalamColumns.AMOUNT, Float, nullable=False)
    Location = Column(AlsalamColumns.LOCATION, String(255))
    To_Customer_Id = Column(AlsalamColumns.TO_CUSTOMER_ID, String(64))
    
    # Relationship
    feature_data = relationship("ALSalamModelResult", back_populates="alsalam_data", uselist=False)
    
    __table_args__ = (
        Index(f'idx_{TableNames.ALSALAM_TRANS}_customer_timestamp', AlsalamColumns.CUSTOMER_ID, AlsalamColumns.TIMESTAMP),
        Index(f'idx_{TableNames.ALSALAM_TRANS}_customer_amount', AlsalamColumns.CUSTOMER_ID, AlsalamColumns.AMOUNT),
        Index(f'idx_{TableNames.ALSALAM_TRANS}_timestamp_amount', AlsalamColumns.TIMESTAMP, AlsalamColumns.AMOUNT),
        Index(f'idx_{TableNames.ALSALAM_TRANS}_location_timestamp', AlsalamColumns.LOCATION, AlsalamColumns.TIMESTAMP),
    )


class ALSalamModelResult(Base):
    __tablename__ = TableNames.FEATURE_DATA

    id = Column(
        FeatureColumns.ID,
        Integer,
        Sequence(f"{TableNames.FEATURE_DATA}_SEQ", start=1, increment=1),
        primary_key=True,
    )
    alsalam_id = Column(FeatureColumns.ALSALAM_ID, Integer, ForeignKey(f'{TableNames.ALSALAM_TRANS}.{AlsalamColumns.ID}'), nullable=False, unique=True)
    # Prediction outputs
    fraud = Column(FeatureColumns.FRAUD, Integer)
    risk_score = Column(FeatureColumns.RISK_SCORE, Float)
    
    # Relationship
    alsalam_data = relationship("AlsalamTrans", back_populates="feature_data")
    
    __table_args__ = (
        Index(f'idx_{TableNames.FEATURE_DATA}_fraud_risk', FeatureColumns.FRAUD, FeatureColumns.RISK_SCORE),
        Index(f'idx_{TableNames.FEATURE_DATA}_risk_score_desc', FeatureColumns.RISK_SCORE),
    )


class ModelConfiguration(Base):
    __tablename__ = TableNames.MODEL_CONFIG

    id = Column(
        ModelConfigColumns.ID,
        Integer,
        Sequence(f"{TableNames.MODEL_CONFIG}_SEQ", start=1, increment=1),
        primary_key=True,
    )
    alert_category = Column(ModelConfigColumns.ALERT_CATEGORY, String(255), nullable=False)
    model_name = Column(ModelConfigColumns.MODEL_NAME, String(255), nullable=False)
    model_filename = Column(ModelConfigColumns.MODEL_FILENAME, String(255), nullable=False)
    model_path = Column(ModelConfigColumns.MODEL_PATH, Text, nullable=False)
    model_type = Column(ModelConfigColumns.MODEL_TYPE, Enum(ModelType), nullable=False)
    target_column = Column(ModelConfigColumns.TARGET_COLUMN, String(255), nullable=True)
    feature_mappings = Column(ModelConfigColumns.FEATURE_MAPPINGS, Text, nullable=False)  # Changed from JSON to Text
    created_at = Column(ModelConfigColumns.CREATED_AT, DateTime, default=datetime.utcnow)
    updated_at = Column(ModelConfigColumns.UPDATED_AT, DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    data_files = relationship("DataFile", back_populates="model_config", cascade="all, delete-orphan")
    calculation_results = relationship("CalculationResult", back_populates="model_config", cascade="all, delete-orphan")
    versions = relationship("ModelVersion", back_populates="model_config", cascade="all, delete-orphan")
    retraining_statuses = relationship("RetrainingStatus", back_populates="model_config", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index(f'idx_{TableNames.MODEL_CONFIG}_alert_category', ModelConfigColumns.ALERT_CATEGORY),
    )


class ModelVersion(Base):
    __tablename__ = TableNames.MODEL_VERSION

    id = Column(
        ModelVersionColumns.ID,
        Integer,
        Sequence(f"{TableNames.MODEL_VERSION}_SEQ", start=1, increment=1),
        primary_key=True,
    )
    model_config_id = Column(ModelVersionColumns.MODEL_CONFIG_ID, Integer, ForeignKey(f'{TableNames.MODEL_CONFIG}.{ModelConfigColumns.ID}'), nullable=False)
    version_number = Column(ModelVersionColumns.VERSION_NUMBER, Integer, nullable=False)
    model_path_onnx = Column(ModelVersionColumns.MODEL_PATH_ONNX, String(500), nullable=False)
    model_path_pkl = Column(ModelVersionColumns.MODEL_PATH_PKL, String(500), nullable=False)
    accuracy = Column(ModelVersionColumns.ACCURACY, Float)
    metrics = Column(ModelVersionColumns.METRICS, Text)  # Changed from JSON to Text
    created_at = Column(ModelVersionColumns.CREATED_AT, DateTime, default=datetime.utcnow)
    
    # Relationship
    model_config = relationship("ModelConfiguration", back_populates="versions")
    
    __table_args__ = (
        Index(f'idx_{TableNames.MODEL_VERSION}_config', ModelVersionColumns.MODEL_CONFIG_ID, ModelVersionColumns.VERSION_NUMBER),
    )


class DataFile(Base):
    __tablename__ = TableNames.DATA_FILE

    id = Column(
        DataFileColumns.ID,
        Integer,
        Sequence(f"{TableNames.DATA_FILE}_SEQ", start=1, increment=1),
        primary_key=True,
    )
    model_config_id = Column(DataFileColumns.MODEL_CONFIG_ID, Integer, ForeignKey(f'{TableNames.MODEL_CONFIG}.{ModelConfigColumns.ID}'), nullable=False)
    file_type = Column(DataFileColumns.FILE_TYPE, String(50), nullable=False)
    file_path = Column(DataFileColumns.FILE_PATH, Text, nullable=False)
    file_name = Column(DataFileColumns.FILE_NAME, String(255), nullable=False)
    file_size = Column(DataFileColumns.FILE_SIZE, Integer)
    row_count = Column(DataFileColumns.ROW_COUNT, Integer)
    column_count = Column(DataFileColumns.COLUMN_COUNT, Integer)
    columns_info = Column(DataFileColumns.COLUMNS_INFO, Text)  # Changed from JSON to Text
    uploaded_at = Column(DataFileColumns.UPLOADED_AT, DateTime, default=datetime.utcnow)
    
    # Relationship
    model_config = relationship("ModelConfiguration", back_populates="data_files")
    
    __table_args__ = (
        Index(f'idx_{TableNames.DATA_FILE}_config', DataFileColumns.MODEL_CONFIG_ID),
    )


class CalculationResult(Base):
    __tablename__ = TableNames.CALCULATION_RESULT

    id = Column(
        CalculationResultColumns.ID,
        Integer,
        Sequence(f"{TableNames.CALCULATION_RESULT}_SEQ", start=1, increment=1),
        primary_key=True,
    )
    model_config_id = Column(CalculationResultColumns.MODEL_CONFIG_ID, Integer, ForeignKey(f'{TableNames.MODEL_CONFIG}.{ModelConfigColumns.ID}'), nullable=False)
    calculation_type = Column(CalculationResultColumns.CALCULATION_TYPE, String(100), nullable=False)
    result_data = Column(CalculationResultColumns.RESULT_DATA, Text, nullable=False)  # Changed from JSON to Text
    calculation_metadata = Column(CalculationResultColumns.CALCULATION_METADATA, Text)  # Changed from JSON to Text
    calculated_at = Column(CalculationResultColumns.CALCULATED_AT, DateTime, default=datetime.utcnow)
    
    # Relationship
    model_config = relationship("ModelConfiguration", back_populates="calculation_results")
    
    __table_args__ = (
        Index(f'idx_{TableNames.CALCULATION_RESULT}_config', CalculationResultColumns.MODEL_CONFIG_ID),
        Index(f'idx_{TableNames.CALCULATION_RESULT}_type', CalculationResultColumns.CALCULATION_TYPE),
    )


class AlertCategoryFile(Base):
    __tablename__ = TableNames.ALERT_CATEGORY_FILE

    id = Column(
        AlertCategoryFileColumns.ID,
        Integer,
        Sequence(f"{TableNames.ALERT_CATEGORY_FILE}_SEQ", start=1, increment=1),
        primary_key=True,
    )
    alertcategory = Column(AlertCategoryFileColumns.ALERT_CATEGORY, String(255), unique=True, nullable=False)
    filepath = Column(AlertCategoryFileColumns.FILE_PATH, String(500), nullable=False)
    last_updated = Column(AlertCategoryFileColumns.LAST_UPDATED, DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(AlertCategoryFileColumns.CREATED_AT, DateTime, default=datetime.utcnow)


class RetrainingStatus(Base):
    __tablename__ = TableNames.RETRAINING_STATUS

    id = Column(
        RetrainingStatusColumns.ID,
        Integer,
        Sequence(f"{TableNames.RETRAINING_STATUS}_SEQ", start=1, increment=1),
        primary_key=True,
    )
    model_config_id = Column(RetrainingStatusColumns.MODEL_CONFIG_ID, Integer, ForeignKey(f'{TableNames.MODEL_CONFIG}.{ModelConfigColumns.ID}'), nullable=False)
    alert_category = Column(RetrainingStatusColumns.ALERT_CATEGORY, String(255), nullable=False)
    
    # Current stage information
    current_stage = Column(RetrainingStatusColumns.CURRENT_STAGE, Enum(RetrainingStage), nullable=False, default=RetrainingStage.STARTED)
    stage_status = Column(RetrainingStatusColumns.STAGE_STATUS, String(50), nullable=False, default='in_progress')
    
    # Progress tracking
    total_stages = Column(RetrainingStatusColumns.TOTAL_STAGES, Integer, default=8)
    completed_stages = Column(RetrainingStatusColumns.COMPLETED_STAGES, Integer, default=0)
    progress_percentage = Column(RetrainingStatusColumns.PROGRESS_PERCENTAGE, Integer, default=0)
    
    # Stage details
    stage_details = Column(RetrainingStatusColumns.STAGE_DETAILS, Text)  # Changed from JSON to Text
    error_message = Column(RetrainingStatusColumns.ERROR_MESSAGE, Text)
    
    # Timestamps
    started_at = Column(RetrainingStatusColumns.STARTED_AT, DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(RetrainingStatusColumns.UPDATED_AT, DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(RetrainingStatusColumns.COMPLETED_AT, DateTime)
    
    # Additional metadata
    new_rows_added = Column(RetrainingStatusColumns.NEW_ROWS_ADDED, Integer)
    total_data_rows = Column(RetrainingStatusColumns.TOTAL_DATA_ROWS, Integer)
    version_number = Column(RetrainingStatusColumns.VERSION_NUMBER, Integer)
    
    # Relationship
    model_config = relationship("ModelConfiguration", back_populates="retraining_statuses")
    
    __table_args__ = (
        Index(f'idx_{TableNames.RETRAINING_STATUS}_model_stage', RetrainingStatusColumns.MODEL_CONFIG_ID, RetrainingStatusColumns.CURRENT_STAGE),
        Index(f'idx_{TableNames.RETRAINING_STATUS}_updated', RetrainingStatusColumns.UPDATED_AT),
    )


class Customer(Base):
    __tablename__ = TableNames.CUSTOMER_TABLE

    id = Column(
        CustomerColumns.ID,
        Integer,
        Sequence(f"{TableNames.CUSTOMER_TABLE}_SEQ", start=1, increment=1),
        primary_key=True,
    )
    customer_id = Column(CustomerColumns.CUSTOMER_ID, String(64), nullable=False, unique=True)
    first_name = Column(CustomerColumns.FIRST_NAME, String(100), nullable=False)
    last_name = Column(CustomerColumns.LAST_NAME, String(100), nullable=False)
    email = Column(CustomerColumns.EMAIL, String(255))
    phone = Column(CustomerColumns.PHONE, String(50))
    gender = Column(CustomerColumns.GENDER, String(20))
    age = Column(CustomerColumns.AGE, Integer)
    is_married = Column(CustomerColumns.IS_MARRIED, Boolean, default=False)
    address = Column(CustomerColumns.ADDRESS, String(500))
    merchant_address = Column(CustomerColumns.MERCHANT_ADDRESS, Integer)
    state = Column(CustomerColumns.STATE, String(100))
    geo_location = Column(CustomerColumns.GEO_LOCATION, String(100))
    registered = Column(CustomerColumns.REGISTERED, Date)
    account_holding = Column(CustomerColumns.ACCOUNT_HOLDING, Integer)
    loan_account = Column(CustomerColumns.LOAN_ACCOUNT, String(10))
    current_balance = Column(CustomerColumns.CURRENT_BALANCE, Float)
    income = Column(CustomerColumns.INCOME, Float)
    orders = Column(CustomerColumns.ORDERS, Integer, default=0)
    spent = Column(CustomerColumns.SPENT, Float, default=0.0)
    job = Column(CustomerColumns.JOB, String(255))
    hobbies = Column(CustomerColumns.HOBBIES, String(500))
    vulnerability = Column(CustomerColumns.VULNERABILITY, Integer, default=0)
    device_id = Column(CustomerColumns.DEVICE_ID, String(50))
    created_at = Column(CustomerColumns.CREATED_AT, DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(CustomerColumns.UPDATED_AT, DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_customer_email_1', CustomerColumns.EMAIL),
        Index('idx_customer_name_1', CustomerColumns.FIRST_NAME, CustomerColumns.LAST_NAME),
        Index('idx_customer_state_vulnerability_1', CustomerColumns.STATE, CustomerColumns.VULNERABILITY),
        Index('idx_customer_balance_income_1', CustomerColumns.CURRENT_BALANCE, CustomerColumns.INCOME),
        Index('idx_customer_age_married_1', CustomerColumns.AGE, CustomerColumns.IS_MARRIED),
        Index('idx_customer_spent_1', CustomerColumns.SPENT),
        Index('idx_customer_registered_1', CustomerColumns.REGISTERED),
        Index('idx_customer_device_1', CustomerColumns.DEVICE_ID),
        Index('idx_customer_age_1', CustomerColumns.AGE),
        Index('idx_customer_vulnerability_1', CustomerColumns.VULNERABILITY),
        Index('idx_customer_balance_1', CustomerColumns.CURRENT_BALANCE),
        Index('idx_customer_income_1', CustomerColumns.INCOME),
    )

    def __repr__(self):
        return f"<Customer(id={self.customer_id}, name='{self.first_name} {self.last_name}', email='{self.email}')>"

    def get_full_name(self):
        """Returns customer's full name"""
        return f"{self.first_name} {self.last_name}"

    def is_vulnerable(self):
        """Check if customer is marked as vulnerable"""
        return self.vulnerability == 1

    def has_loan(self):
        """Check if customer has an active loan"""
        return self.loan_account and self.loan_account.lower() == 'yes'

    def get_balance_status(self):
        """Returns balance status category"""
        if self.current_balance is None:
            return 'Unknown'
        elif self.current_balance < 100:
            return 'Low'
        elif self.current_balance < 1000:
            return 'Medium'
        else:
            return 'High'
        

class FeatureTable(Base):
    __tablename__ = TableNames.FEATURETABLE

    id = Column(
        FeatureTableColumns.ID,
        Integer,
        Sequence(f"{TableNames.FEATURETABLE}_SEQ", start=1, increment=1),
        primary_key=True,
    )
    name = Column(FeatureTableColumns.NAME, String(100), nullable=False)
    channel = Column(FeatureTableColumns.CHANNEL, String(50), nullable=False)
    Query = Column(FeatureTableColumns.QUERY, Text)
    description = Column(FeatureTableColumns.DESCRIPTION, Text)
    workflow_id = Column(FeatureTableColumns.WORKFLOW_ID, Integer)
    created_at = Column(FeatureTableColumns.CREATED, DateTime, nullable=False)
    updated_at = Column(FeatureTableColumns.UPDATED_AT, DateTime, nullable=False)

class RiskTable(Base):
    __tablename__ = TableNames.RISKTABLE

    id = Column(
        RiskTableColumn.id,
        Integer,
        Sequence(f"{TableNames.RISKTABLE}_SEQ", start=1, increment=1),
        primary_key=True,
    )
    customer_id = Column(RiskTableColumn.customer_id, String(100), nullable=False)
    weekly_avg_debit_amount = Column(RiskTableColumn.weekly_avg_debit_amount, Float)
    monthly_avg_debit_amount = Column(RiskTableColumn.monthly_avg_debit_amount,Float)
    most_active_weekday = Column(RiskTableColumn.most_active_weekday,Float)
    most_active_hour = Column(RiskTableColumn.most_active_hour,Float)
    weekly_low_avg_amount = Column(RiskTableColumn.weekly_low_avg_amount,Float)
    weekly_high_avg_amount = Column(RiskTableColumn.weekly_high_avg_amount,Float)
    foreign_transaction_flag = Column(RiskTableColumn.foreign_transaction_flag,Float)
    volatility_risk = Column(RiskTableColumn.volatility_risk,Float)
    deviation_risk = Column(RiskTableColumn.deviation_risk,Float)
    time_risk = Column(RiskTableColumn.time_risk,Float)
    foreign_risk = Column(RiskTableColumn.foreign_risk,Float)
    risk_score = Column(RiskTableColumn.risk_score,Float)
    risk_probability = Column(RiskTableColumn.risk_probability,Float)
    risk_level = Column(RiskTableColumn.risk_level, String(15))


# --------------------FOR MYSQL---------------------------------
# class User(Base):
#     __tablename__ = TableNames.USER_TABLE

#     id = Column(UserColumns.ID, Integer, primary_key=True, autoincrement=True)
#     username = Column(UserColumns.USERNAME, String(255), unique=True, nullable=False, index=True)
#     password_hash = Column(UserColumns.PASSWORD_HASH, String(255), nullable=False)
#     email = Column(UserColumns.EMAIL, String(255), unique=True, nullable=True)
#     full_name = Column(UserColumns.FULL_NAME, String(255), nullable=True)

#     __table_args__ = (
#         Index('idx_username', UserColumns.USERNAME),
#         Index('idx_email', UserColumns.EMAIL),
#     )

# class UserBase(Base):
#     __tablename__ = TableNames.USERBASE_TABLE

#     id = Column(UserBaseColumns.ID, Integer, primary_key=True, autoincrement=True)
#     User_id = Column(UserBaseColumns.USER_ID, String(50), unique=True, nullable=False, index=True)
#     user_type = Column(UserBaseColumns.USER_TYPE, Enum(UserType), default=UserType.USER, nullable=False, index=True)
#     is_active = Column(UserBaseColumns.IS_ACTIVE, Integer, default=1, nullable=False)
#     created_at = Column(UserBaseColumns.CREATED_AT, DateTime, default=datetime.utcnow, nullable=False)
#     updated_at = Column(UserBaseColumns.UPDATED_AT, DateTime, default=None, nullable=True)
#     last_login = Column(UserBaseColumns.LAST_LOGIN, DateTime, default=None, nullable=True)

#     __table_args__ = (
#         Index('idx_userbase_userid', UserBaseColumns.USER_ID),
#         Index('idx_userbase_user_type', UserBaseColumns.USER_TYPE),
#         Index('idx_userbase_active', UserBaseColumns.IS_ACTIVE),
#     )

# class Alert(Base):
#     __tablename__ = TableNames.ALERTS
    
#     id = Column(AlertColumns.ID, Integer, primary_key=True, index=True, autoincrement=True)
#     alert_category = Column(AlertColumns.CATEGORY, String(255), unique=True, nullable=False, index=True)
#     model_path = Column(AlertColumns.MODEL_PATH, String(255))
#     retrain_date = Column(AlertColumns.RETRAIN_DATE, Date, nullable=False)
#     updated_date = Column(AlertColumns.UPDATED_DATE, DateTime, nullable=False, default=func.now(), server_default=func.now())

# class AlsalamTrans(Base):
#     __tablename__ = TableNames.ALSALAM_TRANS
    
#     id = Column(AlsalamColumns.ID, Integer, primary_key=True, autoincrement=True)
#     Customer_Id = Column(AlsalamColumns.CUSTOMER_ID, Text, nullable=False, index=True)
#     Timestamp = Column(AlsalamColumns.TIMESTAMP, DateTime, nullable=False, index=True)
#     Amount = Column(AlsalamColumns.AMOUNT, Float, nullable=False, index=True)
#     Location = Column(AlsalamColumns.LOCATION, String(255), index=True)
#     To_Customer_Id = Column(AlsalamColumns.TO_CUSTOMER_ID, Text, index=True)
    
#     # Relationship (already correct)
#     feature_data = relationship("ALSalamModelResult", back_populates="alsalam_data", uselist=False)
    
#     __table_args__ = (
#         Index(f'idx_{TableNames.ALSALAM_TRANS}_customer_timestamp', AlsalamColumns.CUSTOMER_ID, AlsalamColumns.TIMESTAMP),
#         Index(f'idx_{TableNames.ALSALAM_TRANS}_customer_amount', AlsalamColumns.CUSTOMER_ID, AlsalamColumns.AMOUNT),
#         Index(f'idx_{TableNames.ALSALAM_TRANS}_timestamp_amount', AlsalamColumns.TIMESTAMP, AlsalamColumns.AMOUNT),
#         Index(f'idx_{TableNames.ALSALAM_TRANS}_location_timestamp', AlsalamColumns.LOCATION, AlsalamColumns.TIMESTAMP),
#     )

# class ALSalamModelResult(Base):
#     __tablename__ = TableNames.FEATURE_DATA
    
#     id = Column(FeatureColumns.ID, Integer, primary_key=True, autoincrement=True)
#     alsalam_id = Column(FeatureColumns.ALSALAM_ID, Integer, ForeignKey(f'{TableNames.ALSALAM_TRANS}.{AlsalamColumns.ID}'), nullable=False, index=True, unique=True)
#     # Prediction outputs
#     fraud = Column(FeatureColumns.FRAUD, Integer, index=True)
#     risk_score = Column(FeatureColumns.RISK_SCORE, Float, index=True)
    
#     # Relationship (already correct)
#     alsalam_data = relationship("AlsalamTrans", back_populates="feature_data")
    
#     __table_args__ = (
#         Index(f'idx_{TableNames.FEATURE_DATA}_fraud_risk', FeatureColumns.FRAUD, FeatureColumns.RISK_SCORE),
#         Index(f'idx_{TableNames.FEATURE_DATA}_risk_score_desc', FeatureColumns.RISK_SCORE),
#     )

# class ModelConfiguration(Base):
#     __tablename__ = TableNames.MODEL_CONFIG
    
#     id = Column(ModelConfigColumns.ID, Integer, primary_key=True, index=True)
#     alert_category = Column(ModelConfigColumns.ALERT_CATEGORY, String(255), nullable=False)
#     model_name = Column(ModelConfigColumns.MODEL_NAME, String(255), nullable=False)
#     model_filename = Column(ModelConfigColumns.MODEL_FILENAME, String(255), nullable=False)
#     model_path = Column(ModelConfigColumns.MODEL_PATH, Text, nullable=False)
#     model_type = Column(ModelConfigColumns.MODEL_TYPE, Enum(ModelType), nullable=False)
#     target_column = Column(ModelConfigColumns.TARGET_COLUMN, String(255), nullable=True)
#     feature_mappings = Column(ModelConfigColumns.FEATURE_MAPPINGS, JSON, nullable=False)
#     created_at = Column(ModelConfigColumns.CREATED_AT, DateTime, default=datetime.utcnow)
#     updated_at = Column(ModelConfigColumns.UPDATED_AT, DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
#     # FIXED back_populates: point to attribute names (not table names)
#     data_files = relationship("DataFile", back_populates="model_config", cascade="all, delete-orphan")
#     calculation_results = relationship("CalculationResult", back_populates="model_config", cascade="all, delete-orphan")
#     versions = relationship("ModelVersion", back_populates="model_config", cascade="all, delete-orphan")
#     retraining_statuses = relationship("RetrainingStatus", back_populates="model_config", cascade="all, delete-orphan")
    
#     __table_args__ = (
#         Index(f'idx_{TableNames.MODEL_CONFIG}_alert_category', ModelConfigColumns.ALERT_CATEGORY),
#     )

# class ModelVersion(Base):
#     __tablename__ = TableNames.MODEL_VERSION
    
#     id = Column(ModelVersionColumns.ID, Integer, primary_key=True, index=True)
#     model_config_id = Column(ModelVersionColumns.MODEL_CONFIG_ID, Integer, ForeignKey(f'{TableNames.MODEL_CONFIG}.{ModelConfigColumns.ID}'), nullable=False)
#     version_number = Column(ModelVersionColumns.VERSION_NUMBER, Integer, nullable=False)
#     model_path_onnx = Column(ModelVersionColumns.MODEL_PATH_ONNX, String(500), nullable=False)
#     model_path_pkl = Column(ModelVersionColumns.MODEL_PATH_PKL, String(500), nullable=False)
#     accuracy = Column(ModelVersionColumns.ACCURACY, Float)
#     metrics = Column(ModelVersionColumns.METRICS, JSON)
#     created_at = Column(ModelVersionColumns.CREATED_AT, DateTime, default=datetime.utcnow)
    
#     # FIXED back_populates
#     model_config = relationship("ModelConfiguration", back_populates="versions")
    
#     __table_args__ = (
#         Index(f'idx_{TableNames.MODEL_VERSION}_config', ModelVersionColumns.MODEL_CONFIG_ID, ModelVersionColumns.VERSION_NUMBER),
#     )

# class DataFile(Base):
#     __tablename__ = TableNames.DATA_FILE
    
#     id = Column(DataFileColumns.ID, Integer, primary_key=True, index=True)
#     model_config_id = Column(DataFileColumns.MODEL_CONFIG_ID, Integer, ForeignKey(f'{TableNames.MODEL_CONFIG}.{ModelConfigColumns.ID}'), nullable=False)
#     file_type = Column(DataFileColumns.FILE_TYPE, String(50), nullable=False)
#     file_path = Column(DataFileColumns.FILE_PATH, Text, nullable=False)
#     file_name = Column(DataFileColumns.FILE_NAME, String(255), nullable=False)
#     file_size = Column(DataFileColumns.FILE_SIZE, Integer)
#     row_count = Column(DataFileColumns.ROW_COUNT, Integer)
#     column_count = Column(DataFileColumns.COLUMN_COUNT, Integer)
#     columns_info = Column(DataFileColumns.COLUMNS_INFO, JSON)
#     uploaded_at = Column(DataFileColumns.UPLOADED_AT, DateTime, default=datetime.utcnow)
    
#     # FIXED back_populates
#     model_config = relationship("ModelConfiguration", back_populates="data_files")
    
#     __table_args__ = (
#         Index(f'idx_{TableNames.DATA_FILE}_config', DataFileColumns.MODEL_CONFIG_ID),
#     )

# class CalculationResult(Base):
#     __tablename__ = TableNames.CALCULATION_RESULT
    
#     id = Column(CalculationResultColumns.ID, Integer, primary_key=True, index=True)
#     model_config_id = Column(CalculationResultColumns.MODEL_CONFIG_ID, Integer, ForeignKey(f'{TableNames.MODEL_CONFIG}.{ModelConfigColumns.ID}'), nullable=False)
#     calculation_type = Column(CalculationResultColumns.CALCULATION_TYPE, String(100), nullable=False)
#     result_data = Column(CalculationResultColumns.RESULT_DATA, JSON, nullable=False)
#     calculation_metadata = Column(CalculationResultColumns.CALCULATION_METADATA, JSON)
#     calculated_at = Column(CalculationResultColumns.CALCULATED_AT, DateTime, default=datetime.utcnow)
    
#     # FIXED back_populates
#     model_config = relationship("ModelConfiguration", back_populates="calculation_results")
    
#     __table_args__ = (
#         Index(f'idx_{TableNames.CALCULATION_RESULT}_config', CalculationResultColumns.MODEL_CONFIG_ID),
#         Index(f'idx_{TableNames.CALCULATION_RESULT}_type', CalculationResultColumns.CALCULATION_TYPE),
#     )

# class AlertCategoryFile(Base):
#     __tablename__ = TableNames.ALERT_CATEGORY_FILE
    
#     id = Column(AlertCategoryFileColumns.ID, Integer, primary_key=True, autoincrement=True)
#     alertcategory = Column(AlertCategoryFileColumns.ALERT_CATEGORY, String(255), unique=True, nullable=False, index=True)
#     filepath = Column(AlertCategoryFileColumns.FILE_PATH, String(500), nullable=False)
#     last_updated = Column(AlertCategoryFileColumns.LAST_UPDATED, DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
#     created_at = Column(AlertCategoryFileColumns.CREATED_AT, DateTime, default=datetime.utcnow)
    
#     __table_args__ = (
#         Index(f'idx_{TableNames.ALERT_CATEGORY_FILE}_category', AlertCategoryFileColumns.ALERT_CATEGORY),
#     )

# class RetrainingStatus(Base):
#     __tablename__ = TableNames.RETRAINING_STATUS
    
#     id = Column(RetrainingStatusColumns.ID, Integer, primary_key=True, autoincrement=True)
#     model_config_id = Column(RetrainingStatusColumns.MODEL_CONFIG_ID, Integer, ForeignKey(f'{TableNames.MODEL_CONFIG}.{ModelConfigColumns.ID}'), nullable=False, index=True)
#     alert_category = Column(RetrainingStatusColumns.ALERT_CATEGORY, String(255), nullable=False)
    
#     # Current stage information
#     current_stage = Column(RetrainingStatusColumns.CURRENT_STAGE, Enum(RetrainingStage), nullable=False, default=RetrainingStage.STARTED)
#     stage_status = Column(RetrainingStatusColumns.STAGE_STATUS, String(50), nullable=False, default='in_progress')  # in_progress, completed, failed
    
#     # Progress tracking
#     total_stages = Column(RetrainingStatusColumns.TOTAL_STAGES, Integer, default=8)
#     completed_stages = Column(RetrainingStatusColumns.COMPLETED_STAGES, Integer, default=0)
#     progress_percentage = Column(RetrainingStatusColumns.PROGRESS_PERCENTAGE, Integer, default=0)
    
#     # Stage details
#     stage_details = Column(RetrainingStatusColumns.STAGE_DETAILS, JSON)  # Store stage-specific information
#     error_message = Column(RetrainingStatusColumns.ERROR_MESSAGE, Text)  # Store error if failed
    
#     # Timestamps
#     started_at = Column(RetrainingStatusColumns.STARTED_AT, DateTime, nullable=False, default=datetime.utcnow)
#     updated_at = Column(RetrainingStatusColumns.UPDATED_AT, DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
#     completed_at = Column(RetrainingStatusColumns.COMPLETED_AT, DateTime)
    
#     # Additional metadata
#     new_rows_added = Column(RetrainingStatusColumns.NEW_ROWS_ADDED, Integer)
#     total_data_rows = Column(RetrainingStatusColumns.TOTAL_DATA_ROWS, Integer)
#     version_number = Column(RetrainingStatusColumns.VERSION_NUMBER, Integer)
    
#     # FIXED back_populates
#     model_config = relationship("ModelConfiguration", back_populates="retraining_statuses")
    
#     __table_args__ = (
#         Index(f'idx_{TableNames.RETRAINING_STATUS}_model_stage', RetrainingStatusColumns.MODEL_CONFIG_ID, RetrainingStatusColumns.CURRENT_STAGE),
#         Index(f'idx_{TableNames.RETRAINING_STATUS}_updated', RetrainingStatusColumns.UPDATED_AT),
#     )

# class Customer(Base):
#     __tablename__ = TableNames.CUSTOMER_TABLE

#     id = Column(CustomerColumns.ID, Integer, primary_key=True, autoincrement=True)
#     customer_id = Column(CustomerColumns.CUSTOMER_ID, Text, nullable=False, unique=True, index=True)
#     first_name = Column(CustomerColumns.FIRST_NAME, String(100), nullable=False)
#     last_name = Column(CustomerColumns.LAST_NAME, String(100), nullable=False)
#     email = Column(CustomerColumns.EMAIL, String(255), index=True)
#     phone = Column(CustomerColumns.PHONE, String(50))
#     gender = Column(CustomerColumns.GENDER, String(20))
#     age = Column(CustomerColumns.AGE, Integer, index=True)
#     is_married = Column(CustomerColumns.IS_MARRIED, Boolean, default=False, index=True)
#     address = Column(CustomerColumns.ADDRESS, String(500))
#     merchant_address = Column(CustomerColumns.MERCHANT_ADDRESS, Integer)
#     state = Column(CustomerColumns.STATE, String(100), index=True)
#     geo_location = Column(CustomerColumns.GEO_LOCATION, String(100))
#     registered = Column(CustomerColumns.REGISTERED, Date)
#     account_holding = Column(CustomerColumns.ACCOUNT_HOLDING, Integer)
#     loan_account = Column(CustomerColumns.LOAN_ACCOUNT, String(10))
#     current_balance = Column(CustomerColumns.CURRENT_BALANCE, Float, index=True)
#     income = Column(CustomerColumns.INCOME, Float, index=True)
#     orders = Column(CustomerColumns.ORDERS, Integer, default=0)
#     spent = Column(CustomerColumns.SPENT, Float, default=0.0, index=True)
#     job = Column(CustomerColumns.JOB, String(255))
#     hobbies = Column(CustomerColumns.HOBBIES, String(500))
#     vulnerability = Column(CustomerColumns.VULNERABILITY, Integer, default=0, index=True)
#     device_id = Column(CustomerColumns.DEVICE_ID, String(50), index=True)
#     created_at = Column(CustomerColumns.CREATED_AT, DateTime, default=datetime.utcnow, nullable=False)
#     updated_at = Column(CustomerColumns.UPDATED_AT, DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

#     __table_args__ = (
#         Index('idx_customer_name', CustomerColumns.FIRST_NAME, CustomerColumns.LAST_NAME),
#         Index('idx_customer_state_vulnerability', CustomerColumns.STATE, CustomerColumns.VULNERABILITY),
#         Index('idx_customer_balance_income', CustomerColumns.CURRENT_BALANCE, CustomerColumns.INCOME),
#         Index('idx_customer_age_married', CustomerColumns.AGE, CustomerColumns.IS_MARRIED),
#         Index('idx_customer_spent', CustomerColumns.SPENT),
#         Index('idx_customer_registered', CustomerColumns.REGISTERED),
#     )

#     def __repr__(self):
#         return f"<Customer(id={self.customer_id}, name='{self.first_name} {self.last_name}', email='{self.email}')>"

#     def get_full_name(self):
#         """Returns customer's full name"""
#         return f"{self.first_name} {self.last_name}"

#     def is_vulnerable(self):
#         """Check if customer is marked as vulnerable"""
#         return self.vulnerability == 1

#     def has_loan(self):
#         """Check if customer has an active loan"""
#         return self.loan_account and self.loan_account.lower() == 'yes'

#     def get_balance_status(self):
#         """Returns balance status category"""
#         if self.current_balance is None:
#             return 'Unknown'
#         elif self.current_balance < 100:
#             return 'Low'
#         elif self.current_balance < 1000:
#             return 'Medium'
#         else:
#             return 'High'