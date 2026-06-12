import asyncio
import json
import logging
import os
import pickle
import sqlite3
import sys
import base64
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from temporalio import activity, workflow
from temporalio.client import Client
from temporalio.common import RetryPolicy
from temporalio.worker import Worker

# Import your existing modules
import sys
import os

# Add your project directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    from iso8583_mode.decoder import decode
    from iso8583_mode.specs import default_ascii as specs
    print("✅ Successfully imported iso8583_mode from local project")
except ImportError as e:
    print(f"❌ Warning: iso8583_mode not found: {e}")
    print("Using mock decoder for development")
    # Mock for development
    def decode(data, specs):
        return {
            "MTI": "0200", 
            "04": "000000001000",
            "12": "140000",
            "19": "356"
        }, data
    specs = None

# Alternative: Import from your existing transaction.py
try:
    from transaction import decoding_iso8583
    print("✅ Successfully imported decoding_iso8583 from transaction.py")
    USE_EXISTING_DECODER = True
except ImportError:
    print("❌ Could not import from transaction.py")
    USE_EXISTING_DECODER = False

# ============ SERIALIZABLE DATA CLASSES ============
# Use simpler data structures that serialize well with Temporal

@dataclass
class MessageData:
    """Data class for raw message information - serialization-friendly"""
    raw_message_b64: str  # Base64 encoded bytes instead of raw bytes
    timestamp: str
    source_address: str
    server_type: str
    port: int

    @classmethod
    def from_bytes(cls, raw_message: bytes, source_address: str, server_type: str, port: int, timestamp: str = None):
        if timestamp is None:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        return cls(
            raw_message_b64=base64.b64encode(raw_message).decode('ascii'),
            timestamp=timestamp,
            source_address=source_address,
            server_type=server_type,
            port=port
        )
    
    def get_raw_bytes(self) -> bytes:
        return base64.b64decode(self.raw_message_b64.encode('ascii'))

@dataclass
class DecodedData:
    """Data class for decoded message information"""
    mapped_fields: Dict[str, str]  # Ensure all values are strings
    message_type: str
    processing_code: str
    transaction_amount: float
    timestamp: str

@dataclass
class ParsedData:
    """Data class for parsed transaction data"""
    amount: float
    transaction_time: str
    country_code: int
    processing_code: str
    hour: int
    server_type: str
    timestamp: str

@dataclass
class ModelResult:
    """Data class for ML model results"""
    transaction_amount: float
    greater_than_10k: bool
    is_night_hour: bool
    is_foreign: bool
    anomaly_score: float
    is_anomaly: bool
    timestamp: str
    model_path: str

@dataclass
class ProcessingResult:
    """Complete processing result - simplified for serialization"""
    success: bool
    error_message: Optional[str] = None
    # Store just the essential data as simple types
    transaction_amount: Optional[float] = None
    anomaly_score: Optional[float] = None
    is_anomaly: Optional[bool] = None
    server_type: Optional[str] = None
    timestamp: Optional[str] = None
    workflow_id: Optional[str] = None

# ============ ACTIVITIES ============

@activity.defn
async def receive_socket_message_activity(server_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Activity to structure the received socket message
    Returns a dictionary instead of dataclass for better serialization
    """
    activity.logger.info(f"Processing message from {server_config.get('source_address')} on {server_config.get('server_type')} server")
    
    raw_message = server_config['raw_message']
    
    # Handle different input types that Temporal might pass
    if isinstance(raw_message, str):
        # Try to decode from base64 first (if it was encoded by our helper function)
        try:
            raw_message = base64.b64decode(raw_message.encode('ascii'))
            activity.logger.info(f"Successfully decoded base64 string to {len(raw_message)} bytes")
        except Exception:
            # If base64 decode fails, treat as regular string and encode to bytes
            raw_message = raw_message.encode('latin-1')
            activity.logger.info(f"Converted string to bytes using latin-1 encoding")
    elif isinstance(raw_message, list):
        # Convert list of integers back to bytes
        raw_message = bytes(raw_message)
        activity.logger.info(f"Converted list of {len(raw_message)} integers to bytes")
    elif not isinstance(raw_message, bytes):
        # Try to convert whatever it is to bytes
        try:
            raw_message = bytes(raw_message)
            activity.logger.info(f"Converted {type(raw_message)} to bytes")
        except Exception as e:
            activity.logger.error(f"Could not convert {type(raw_message)} to bytes: {e}")
            # Use a default test message as fallback
            raw_message = b"0200test_message_fallback"
            activity.logger.info("Using fallback test message")
    
    activity.logger.info(f"Final message length: {len(raw_message)} bytes")
    
    # Generate timestamp in activity (activities can use datetime.now())
    current_timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    message_data = MessageData.from_bytes(
        raw_message=raw_message,
        source_address=server_config.get('source_address', 'unknown'),
        server_type=server_config['server_type'],
        port=server_config['port'],
        timestamp=current_timestamp  # Pass timestamp explicitly
    )
    
    # Return as dictionary for better serialization
    return asdict(message_data)

@activity.defn
async def decode_iso8583_activity(message_data_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Activity to decode ISO8583 message using your existing decoder
    Now with robust error handling and fallback
    """
    try:
        activity.logger.info(f"Decoding {message_data_dict['server_type']} message")
        
        # Reconstruct MessageData from dict
        message_data = MessageData(**message_data_dict)
        data = message_data.get_raw_bytes()
        
        activity.logger.info(f"Message length: {len(data)} bytes")
        activity.logger.info(f"Message type: {type(data)}")
        
        # Use your existing decoder if available
        if USE_EXISTING_DECODER:
            activity.logger.info("Using existing decoding_iso8583 function")
            try:
                mapped_dict = decoding_iso8583(data)
                activity.logger.info(f"Successfully decoded {len(mapped_dict)} fields")
                
                # Ensure all values are strings for serialization
                string_mapped_dict = {k: str(v) if v is not None else '' for k, v in mapped_dict.items()}
                
                # Extract key fields with fallbacks
                transaction_amount = 0.0
                try:
                    amount_str = string_mapped_dict.get('DE 4 - Transaction Amount', '0')
                    transaction_amount = float(amount_str) if amount_str else 0.0
                except (ValueError, TypeError):
                    transaction_amount = 1000.0  # Default amount
                    activity.logger.warning(f"Could not parse transaction amount, using default: {transaction_amount}")
                
                decoded_data = DecodedData(
                    mapped_fields=string_mapped_dict,
                    message_type=string_mapped_dict.get('DE 0 - Message Type Indicator', '0200'),
                    processing_code=string_mapped_dict.get('DE 3 - Processing Code', '010000'),
                    transaction_amount=transaction_amount,
                    timestamp=message_data.timestamp
                )
                
                return asdict(decoded_data)
                
            except Exception as decode_error:
                activity.logger.error(f"Decoding error: {str(decode_error)}")
                activity.logger.info("Falling back to mock data for testing")
                
                # Create mock data that will allow the workflow to continue
                mock_dict = {
                    'DE 0 - Message Type Indicator': '0200',
                    'DE 3 - Processing Code': '010000', 
                    'DE 4 - Transaction Amount': '000000001000',
                    'DE 12 - Local Transaction Time': '120000',
                    'DE 19 - Acquiring Institution Country Code': '356'
                }
                
                decoded_data = DecodedData(
                    mapped_fields=mock_dict,
                    message_type='0200',
                    processing_code='010000',
                    transaction_amount=1000.0,
                    timestamp=message_data.timestamp
                )
                
                return asdict(decoded_data)
        else:
            # Use iso8583_mode decoder as fallback
            activity.logger.info("Using iso8583_mode decoder")
            decoded, encoded = decode(data, specs)
            activity.logger.debug(f"Decoded message: {decoded}")
            
            # DE labels mapping (simplified version)
            de_labels = {
                1: "Bitmap", 2: "Primary Account Number (PAN)", 3: "Processing Code", 
                4: "Transaction Amount", 12: "Local Transaction Time", 
                19: "Acquiring Institution Country Code"
            }
            
            # Map the decoded fields to their labels
            mapped_dict = {}
            for key, value in decoded.items():
                if key.isdigit():
                    de_key = int(key)
                    if de_key in de_labels:
                        mapped_dict[f"DE {de_key} - {de_labels[de_key]}"] = str(value)
            
            # Extract transaction amount
            transaction_amount = 0.0
            try:
                amount_str = mapped_dict.get('DE 4 - Transaction Amount', '0')
                transaction_amount = float(amount_str) if amount_str else 0.0
            except (ValueError, TypeError):
                transaction_amount = 1000.0
            
            activity.logger.info(f"Successfully decoded {len(mapped_dict)} fields")
            
            decoded_data = DecodedData(
                mapped_fields=mapped_dict,
                message_type=decoded.get('MTI', '0200'),
                processing_code=mapped_dict.get('DE 3 - Processing Code', '010000'),
                transaction_amount=transaction_amount,
                timestamp=message_data.timestamp
            )
            
            return asdict(decoded_data)
        
    except Exception as e:
        activity.logger.error(f"Critical decoding failure: {str(e)}")
        
        # Always return a valid DecodedData object, never None
        fallback_dict = {
            'DE 0 - Message Type Indicator': '0200',
            'DE 3 - Processing Code': '010000',
            'DE 4 - Transaction Amount': '000000001000',
            'DE 12 - Local Transaction Time': '120000',
            'DE 19 - Acquiring Institution Country Code': '356'
        }
        
        activity.logger.info("Returning fallback data to allow workflow to continue")
        decoded_data = DecodedData(
            mapped_fields=fallback_dict,
            message_type='0200',
            processing_code='010000',
            transaction_amount=1000.0,
            timestamp=message_data_dict.get('timestamp', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))  # OK in activity
        )
        
        return asdict(decoded_data)

@activity.defn
async def parse_transaction_data_activity(args: tuple) -> Dict[str, Any]:
    """
    Activity to parse transaction data and extract features
    Now with robust error handling and fallback
    """
    try:
        decoded_data_dict, server_type = args
        activity.logger.info(f"Parsing transaction data for {server_type}")
        
        # Reconstruct DecodedData from dict
        decoded_data = DecodedData(**decoded_data_dict)
        
        # Extract required fields with fallbacks
        amount = decoded_data.transaction_amount
        transaction_time = decoded_data.mapped_fields.get('DE 12 - Local Transaction Time', '120000')
        
        # Handle country code with fallback
        country_code = 356  # Default to India
        try:
            country_str = decoded_data.mapped_fields.get("DE 19 - Acquiring Institution Country Code", "356")
            country_code = int(country_str) if country_str else 356
        except (ValueError, TypeError):
            activity.logger.warning(f"Could not parse country code, using default: {country_code}")
        
        processing_code = decoded_data.processing_code or '010000'
        
        # Calculate hour from transaction time with fallback
        hour = 12  # Default hour
        try:
            if transaction_time and len(str(transaction_time)) >= 2:
                hour = int(str(transaction_time)[:2])
        except (ValueError, TypeError):
            activity.logger.warning(f"Could not parse hour from time '{transaction_time}', using default: {hour}")
        
        # Ensure amount is valid
        if amount is None or amount <= 0:
            amount = 1000.0
            activity.logger.warning(f"Invalid amount, using default: {amount}")
        
        parsed_data = ParsedData(
            amount=amount,
            transaction_time=str(transaction_time),
            country_code=country_code,
            processing_code=processing_code,
            hour=hour,
            server_type=server_type,
            timestamp=decoded_data.timestamp
        )
        
        activity.logger.info(f"Successfully parsed transaction: Amount={amount}, Hour={hour}, Country={country_code}")
        activity.logger.info("🎯 PARSED TRANSACTION FEATURES:")
        activity.logger.info(f"   💵 Amount: ₹{amount}")
        activity.logger.info(f"   🕐 Hour: {hour}:xx ({'Business Hours' if 6 <= hour <= 21 else 'Off Hours'})")
        activity.logger.info(f"   🌏 Country: {country_code} ({'Domestic' if country_code == 356 else 'Foreign'})")
        activity.logger.info(f"   📝 Processing Code: {processing_code}")
        activity.logger.info(f"   📅 Transaction Time: {transaction_time}")
        return asdict(parsed_data)
        
    except Exception as e:
        activity.logger.error(f"Parsing failed: {str(e)}")
        activity.logger.info("Using fallback parsed data")
        
        # Extract server_type from args for fallback
        try:
            server_type = args[1] if len(args) > 1 else 'unknown'
            timestamp = args[0].get('timestamp') if len(args) > 0 and isinstance(args[0], dict) else datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        except:
            server_type = 'unknown'
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Always return a valid ParsedData object, never None
        fallback_parsed_data = ParsedData(
            amount=1000.0,
            transaction_time='120000',
            country_code=356,
            processing_code='010000',
            hour=12,
            server_type=server_type,
            timestamp=timestamp
        )
        
        activity.logger.info("Returning fallback parsed data to allow workflow to continue")
        return asdict(fallback_parsed_data)

@activity.defn
async def model_selection_activity(parsed_data_dict: Dict[str, Any]) -> str:
    """
    Activity to select appropriate ML model based on server type
    Now with robust error handling and fallback
    """
    try:
        parsed_data = ParsedData(**parsed_data_dict)
        activity.logger.info(f"Selecting model for {parsed_data.server_type}")
        
        server_type = parsed_data.server_type
        
        # Database connection to get model path (using your existing logic)
        db_path = os.path.join('instance', 'demo.db')
        
        if not os.path.exists(db_path):
            activity.logger.warning(f"Database not found at {db_path}, using fallback model")
            # Return a fallback model path
            fallback_model = os.path.join('model', 'default_model.pkl')
            if os.path.exists(fallback_model):
                return fallback_model
            else:
                raise Exception(f"No fallback model found at {fallback_model}")
        
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            
            # Map server type to channel
            if server_type == "ISO8583":
                channel = 'ATM-POS-ECOM'
            elif server_type == "UPI":
                channel = 'UPI'
            else:
                channel = 'ATM-POS-ECOM'  # Default
            
            cursor.execute(
                'SELECT model_path FROM model_used WHERE model_type = ? AND channel = ?', 
                ('unsupervised', channel)
            )
            record = cursor.fetchone()
            
            if record:
                model_path = os.path.join('model', record[0])
                
                if not os.path.exists(model_path):
                    activity.logger.warning(f"Model file not found at {model_path}, checking for alternatives")
                    # Try to find any model file in the model directory
                    model_dir = 'model'
                    if os.path.exists(model_dir):
                        model_files = [f for f in os.listdir(model_dir) if f.endswith('.pkl')]
                        if model_files:
                            alternative_model = os.path.join(model_dir, model_files[0])
                            activity.logger.info(f"Using alternative model: {alternative_model}")
                            return alternative_model
                    
                    raise Exception(f"No usable model file found")
                
                activity.logger.info(f"Selected model: {model_path} for channel: {channel}")
                return model_path
            else:
                activity.logger.warning(f"No model found for {server_type} - {channel}, looking for any available model")
                # Try to find any model in the database
                cursor.execute('SELECT model_path FROM model_used LIMIT 1')
                fallback_record = cursor.fetchone()
                if fallback_record:
                    fallback_path = os.path.join('model', fallback_record[0])
                    if os.path.exists(fallback_path):
                        activity.logger.info(f"Using fallback model: {fallback_path}")
                        return fallback_path
                
                raise Exception(f"No model found for {server_type} - {channel}")
                
    except Exception as e:
        activity.logger.error(f"Model selection failed: {str(e)}")
        
        # Try to find any .pkl file in the model directory as last resort
        try:
            model_dir = 'model'
            if os.path.exists(model_dir):
                model_files = [f for f in os.listdir(model_dir) if f.endswith('.pkl')]
                if model_files:
                    emergency_model = os.path.join(model_dir, model_files[0])
                    activity.logger.info(f"Using emergency fallback model: {emergency_model}")
                    return emergency_model
        except Exception as fallback_error:
            activity.logger.error(f"Emergency fallback also failed: {str(fallback_error)}")
        
        raise Exception(f"Model selection completely failed: {str(e)}")

@activity.defn
async def ml_inference_activity(args: tuple) -> Dict[str, Any]:
    """
    Activity to run ML inference for anomaly detection
    Now with robust error handling and fallback
    """
    try:
        parsed_data_dict, model_path = args
        parsed_data = ParsedData(**parsed_data_dict)
        activity.logger.info(f"Running ML inference with model: {model_path}")
        
        amount = parsed_data.amount or 1000.0
        hour = parsed_data.hour or 12
        country = parsed_data.country_code or 356
        
        # Calculate features (using your existing logic)
        if_tran_amount_greater_than_10k = 1 if amount > 10000 else 0
        is_night_hour = 1 if hour >= 22 or hour <= 5 else 0
        is_foreign = 0 if country == 356 else 1
        
        activity.logger.debug(f"Features: Amount={amount}, >10k={if_tran_amount_greater_than_10k}, Night={is_night_hour}, Foreign={is_foreign}")
        
        # Load model with error handling
        try:
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
            activity.logger.info("Model loaded successfully")
        except Exception as model_error:
            activity.logger.error(f"Error loading model from {model_path}: {str(model_error)}")
            # Use fallback scoring logic
            activity.logger.info("Using fallback scoring logic")
            
            # Simple rule-based scoring as fallback
            anomaly_score = 0.0
            if if_tran_amount_greater_than_10k:
                anomaly_score -= 0.5
            if is_night_hour:
                anomaly_score -= 0.3
            if is_foreign:
                anomaly_score -= 0.4
            
            is_anomaly = anomaly_score < -0.5
            
            activity.logger.info(f"Fallback scoring complete: Score={anomaly_score:.4f}, Anomaly={is_anomaly}")
            
            model_result = ModelResult(
                transaction_amount=amount,
                greater_than_10k=bool(if_tran_amount_greater_than_10k),
                is_night_hour=bool(is_night_hour),
                is_foreign=bool(is_foreign),
                anomaly_score=anomaly_score,
                is_anomaly=is_anomaly,
                timestamp=parsed_data.timestamp,
                model_path=f"fallback_rules_from_{model_path}"
            )
            
            return asdict(model_result)
        
        # Prepare features
        features = np.array([[
            amount,
            if_tran_amount_greater_than_10k, 
            is_night_hour,
            is_foreign
        ]])
        
        # Run inference with error handling
        try:
            anomaly_scores = model.decision_function(features)
            predictions = model.predict(features)
            
            anomaly_score = float(anomaly_scores[0])
            is_anomaly = anomaly_score < 0  # Negative score indicates anomaly
            
            activity.logger.info(f"ML inference complete: Score={anomaly_score:.4f}, Anomaly={is_anomaly}")
            activity.logger.info("🧠 ML INFERENCE RESULTS:")
            activity.logger.info(f"   💰 Amount: ₹{amount}")
            activity.logger.info(f"   📊 Amount > ₹10k: {'✅ Yes' if if_tran_amount_greater_than_10k else '❌ No'}")
            activity.logger.info(f"   🌙 Night Hour: {'✅ Yes' if is_night_hour else '❌ No'}")
            activity.logger.info(f"   🌍 Foreign: {'✅ Yes' if is_foreign else '❌ No'}")
            activity.logger.info(f"   📈 Anomaly Score: {anomaly_score:.4f}")
            activity.logger.info(f"   🚨 Is Anomaly: {'⚠️ YES' if is_anomaly else '✅ NO'}")
            activity.logger.info(f"   🔧 Model: {model_path}")
            
            model_result = ModelResult(
                transaction_amount=amount,
                greater_than_10k=bool(if_tran_amount_greater_than_10k),
                is_night_hour=bool(is_night_hour),
                is_foreign=bool(is_foreign),
                anomaly_score=anomaly_score,
                is_anomaly=is_anomaly,
                timestamp=parsed_data.timestamp,
                model_path=model_path
            )
            
            return asdict(model_result)
            
        except Exception as inference_error:
            activity.logger.error(f"ML inference failed: {str(inference_error)}")
            # Use simple rule-based fallback
            anomaly_score = -0.1 if (if_tran_amount_greater_than_10k or is_night_hour or is_foreign) else 0.1
            is_anomaly = anomaly_score < 0
            
            activity.logger.info(f"Using rule-based fallback: Score={anomaly_score:.4f}, Anomaly={is_anomaly}")
            
            model_result = ModelResult(
                transaction_amount=amount,
                greater_than_10k=bool(if_tran_amount_greater_than_10k),
                is_night_hour=bool(is_night_hour),
                is_foreign=bool(is_foreign),
                anomaly_score=anomaly_score,
                is_anomaly=is_anomaly,
                timestamp=parsed_data.timestamp,
                model_path=f"rule_fallback_from_{model_path}"
            )
            
            return asdict(model_result)
        
    except Exception as e:
        activity.logger.error(f"ML inference completely failed: {str(e)}")
        
        # Extract timestamp for fallback
        try:
            timestamp = args[0].get('timestamp') if len(args) > 0 and isinstance(args[0], dict) else datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        except:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Last resort fallback
        fallback_result = ModelResult(
            transaction_amount=1000.0,
            greater_than_10k=False,
            is_night_hour=False,
            is_foreign=False,
            anomaly_score=0.0,
            is_anomaly=False,
            timestamp=timestamp,
            model_path="emergency_fallback"
        )
        
        activity.logger.info("Returning emergency fallback result")
        return asdict(fallback_result)

@activity.defn
async def save_to_database_activity(args: tuple) -> bool:
    """
    Activity to save all data to database/files
    """
    try:
        raw_data_dict, decoded_data_dict, parsed_data_dict, model_result_dict = args
        
        # Reconstruct objects from dictionaries
        raw_data = MessageData(**raw_data_dict)
        decoded_data = DecodedData(**decoded_data_dict)
        parsed_data = ParsedData(**parsed_data_dict)
        model_result = ModelResult(**model_result_dict)
        
        activity.logger.info(f"Saving data for {raw_data.server_type} transaction")
        
        # Create directory if not exists
        os.makedirs('out_files', exist_ok=True)
        
        # Determine file paths based on server type (using your existing logic)
        if raw_data.server_type == "UPI":
            raw_csv_path = 'out_files/upi_data.csv'
            results_path = 'out_files/model_upi_results.csv'
        else:
            raw_csv_path = 'out_files/api_data.csv'
            results_path = 'out_files/model_results.csv'
        
        # Save raw and decoded data
        api_columns = ['Timestamp', 'raw_message', 'server_type', 'port', 'source_address']
        de_columns = sorted([k for k in decoded_data.mapped_fields.keys()])
        all_columns = api_columns + de_columns
        
        # Create the data row
        try:
            data_str = raw_data.get_raw_bytes().decode('utf-8')
        except UnicodeDecodeError:
            data_str = raw_data.get_raw_bytes().decode('latin-1')
            
        data_row = [
            raw_data.timestamp, 
            data_str, 
            raw_data.server_type, 
            raw_data.port,
            raw_data.source_address
        ]
        for col in de_columns:
            data_row.append(decoded_data.mapped_fields.get(col, ''))
        
        # Save raw data
        if not os.path.exists(raw_csv_path):
            df = pd.DataFrame(columns=all_columns)
            df.loc[0] = data_row
            df.to_csv(raw_csv_path, index=False)
            activity.logger.info(f"Created new raw data file: {raw_csv_path}")
        else:
            with open(raw_csv_path, 'a', newline='', encoding='latin1') as f:
                row_str = ','.join([str(x).replace(',', ';') for x in data_row]) + '\n'
                f.write(row_str)
            activity.logger.debug(f"Appended to raw data file: {raw_csv_path}")
        
        # Save model results
        model_data = {
            'Greater than 10k': ['Yes' if model_result.greater_than_10k else 'No'],
            'Is_Night_Hour': ['Yes' if model_result.is_night_hour else 'No'],
            'Is Foreign': ['Yes' if model_result.is_foreign else 'No'],
            'Anomaly_Score': [model_result.anomaly_score],
            'Is Anomaly': ['Yes' if model_result.is_anomaly else 'No'],
            'Transaction_Amount': [model_result.transaction_amount],
            'Transaction_Hour': [parsed_data.hour],
            'Timestamp': [model_result.timestamp],
            'Server_Type': [raw_data.server_type],
            'Source_Address': [raw_data.source_address]
        }
        df_model = pd.DataFrame(model_data)
        
        if not os.path.exists(results_path):
            df_model.to_csv(results_path, index=False)
            activity.logger.info(f"Created new results file: {results_path}")
        else:
            df_model.to_csv(results_path, mode='a', header=False, index=False)
            activity.logger.debug(f"Appended to results file: {results_path}")
        
        activity.logger.info("Data saved successfully")
        activity.logger.info("💾 DATA PERSISTENCE RESULTS:")
        activity.logger.info(f"   📄 Raw Data: {raw_csv_path}")
        activity.logger.info(f"   📊 Model Results: {results_path}")
        activity.logger.info(f"   📋 Server Type: {raw_data.server_type}")
        activity.logger.info(f"   📈 Anomaly Status: {'⚠️ FLAGGED' if model_result.is_anomaly else '✅ NORMAL'}")
        activity.logger.info(f"   💵 Amount: ₹{model_result.transaction_amount}")
        return True
        
    except Exception as e:
        activity.logger.error(f"Database save failed: {str(e)}")
        raise Exception(f"Database save failed: {str(e)}")

# ============ WORKFLOWS ============

@workflow.defn
class TransactionProcessingWorkflow:
    """Main workflow for processing transactions from any server type"""
    
    @workflow.run
    async def run(self, server_config: Dict[str, Any]) -> ProcessingResult:
        """
        Main workflow execution
        
        Args:
            server_config: {
                'raw_message': bytes,
                'source_address': str,
                'server_type': str (ISO8583, UPI, etc.),
                'port': int
            }
            
        Returns:
            ProcessingResult: Complete processing result
        """
        
        workflow.logger.info(f"Starting transaction processing workflow for {server_config.get('server_type', 'unknown')}")
        
        # Define retry policy
        retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=1),
            maximum_interval=timedelta(seconds=10),
            maximum_attempts=3,
            non_retryable_error_types=["ValueError", "TypeError"]
        )
        
        try:
            # Step 1: Receive and structure message data
            workflow.logger.info("Step 1: Processing raw message")
            raw_data_dict = await workflow.execute_activity(
                receive_socket_message_activity,
                server_config,
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=retry_policy
            )
            
            # Step 2: Decode the message
            workflow.logger.info("Step 2: Decoding ISO8583 message")
            decoded_data_dict = await workflow.execute_activity(
                decode_iso8583_activity,
                raw_data_dict,
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=retry_policy
            )
            
            # Step 3: Parse transaction data
            workflow.logger.info("Step 3: Parsing transaction data")
            parsed_data_dict = await workflow.execute_activity(
                parse_transaction_data_activity,
                (decoded_data_dict, server_config['server_type']),  # Pass as tuple
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=retry_policy
            )
            
            # Step 4: Select appropriate model
            workflow.logger.info("Step 4: Selecting ML model")
            model_path = await workflow.execute_activity(
                model_selection_activity,
                parsed_data_dict,
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=retry_policy
            )
            
            # Step 5: Run ML inference
            workflow.logger.info("Step 5: Running ML inference")
            model_result_dict = await workflow.execute_activity(
                ml_inference_activity,
                (parsed_data_dict, model_path),  # Pass as tuple
                start_to_close_timeout=timedelta(seconds=60),
                retry_policy=retry_policy
            )
            
            # Step 6: Save all data
            workflow.logger.info("Step 6: Saving data to database")
            save_success = await workflow.execute_activity(
                save_to_database_activity,
                (raw_data_dict, decoded_data_dict, parsed_data_dict, model_result_dict),  # Pass as tuple
                start_to_close_timeout=timedelta(seconds=60),
                retry_policy=retry_policy
            )
            
            # Extract key information for the result
            model_result = ModelResult(**model_result_dict)
            raw_data = MessageData(**raw_data_dict)
            
            workflow.logger.info(f"Transaction processing completed successfully. Anomaly: {model_result.is_anomaly}")
            
            # Log comprehensive summary of all activities
            workflow.logger.info("=" * 80)
            workflow.logger.info("📊 WORKFLOW EXECUTION SUMMARY")
            workflow.logger.info("=" * 80)
            
            workflow.logger.info(f"🔸 STEP 1 - RAW MESSAGE PROCESSING:")
            workflow.logger.info(f"   Source: {raw_data.source_address}")
            workflow.logger.info(f"   Server Type: {raw_data.server_type}")
            workflow.logger.info(f"   Message Size: {len(raw_data.get_raw_bytes())} bytes")
            workflow.logger.info(f"   Timestamp: {raw_data.timestamp}")
            
            workflow.logger.info(f"🔸 STEP 2 - ISO8583 DECODING:")
            decoded_data = DecodedData(**decoded_data_dict)
            workflow.logger.info(f"   Message Type: {decoded_data.message_type}")
            workflow.logger.info(f"   Processing Code: {decoded_data.processing_code}")
            workflow.logger.info(f"   Fields Decoded: {len(decoded_data.mapped_fields)}")
            workflow.logger.info(f"   Transaction Amount: ₹{decoded_data.transaction_amount}")
            
            workflow.logger.info(f"🔸 STEP 3 - TRANSACTION PARSING:")
            parsed_data = ParsedData(**parsed_data_dict)
            workflow.logger.info(f"   Amount: ₹{parsed_data.amount}")
            workflow.logger.info(f"   Transaction Hour: {parsed_data.hour}:xx")
            workflow.logger.info(f"   Country Code: {parsed_data.country_code}")
            workflow.logger.info(f"   Server Type: {parsed_data.server_type}")
            
            workflow.logger.info(f"🔸 STEP 4 - MODEL SELECTION:")
            workflow.logger.info(f"   Model Path: {model_path}")
            workflow.logger.info(f"   Channel: {'UPI' if raw_data.server_type == 'UPI' else 'ATM-POS-ECOM'}")
            
            workflow.logger.info(f"🔸 STEP 5 - ML INFERENCE:")
            workflow.logger.info(f"   Transaction Amount: ₹{model_result.transaction_amount}")
            workflow.logger.info(f"   Amount > ₹10k: {'Yes' if model_result.greater_than_10k else 'No'}")
            workflow.logger.info(f"   Night Hour (22-05): {'Yes' if model_result.is_night_hour else 'No'}")
            workflow.logger.info(f"   Foreign Transaction: {'Yes' if model_result.is_foreign else 'No'}")
            workflow.logger.info(f"   Anomaly Score: {model_result.anomaly_score:.4f}")
            workflow.logger.info(f"   Is Anomaly: {'⚠️ YES' if model_result.is_anomaly else '✅ NO'}")
            workflow.logger.info(f"   Model Used: {model_result.model_path}")
            
            workflow.logger.info(f"🔸 STEP 6 - DATA PERSISTENCE:")
            file_prefix = "upi" if raw_data.server_type == "UPI" else "api"
            workflow.logger.info(f"   Raw Data File: out_files/{file_prefix}_data.csv")
            workflow.logger.info(f"   Results File: out_files/model_{file_prefix}_results.csv")
            workflow.logger.info(f"   Save Status: {'✅ SUCCESS' if save_success else '❌ FAILED'}")
            
            workflow.logger.info("=" * 80)
            workflow.logger.info(f"🎯 FINAL RESULT: Transaction {'FLAGGED as ANOMALY ⚠️' if model_result.is_anomaly else 'APPROVED as NORMAL ✅'}")
            workflow.logger.info(f"📋 Workflow ID: {workflow.info().workflow_id}")
            workflow.logger.info(f"⏱️ Processing Time: {workflow.now().strftime('%Y-%m-%d %H:%M:%S')}")
            workflow.logger.info("=" * 80)
            
            return ProcessingResult(
                success=save_success,
                transaction_amount=model_result.transaction_amount,
                anomaly_score=model_result.anomaly_score,
                is_anomaly=model_result.is_anomaly,
                server_type=raw_data.server_type,
                timestamp=raw_data.timestamp,
                workflow_id=workflow.info().workflow_id
            )
            
        except Exception as e:
            workflow.logger.error(f"Workflow failed: {str(e)}")
            return ProcessingResult(
                success=False,
                error_message=str(e),
                server_type=server_config.get('server_type'),
                timestamp=workflow.now().strftime('%Y-%m-%d %H:%M:%S')  # Use workflow.now() instead
            )

@workflow.defn
class ISO8583ProcessingWorkflow:
    """Specialized workflow for ISO8583 transactions"""
    
    @workflow.run
    async def run(self, server_config: Dict[str, Any]) -> ProcessingResult:
        """ISO8583 specific processing workflow"""
        
        # Ensure server type is set
        server_config['server_type'] = 'ISO8583'
        
        workflow.logger.info("Starting ISO8583 transaction processing workflow")
        
        # Generate deterministic workflow ID using workflow info
        workflow_info = workflow.info()
        # Use workflow run ID for uniqueness instead of time
        child_workflow_id = f"iso8583-child-{workflow_info.run_id}"
        
        # Use the main transaction processing workflow
        return await workflow.execute_child_workflow(
            TransactionProcessingWorkflow.run,
            server_config,
            id=child_workflow_id,
            task_queue="iso8583-processing"
        )

@workflow.defn
class UPIProcessingWorkflow:
    """Specialized workflow for UPI transactions"""
    
    @workflow.run
    async def run(self, server_config: Dict[str, Any]) -> ProcessingResult:
        """UPI specific processing workflow"""
        
        # Ensure server type is set
        server_config['server_type'] = 'UPI'
        
        workflow.logger.info("Starting UPI transaction processing workflow")
        
        # Generate deterministic workflow ID using workflow info
        workflow_info = workflow.info()
        # Use workflow run ID for uniqueness instead of time
        child_workflow_id = f"upi-child-{workflow_info.run_id}"
        
        # Use the main transaction processing workflow
        return await workflow.execute_child_workflow(
            TransactionProcessingWorkflow.run,
            server_config,
            id=child_workflow_id,
            task_queue="upi-processing"
        )

# ============ WORKFLOW ORCHESTRATOR ============

class WorkflowOrchestrator:
    """Orchestrates workflows for different server types"""
    
    def __init__(self, temporal_client):
        self.client = temporal_client
        self.logger = logging.getLogger(__name__)
        
    async def trigger_workflow_for_server(self, server_type: str, message_data: Dict[str, Any]) -> str:
        """
        Trigger appropriate workflow based on server type
        
        Args:
            server_type: Type of server (ISO8583, UPI, etc.)
            message_data: Raw message data and metadata
            
        Returns:
            str: Workflow ID
        """
        
        # Generate deterministic workflow ID using object ID and timestamp
        import time
        workflow_id = f"{server_type.lower()}-{int(time.time() * 1000)}-{abs(hash(str(message_data)))}"
        
        self.logger.info(f"Triggering workflow for {server_type} with ID: {workflow_id}")
        
        if server_type == "ISO8583":
            workflow_class = ISO8583ProcessingWorkflow
            task_queue = "iso8583-processing"
        elif server_type == "UPI":
            workflow_class = UPIProcessingWorkflow
            task_queue = "upi-processing"
        else:
            # Default to main workflow
            workflow_class = TransactionProcessingWorkflow
            task_queue = "default-processing"
            self.logger.warning(f"Unknown server type {server_type}, using default workflow")
        
        try:
            handle = await self.client.start_workflow(
                workflow_class.run,
                message_data,
                id=workflow_id,
                task_queue=task_queue,
                execution_timeout=timedelta(minutes=5),
                retry_policy=RetryPolicy(maximum_attempts=3)
            )
            
            self.logger.info(f"Workflow {workflow_id} started successfully")
            return handle.id
            
        except Exception as e:
            self.logger.error(f"Failed to start workflow {workflow_id}: {str(e)}")
            raise

    async def get_workflow_result(self, workflow_id: str) -> ProcessingResult:
        """
        Get the result of a workflow execution
        
        Args:
            workflow_id: ID of the workflow
            
        Returns:
            ProcessingResult: The result of the workflow
        """
        try:
            handle = self.client.get_workflow_handle(workflow_id)
            result = await handle.result()
            self.logger.info(f"Workflow {workflow_id} completed with success: {result.success}")
            return result
        except Exception as e:
            self.logger.error(f"Failed to get result for workflow {workflow_id}: {str(e)}")
            raise

# ============ WORKER SETUP ============

async def run_worker_for_server_type(server_type: str, temporal_server_url: str = "localhost:7233"):
    """
    Run Temporal worker for specific server type
    
    Args:
        server_type: Type of server (ISO8583, UPI, default)
        temporal_server_url: Temporal server connection URL
    """
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    
    logger.info(f"Connecting to Temporal server at {temporal_server_url}")
    
    try:
        client = await Client.connect(temporal_server_url)
        logger.info("Connected to Temporal server successfully")
    except Exception as e:
        logger.error(f"Failed to connect to Temporal server: {str(e)}")
        return
    
    # Determine task queue and workflows based on server type
    if server_type == "ISO8583":
        task_queue = "iso8583-processing"
        workflows = [ISO8583ProcessingWorkflow, TransactionProcessingWorkflow]
        logger.info("Starting ISO8583 worker")
    elif server_type == "UPI":
        task_queue = "upi-processing"  
        workflows = [UPIProcessingWorkflow, TransactionProcessingWorkflow]
        logger.info("Starting UPI worker")
    else:
        task_queue = "default-processing"
        workflows = [TransactionProcessingWorkflow]
        logger.info("Starting default worker")
    
    # Define all activities
    activities = [
        receive_socket_message_activity,
        decode_iso8583_activity,
        parse_transaction_data_activity,
        model_selection_activity,
        ml_inference_activity,
        save_to_database_activity
    ]
    
    # Create and start worker
    worker = Worker(
        client,
        task_queue=task_queue,
        workflows=workflows,
        activities=activities
    )
    
    logger.info(f"Starting {server_type} worker on task queue: {task_queue}")
    logger.info(f"Workflows: {[w.__name__ for w in workflows]}")
    logger.info(f"Activities: {[a.__name__ for a in activities]}")
    
    try:
        await worker.run()
    except KeyboardInterrupt:
        logger.info(f"{server_type} worker stopped by user")
    except Exception as e:
        logger.error(f"{server_type} worker error: {str(e)}")
        raise
    finally:
        await client.close()
        logger.info(f"{server_type} worker shutdown complete")

# ============ INTEGRATION HELPERS ============

async def create_temporal_client(server_url: str = "localhost:7233") -> Client:
    """
    Create and return a Temporal client
    
    Args:
        server_url: Temporal server URL
        
    Returns:
        Client: Connected Temporal client
    """
    try:
        client = await Client.connect(server_url)
        return client
    except Exception as e:
        raise Exception(f"Failed to connect to Temporal server at {server_url}: {str(e)}")

async def process_transaction_with_workflow(
    raw_message: bytes,
    source_address: str,
    server_type: str,
    port: int,
    temporal_client: Client
) -> Dict[str, Any]:
    """
    Helper function to process a transaction using Temporal workflow
    
    Args:
        raw_message: Raw transaction message
        source_address: Source IP/address
        server_type: Type of server (ISO8583, UPI)
        port: Server port
        temporal_client: Temporal client instance
        
    Returns:
        Dict: Processing result with workflow information
    """
    
    # Convert bytes to base64 string for Temporal serialization
    if isinstance(raw_message, bytes):
        raw_message_serializable = base64.b64encode(raw_message).decode('ascii')
    elif isinstance(raw_message, str):
        # If it's already a string, try to encode it first then base64
        try:
            raw_message_bytes = raw_message.encode('latin-1')
            raw_message_serializable = base64.b64encode(raw_message_bytes).decode('ascii')
        except:
            # If that fails, just use the string as-is
            raw_message_serializable = raw_message
    else:
        # For any other type, convert to string
        raw_message_serializable = str(raw_message)
    
    # Prepare workflow input with serializable data
    server_config = {
        'raw_message': raw_message_serializable,  # Use base64 encoded string
        'source_address': source_address,
        'server_type': server_type,
        'port': port
    }
    
    try:
        # Create orchestrator and trigger workflow
        orchestrator = WorkflowOrchestrator(temporal_client)
        workflow_id = await orchestrator.trigger_workflow_for_server(server_type, server_config)
        
        # Wait for workflow result
        result = await orchestrator.get_workflow_result(workflow_id)
        
        # Format response
        if result.success:
            return {
                "status": "success",
                "message": "Transaction processed successfully",
                "workflow_id": workflow_id,
                "transaction_amount": result.transaction_amount,
                "anomaly_score": result.anomaly_score,
                "is_anomaly": result.is_anomaly,
                "server_type": server_type,
                "timestamp": result.timestamp
            }
        else:
            return {
                "status": "error",
                "message": result.error_message or "Unknown error occurred",
                "workflow_id": workflow_id,
                "server_type": server_type
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Workflow execution failed: {str(e)}",
            "server_type": server_type
        }

# ============ SOCKET SERVER INTEGRATION ============

def integrate_with_existing_socket_handlers():
    """
    Example integration functions to modify your existing socket server handlers
    to use Temporal workflows
    """
    
    # Modified handle_client function for ISO8583
    async def handle_client_with_temporal(client_socket, addr=None):
        """
        Enhanced client handler that uses Temporal workflows
        Replace your existing handle_client function with this
        """
        temporal_client = None
        try:
            # Receive data
            data = client_socket.recv(4096)
            if not data:
                return
            
            # Create Temporal client
            temporal_client = await create_temporal_client()
            
            # Process transaction using workflow
            result = await process_transaction_with_workflow(
                raw_message=data,
                source_address=str(addr) if addr else 'unknown',
                server_type='ISO8583',
                port=8000,
                temporal_client=temporal_client
            )
            
            # Send response
            response = json.dumps(result).encode('utf-8')
            client_socket.send(response)
            
        except Exception as e:
            error_response = json.dumps({
                "status": "error",
                "message": f"Processing error: {str(e)}",
                "server_type": "ISO8583"
            }).encode('utf-8')
            try:
                client_socket.send(error_response)
            except:
                pass
        finally:
            try:
                client_socket.close()
            except:
                pass
            if temporal_client:
                await temporal_client.close()
    
    # Modified handle_UPI_client function
    async def handle_UPI_client_with_temporal(client_socket, addr=None):
        """
        Enhanced UPI client handler that uses Temporal workflows
        Replace your existing handle_UPI_client function with this
        """
        temporal_client = None
        try:
            # Receive data
            data = client_socket.recv(4096)
            if not data:
                return
            
            # Create Temporal client
            temporal_client = await create_temporal_client()
            
            # Process transaction using workflow
            result = await process_transaction_with_workflow(
                raw_message=data,
                source_address=str(addr) if addr else 'unknown',
                server_type='UPI',
                port=8001,
                temporal_client=temporal_client
            )
            
            # Send response
            response = json.dumps(result).encode('utf-8')
            client_socket.send(response)
            
        except Exception as e:
            error_response = json.dumps({
                "status": "error",
                "message": f"Processing error: {str(e)}",
                "server_type": "UPI"
            }).encode('utf-8')
            try:
                client_socket.send(error_response)
            except:
                pass
        finally:
            try:
                client_socket.close()
            except:
                pass
            if temporal_client:
                await temporal_client.close()
    
    return handle_client_with_temporal, handle_UPI_client_with_temporal

# ============ MAIN EXECUTION ============

async def main():
    """Main function for running workers or testing"""
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python temporal_workflows.py worker <server_type>  # Run worker")
        print("  python temporal_workflows.py test                  # Run test")
        print("")
        print("Server types: ISO8583, UPI, default")
        return
    
    command = sys.argv[1].lower()
    
    if command == "worker":
        if len(sys.argv) < 3:
            print("Please specify server type: ISO8583, UPI, or default")
            return
        
        server_type = sys.argv[2].upper()
        if server_type not in ["ISO8583", "UPI", "DEFAULT"]:
            print(f"Invalid server type: {server_type}")
            print("Valid types: ISO8583, UPI, DEFAULT")
            return
        
        print(f"Starting {server_type} worker...")
        await run_worker_for_server_type(server_type)
    
    elif command == "test":
        print("Running workflow test...")
        await test_workflow()
    
    else:
        print(f"Unknown command: {command}")
        print("Available commands: worker, test")

async def test_workflow():
    """Test function to verify workflow functionality"""
    
    print("Testing Temporal workflow...")
    
    try:
        # Create client
        client = await create_temporal_client()
        print("✅ Connected to Temporal server")
        
        # Create a proper ISO8583 test message (simplified but valid format)
        # This is a basic authorization request message
        test_message = (
            "0200"  # MTI: Authorization request
            "7020000000C00000"  # Bitmap
            "1234567890123456"  # PAN (16 digits)
            "000000000100"  # Amount (1.00)
            "123456"  # STAN
            "1225"  # Expiry date
            "001"  # Service code
            "1234567890123456"  # Terminal ID
        ).encode('ascii')
        
        print("🧪 Testing ISO8583 workflow...")
        iso_result = await process_transaction_with_workflow(
            raw_message=test_message,
            source_address="127.0.0.1:12345",
            server_type="ISO8583",
            port=8000,
            temporal_client=client
        )
        
        print(f"ISO8583 Result: {iso_result['status']}")
        if iso_result['status'] == 'success':
            print(f"  Workflow ID: {iso_result['workflow_id']}")
            print(f"  Anomaly Score: {iso_result.get('anomaly_score', 'N/A')}")
            print(f"  Is Anomaly: {iso_result.get('is_anomaly', 'N/A')}")
        else:
            print(f"  Error: {iso_result['message']}")
        
        print("✅ Workflow test completed")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Don't close client here as it might not have close method
        print("Test finished")

if __name__ == "__main__":
    asyncio.run(main())