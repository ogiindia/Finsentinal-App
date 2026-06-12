# upload_userbase_data.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, UTC

from config import settings  # reads DB_URL from .env
from model import Base, UserBase, UserType  # import your existing model and enum

# Create SQLAlchemy engine
engine = create_engine(settings.DB_URL, echo=False, future=True)

# Create session
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
session = SessionLocal()

def upload_userbase(user_id: str, user_type: str = "user", is_active: int = 1):
    """
    Uploads a new record to user_bases table.
    user_type should be one of: superadmin, admin, user
    """
    try:
        # Ensure the table exists (optional safety)
        Base.metadata.create_all(bind=engine)

        # Create new entry
        new_userbase = UserBase(
            User_id=user_id,
            user_type=UserType(user_type.lower()),
            is_active=is_active,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            last_login=None,
        )

        # Add & commit
        session.add(new_userbase)
        session.commit()

        print(f"✅ UserBase record inserted successfully for User_id={user_id}")

    except Exception as e:
        session.rollback()
        print(f"❌ Failed to insert userbase record: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    # Example usage:
    upload_userbase(user_id=3, user_type="superadmin", is_active=1)
