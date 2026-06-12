import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging
from utils.log_utils import session_logger as logger

# logger = logging.getLogger(__name__)


class FeatureEngineering:
    
    @staticmethod
    def create_time_based_features(df: pd.DataFrame, 
                                  timestamp_col: str = 'Timestamp') -> pd.DataFrame:
        
        if timestamp_col in df.columns:
            df[timestamp_col] = pd.to_datetime(df[timestamp_col])
            df['hour'] = df[timestamp_col].dt.hour
            df['day_of_week'] = df[timestamp_col].dt.dayofweek
            df['month'] = df[timestamp_col].dt.month
            df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
            df['is_odd_hour'] = (df['hour'] % 2 == 1).astype(int)
            df['is_night'] = ((df['hour'] >= 22) | (df['hour'] <= 6)).astype(int)
        
        return df
    
    @staticmethod
    def create_transaction_aggregates(df: pd.DataFrame,
                                     customer_col: str = 'Customer_Id',
                                     amount_col: str = 'Amount',
                                     timestamp_col: str = 'Timestamp') -> pd.DataFrame:
        
        if all(col in df.columns for col in [customer_col, amount_col, timestamp_col]):
            df[timestamp_col] = pd.to_datetime(df[timestamp_col])
            
            df = df.sort_values([customer_col, timestamp_col])
            
            for window in ['10min', '1H', '1D', '7D', '30D']:
                window_seconds = pd.Timedelta(window).total_seconds()
                
                df[f'tran_count_{window}'] = df.groupby(customer_col)[timestamp_col].transform(
                    lambda x: x.rolling(window, min_periods=1).count()
                )
                
                df[f'tran_amount_{window}'] = df.groupby(customer_col)[amount_col].transform(
                    lambda x: x.rolling(window, min_periods=1).sum()
                )
                
                df[f'tran_avg_{window}'] = df.groupby(customer_col)[amount_col].transform(
                    lambda x: x.rolling(window, min_periods=1).mean()
                )
        
        return df
    
    @staticmethod
    def create_location_features(df: pd.DataFrame,
                                location_col: str = 'Location',
                                customer_col: str = 'Customer_Id') -> pd.DataFrame:
        
        if location_col in df.columns and customer_col in df.columns:
            df['location_change'] = df.groupby(customer_col)[location_col].transform(
                lambda x: (x != x.shift()).astype(int)
            )
            
            df['unique_locations'] = df.groupby(customer_col)[location_col].transform('nunique')
            
            location_freq = df[location_col].value_counts(normalize=True).to_dict()
            df['location_frequency'] = df[location_col].map(location_freq)
        
        return df
    
    @staticmethod
    def create_amount_features(df: pd.DataFrame,
                              amount_col: str = 'Amount') -> pd.DataFrame:
        
        if amount_col in df.columns:
            df['amount_log'] = np.log1p(df[amount_col])
            
            df['amount_zscore'] = (df[amount_col] - df[amount_col].mean()) / df[amount_col].std()
            
            df['amount_above_50k'] = (df[amount_col] > 50000).astype(int)
            df['amount_above_100k'] = (df[amount_col] > 100000).astype(int)
            
            df['amount_rounded'] = (df[amount_col] % 1000 == 0).astype(int)
            
            df['count_of_9_in_amount'] = df[amount_col].astype(str).str.count('9')
        
        return df
    
    @staticmethod
    def create_velocity_features(df: pd.DataFrame,
                                customer_col: str = 'Customer_Id',
                                timestamp_col: str = 'Timestamp') -> pd.DataFrame:
        
        if customer_col in df.columns and timestamp_col in df.columns:
            df[timestamp_col] = pd.to_datetime(df[timestamp_col])
            df = df.sort_values([customer_col, timestamp_col])
            
            df['time_since_last_transaction'] = df.groupby(customer_col)[timestamp_col].diff().dt.total_seconds() / 60
            
            df['transaction_velocity'] = 1 / (df['time_since_last_transaction'] + 1)
            
            df['is_rapid_transaction'] = (df['time_since_last_transaction'] < 5).astype(int)
        
        return df
    
    @staticmethod
    def create_ratio_features(df: pd.DataFrame) -> pd.DataFrame:
        
        ratio_pairs = [
            ('tran_count_10min', 'tran_count_1D', 'tran_ratio_count_10min_1d'),
            ('tran_count_1D', 'tran_count_30D', 'tran_ratio_count_1d_30d'),
            ('tran_amount_10min', 'tran_amount_1D', 'tran_ratio_amount_10min_1d'),
            ('tran_amount_1D', 'tran_amount_30D', 'tran_ratio_amount_1d_30d')
        ]
        
        for num_col, denom_col, ratio_col in ratio_pairs:
            if num_col in df.columns and denom_col in df.columns:
                df[ratio_col] = df[num_col] / (df[denom_col] + 1)
        
        return df
    
    @staticmethod
    def handle_missing_values(df: pd.DataFrame,
                             strategy: str = 'mean',
                             columns: Optional[List[str]] = None) -> pd.DataFrame:
        
        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns.tolist()
        
        for col in columns:
            if col in df.columns:
                if strategy == 'mean':
                    df[col].fillna(df[col].mean(), inplace=True)
                elif strategy == 'median':
                    df[col].fillna(df[col].median(), inplace=True)
                elif strategy == 'zero':
                    df[col].fillna(0, inplace=True)
                elif strategy == 'forward':
                    df[col].fillna(method='ffill', inplace=True)
                elif strategy == 'backward':
                    df[col].fillna(method='bfill', inplace=True)
        
        return df
    
    @staticmethod
    def apply_all_features(df: pd.DataFrame,
                          feature_config: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
        
        if feature_config is None:
            feature_config = {}
        
        if feature_config.get('time_features', True):
            df = FeatureEngineering.create_time_based_features(df)
        
        if feature_config.get('transaction_aggregates', True):
            df = FeatureEngineering.create_transaction_aggregates(df)
        
        if feature_config.get('location_features', True):
            df = FeatureEngineering.create_location_features(df)
        
        if feature_config.get('amount_features', True):
            df = FeatureEngineering.create_amount_features(df)
        
        if feature_config.get('velocity_features', True):
            df = FeatureEngineering.create_velocity_features(df)
        
        if feature_config.get('ratio_features', True):
            df = FeatureEngineering.create_ratio_features(df)
        
        if feature_config.get('handle_missing', True):
            strategy = feature_config.get('missing_strategy', 'zero')
            df = FeatureEngineering.handle_missing_values(df, strategy=strategy)
        
        return df


class DataValidator:
    
    @staticmethod
    def validate_dataframe(df: pd.DataFrame,
                          required_columns: List[str],
                          numeric_columns: Optional[List[str]] = None) -> Dict[str, Any]:
        
        validation_results = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "data_quality": {}
        }
        
        missing_columns = set(required_columns) - set(df.columns)
        if missing_columns:
            validation_results["is_valid"] = False
            validation_results["errors"].append(f"Missing required columns: {missing_columns}")
        
        if df.empty:
            validation_results["is_valid"] = False
            validation_results["errors"].append("DataFrame is empty")
            return validation_results
        
        validation_results["data_quality"]["total_rows"] = len(df)
        validation_results["data_quality"]["total_columns"] = len(df.columns)
        
        null_counts = df.isnull().sum()
        validation_results["data_quality"]["null_counts"] = null_counts.to_dict()
        
        high_null_columns = null_counts[null_counts > len(df) * 0.5]
        if not high_null_columns.empty:
            validation_results["warnings"].append(
                f"Columns with >50% null values: {high_null_columns.index.tolist()}"
            )
        
        duplicate_rows = df.duplicated().sum()
        validation_results["data_quality"]["duplicate_rows"] = int(duplicate_rows)
        if duplicate_rows > 0:
            validation_results["warnings"].append(f"Found {duplicate_rows} duplicate rows")
        
        if numeric_columns:
            for col in numeric_columns:
                if col in df.columns:
                    try:
                        pd.to_numeric(df[col], errors='coerce')
                    except:
                        validation_results["errors"].append(f"Column {col} cannot be converted to numeric")
                        validation_results["is_valid"] = False
        
        return validation_results
    
    @staticmethod
    def validate_target_distribution(df: pd.DataFrame,
                                    target_column: str,
                                    min_samples_per_class: int = 10) -> Dict[str, Any]:
        
        if target_column not in df.columns:
            return {
                "is_valid": False,
                "error": f"Target column {target_column} not found"
            }
        
        target_counts = df[target_column].value_counts()
        
        validation = {
            "is_valid": True,
            "class_distribution": target_counts.to_dict(),
            "total_classes": len(target_counts),
            "warnings": []
        }
        
        for class_label, count in target_counts.items():
            if count < min_samples_per_class:
                validation["warnings"].append(
                    f"Class {class_label} has only {count} samples (minimum: {min_samples_per_class})"
                )
        
        imbalance_ratio = target_counts.max() / target_counts.min()
        if imbalance_ratio > 10:
            validation["warnings"].append(
                f"High class imbalance detected (ratio: {imbalance_ratio:.2f})"
            )
        
        validation["imbalance_ratio"] = float(imbalance_ratio)
        
        return validation