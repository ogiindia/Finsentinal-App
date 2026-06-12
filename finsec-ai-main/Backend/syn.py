import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DB_URL = "postgresql+psycopg2://ml_dash:Postgres123@localhost:5432/finsentinel_1"

ALSALAM_TRANS_CSV = "/storage/AIML/MLDashboard/FinSentinel_Microservice/files/Tran.csv"
MODEL_RESULT_CSV = "/storage/AIML/MLDashboard/FinSentinel_Microservice/files/Fr.csv"

engine = create_engine(DB_URL)
SessionLocal = sessionmaker(bind=engine)


def load_csv_data():
    session = SessionLocal()
    try:
        # --------------------------------------------------
        # 1. INSERT TRANSACTIONS (id AUTO-GENERATED)
        # --------------------------------------------------
        df_trans = pd.read_csv(ALSALAM_TRANS_CSV)
        df_trans = df_trans.drop(columns=["id"], errors="ignore")

        df_trans.to_sql(
            name="transaction_3",
            con=engine,
            if_exists="append",
            index=False,
            method="multi"
        )

        # --------------------------------------------------
        # 2. FETCH GENERATED IDS (SAME TABLE!)
        # --------------------------------------------------
        inserted_ids = session.execute(
            text("""
                SELECT id
                FROM transaction_3
                ORDER BY id DESC
                LIMIT :cnt
            """),
            {"cnt": len(df_trans)}
        ).scalars().all()

        inserted_ids.reverse()

        # --------------------------------------------------
        # 3. INSERT FEATURE DATA (id AUTO-GENERATED)
        # --------------------------------------------------
        df_feat = pd.read_csv(MODEL_RESULT_CSV)
        df_feat = df_feat.drop(columns=["id", "alsalam_id"], errors="ignore")

        df_feat["alsalam_id"] = inserted_ids
        df_feat = df_feat[["alsalam_id", "fraud", "risk_score"]]

        df_feat.to_sql(
            name="feature_data_1",
            con=engine,
            if_exists="append",
            index=False,
            method="multi"
        )

        session.commit()
        print("Append successful with auto-generated IDs.")

    except Exception as e:
        session.rollback()
        raise RuntimeError(f"CSV upload failed: {e}")

    finally:
        session.close()


if __name__ == "__main__":
    load_csv_data()