# create_admin.py
import hashlib
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from config import settings
from config import (
    TableNames, UserColumns, UserBaseColumns
)
from sqlalchemy import Column, Integer, DateTime, String, Index, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
from model import UserType, User, Base

def hash_password(password: str) -> str:
    """Hash password using SHA3-512"""
    return hashlib.sha3_512(password.encode('utf-8')).hexdigest()

def create_admin_user():
    """Create default admin user"""
    # Create database engine
    engine = create_engine(settings.DB_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin user already exists
        # existing_admin = db.query(User).filter(User.username == "admin").first()
        
        # if existing_admin:
        #     print("Admin user already exists!")
        #     return
        
        # Create admin user
        admin_user = User(
            username="e5544892",
            password_hash=hash_password("admin"),
            email="hai@abcd.com",
            full_name="Suresh"
        )
        
        db.add(admin_user)
        db.commit()
        
        print("✅ User created successfully!")
        # print("   Username: admin")
        # print("   Password: admin")
        # print("   ⚠️  IMPORTANT: Change the default password after first login!")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()