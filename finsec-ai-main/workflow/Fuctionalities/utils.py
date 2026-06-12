from fastapi import APIRouter, Query
import pandas as pd
from pathlib import Path
import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import hashlib
import urllib.parse

router = APIRouter(prefix="/utils", tags=["utils"])

# Encryption key (should match frontend)
ENCRYPTION_KEY = "your-secret-key-here"

def decrypt_path(encrypted_path: str) -> str:
    """
    Decrypt the file path sent from frontend.
    Uses AES decryption to match CryptoJS from frontend.
    """
    try:
        print(f"Attempting to decrypt: {encrypted_path}")
        
        # URL decode first if needed
        if '%' in encrypted_path:
            encrypted_path = urllib.parse.unquote(encrypted_path)
            print(f"URL decoded to: {encrypted_path}")
        
        # Try to decode as base64 first
        try:
            # For CryptoJS AES format
            encrypted_data = base64.b64decode(encrypted_path)
            
            # Create key from string (same as CryptoJS)
            key = hashlib.md5(ENCRYPTION_KEY.encode()).digest()
            
            # CryptoJS uses "Salted__" prefix, extract salt and data
            if encrypted_data.startswith(b'Salted__'):
                salt = encrypted_data[8:16]
                ciphertext = encrypted_data[16:]
                
                # Derive key and IV using EVP_BytesToKey equivalent
                def evp_bytes_to_key(password, salt, key_len, iv_len):
                    m = []
                    i = 0
                    while len(b''.join(m)) < (key_len + iv_len):
                        md5 = hashlib.md5()
                        data = password
                        if i > 0:
                            data = m[i - 1] + password
                        if salt:
                            data += salt
                        md5.update(data)
                        m.append(md5.digest())
                        i += 1
                    ms = b''.join(m)
                    return ms[:key_len], ms[key_len:key_len + iv_len]
                
                key, iv = evp_bytes_to_key(ENCRYPTION_KEY.encode(), salt, 32, 16)
                
                # Decrypt
                cipher = AES.new(key, AES.MODE_CBC, iv)
                decrypted = unpad(cipher.decrypt(ciphertext), AES.block_size)
                
                decrypted_path = decrypted.decode('utf-8')
                print(f"Decrypted to: {decrypted_path}")
                return decrypted_path
            else:
                # Simple base64 encoded path
                decrypted_path = base64.b64decode(encrypted_path).decode('utf-8')
                print(f"Base64 decoded to: {decrypted_path}")
                return decrypted_path
                
        except Exception as decode_error:
            print(f"Decryption failed, treating as plain path: {decode_error}")
            # If decryption fails, assume it's a plain path
            return encrypted_path
            
    except Exception as e:
        print(f"Decryption error: {e}")
        # Fallback to original path
        return encrypted_path

# OPTION 1: Query parameter approach (RECOMMENDED)
@router.get("/get_columns")
def get_columns(path: str = Query(..., description="Encrypted or plain file path")):
    try:
        print(f"📁 Received path parameter: {path}")
        
        # Try to decrypt the path first
        decrypted_path = decrypt_path(path)
        print(f"📂 Using path: {decrypted_path}")
        
        safe_path = Path(decrypted_path).resolve()
        
        # # Security check: ensure path is within allowed directories
        # allowed_dirs = [
        #     "/home/fis/MLDashboard/MLDashboard/Backend/uploads",
        #     "/tmp/uploads",
        #     "/var/uploads"
        # ]
        
        # is_allowed = any(str(safe_path).startswith(allowed_dir) for allowed_dir in allowed_dirs)
        
        # if not is_allowed:
        #     print(f"Access denied to path: {safe_path}")
        #     return {"error": f"Access denied to path outside allowed directories"}
        
        # Check if file exists
        if not safe_path.exists():
            return {"error": f"File not found: {decrypted_path}"}
        
        if not safe_path.suffix.lower() in ['.csv', '.txt']:
            return {"error": "Only CSV and TXT files are supported"}
        
        print(f"Reading CSV file: {safe_path}")
        df = pd.read_csv(safe_path)
        columns = df.columns.tolist()
        
        print(f"Found {len(columns)} columns: {columns}")
        
        return [{"label": col, "value": col} for col in columns]
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"error": str(e)}
