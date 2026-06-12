import pandas as pd
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from model import FeatureTable
from config import settings


CSV_COLUMN_MAPPING = {
    "transaction_features": "name",
    "description": "description",
}

DEFAULT_CHANNEL = "MB"

engine = create_engine(settings.DB_URL, echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def upload_features_from_csv(csv_path: str):
    session: Session = SessionLocal()
    now = datetime.utcnow()

    try:
        df = pd.read_csv(csv_path, encoding="utf-8-sig")

        df.columns = (
            df.columns
            .str.replace("\ufeff", "", regex=False)
            .str.strip()
            .str.lower()
        )

        df = df.rename(columns=CSV_COLUMN_MAPPING)

        df = df[df["name"].notna()]

        df["channel"] = DEFAULT_CHANNEL
        df["created_at"] = now
        df["updated_at"] = now

        records = df[["name", "description", "channel", "created_at", "updated_at"]] \
            .to_dict(orient="records")

        objects = [FeatureTable(**record) for record in records]

        if objects:
            session.bulk_save_objects(objects)
            session.commit()

    except Exception:
        session.rollback()
        raise

    finally:
        session.close()


upload_features_from_csv(
    "/storage/AIML/MLDashboard/FinSentinel_Microservice/features_file/uco_mb.csv"
)