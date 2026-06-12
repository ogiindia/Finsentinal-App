import random
import numpy as np
import pandas as pd
from faker import Faker
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text

from model import AlsalamTrans, ALSalamModelResult, RiskTable, Customer
from config import DB_URL

# --------------------------------------------------
# CONFIG
# --------------------------------------------------
CSV_PATH = "/storage/AIML/MLDashboard/FinSentinel_Microservice/transactions_dec2025_v4 1.csv"

fake = Faker()
engine = create_engine(DB_URL)

# --------------------------------------------------
# HELPERS
# --------------------------------------------------
def safe_float(val, default=0.0):
    try:
        return float(val)
    except Exception:
        return default


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


# --------------------------------------------------
# LOAD CSV
# --------------------------------------------------
df = pd.read_csv(CSV_PATH)

df.columns = (
    df.columns
      .str.strip()
      .str.replace(" ", "_")
      .str.replace("-", "_")
      .str.lower()
)

print("CSV Columns Detected:", df.columns.tolist())

df["from_acct"] = df["from_acct"].astype(str)
df["to_acct"] = df["to_acct"].astype(str)
df["amount"] = df["amount"].apply(safe_float)
df["ts"] = pd.to_datetime(df["ts"], errors="coerce")
df["ifsc_code"] = df["ifsc_code"].fillna("UNKNOWN")

df = df.dropna(subset=["amount", "ts"])

# --------------------------------------------------
# MAIN INGESTION
# --------------------------------------------------
with Session(engine) as session:

    # --------------------------------------------------
    # 🔑 SEQUENCE SYNC (SAFE)
    # --------------------------------------------------
    tables = [
        "customers_2",
        "risktable"
    ]

    for table in tables:
        session.execute(text(f"""
            SELECT setval(
                pg_get_serial_sequence('{table}', 'id'),
                COALESCE((SELECT MAX(id) FROM {table}), 1),
                true
            )
        """))
    session.commit()

    # --------------------------------------------------
    # 1️⃣ TRANSACTION INGESTION (FINAL + CORRECT)
    # --------------------------------------------------
    existing_keys = {
        (t.Customer_Id, t.To_Customer_Id, t.Timestamp, t.Amount)
        for t in session.query(
            AlsalamTrans.Customer_Id,
            AlsalamTrans.To_Customer_Id,
            AlsalamTrans.Timestamp,
            AlsalamTrans.Amount
        ).all()
    }

    trans_objects = []

    for r in df.itertuples(index=False):
        from_account = str(r.from_acct)   # ✅ ALWAYS sender
        to_account = str(r.to_acct)

        key = (from_account, to_account, r.ts, r.amount)
        if key in existing_keys:
            continue

        trans_objects.append(
            AlsalamTrans(
                Customer_Id=from_account,
                To_Customer_Id=to_account,
                Timestamp=r.ts,
                Amount=float(r.amount),
                Location=str(r.ifsc_code)
            )
        )

    if trans_objects:
        session.bulk_save_objects(trans_objects)
        session.commit()

    # --------------------------------------------------
    # 2️⃣ MODEL RESULT (STRICT 1:1 WITH TRANSACTION)
    # --------------------------------------------------
    missing_txns = (
        session.query(AlsalamTrans)
        .outerjoin(
            ALSalamModelResult,
            AlsalamTrans.id == ALSalamModelResult.alsalam_id
        )
        .filter(ALSalamModelResult.id.is_(None))
        .all()
    )

    model_results = []

    for t in missing_txns:
        risk_score = float(
            clamp(
                float(np.tanh((t.Amount - 1000) / 1500))
                + float(random.uniform(-0.3, 0.3)),
                -1,
                1
            )
        )

        model_results.append(
            ALSalamModelResult(
                alsalam_id=int(t.id),
                fraud=1 if risk_score < 0 else 0,
                risk_score=risk_score
            )
        )

    if model_results:
        session.bulk_save_objects(model_results)
        session.commit()

    # --------------------------------------------------
    # 3️⃣ CUSTOMER INSERT (UNCHANGED)
    # --------------------------------------------------
    # all_customers = set(df["from_acct"]) | set(df["to_acct"])

    # existing_customers = {
    #     c.customer_id for c in session.query(Customer.customer_id).all()
    # }

    # new_customers = []

    # for cid in all_customers:
    #     if cid in existing_customers or cid == "nan":
    #         continue

    #     new_customers.append(
    #         Customer(
    #             customer_id=cid,
    #             first_name=fake.first_name(),
    #             last_name=fake.last_name(),
    #             email=f"{cid}@mail.com",
    #             phone=fake.phone_number(),
    #             gender=random.choice(["Male", "Female"]),
    #             age=random.randint(18, 70),
    #             is_married=random.choice([True, False]),
    #             address=fake.address(),
    #             state=fake.state(),
    #             geo_location=fake.city(),
    #             registered=fake.date_between(start_date="-6y", end_date="today"),
    #             current_balance=round(random.uniform(1000, 200000), 2),
    #             income=round(random.uniform(25000, 200000), 2),
    #             orders=random.randint(1, 1000),
    #             spent=round(random.uniform(1000, 90000), 2),
    #             job=fake.job(),
    #             vulnerability=random.choice([0, 0, 0, 1]),
    #             device_id=fake.uuid4()
    #         )
    #     )

    # if new_customers:
    #     session.add_all(new_customers)
    #     session.commit()

    # # --------------------------------------------------
    # # 4️⃣ RISK TABLE (UNCHANGED)
    # # --------------------------------------------------
    # existing_risk_customers = {
    #     r.customer_id for r in session.query(RiskTable.customer_id).all()
    # }

    # risk_rows = []

    # for c in session.query(Customer).all():
    #     if c.customer_id in existing_risk_customers:
    #         continue

    #     weekly_avg = random.uniform(300, 8000)
    #     monthly_avg = weekly_avg * random.uniform(3.5, 4.6)

    #     risk_score = float(random.uniform(0.2, 0.9))

    #     risk_rows.append(
    #         RiskTable(
    #             customer_id=c.customer_id,
    #             weekly_avg_debit_amount=weekly_avg,
    #             monthly_avg_debit_amount=monthly_avg,
    #             most_active_weekday=random.randint(0, 6),
    #             most_active_hour=random.randint(0, 23),
    #             weekly_low_avg_amount=weekly_avg * 0.5,
    #             weekly_high_avg_amount=weekly_avg * 1.8,
    #             foreign_transaction_flag=random.choice([0, 0.3, 0.6, 1]),
    #             volatility_risk=risk_score,
    #             deviation_risk=risk_score * 0.8,
    #             time_risk=risk_score * 0.6,
    #             foreign_risk=risk_score * 0.5,
    #             risk_score=risk_score,
    #             risk_probability=risk_score,
    #             risk_level="LOW" if risk_score < 0.3 else "MEDIUM" if risk_score < 0.7 else "HIGH"
    #         )
    #     )

    # if risk_rows:
    #     session.bulk_save_objects(risk_rows)
    #     session.commit()

print("✅ Ingestion completed safely and idempotently.")