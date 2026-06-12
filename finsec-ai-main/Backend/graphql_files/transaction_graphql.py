from __future__ import annotations

import base64
import enum
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple

import strawberry
from strawberry.schema.config import StrawberryConfig
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session, joinedload
from fastapi import Depends

from database import get_db
from model import AlsalamTrans, ALSalamModelResult

DecimalScalar = strawberry.scalar(
    Decimal,
    serialize=lambda v: str(v),
    parse_value=lambda v: Decimal(v),
    description="Exact decimal represented as a string.",
)

FloatScalar = strawberry.scalar(
    float,
    serialize=lambda v: float(v),
    parse_value=lambda v: float(v),
    description="Float value.",
)

def _encode_cursor(ts: datetime, row_id: int) -> str:
    ts_str = ts.isoformat() if isinstance(ts, datetime) else str(ts)
    raw = f"{ts_str}|{row_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()

def _decode_cursor(cursor: str) -> Tuple[str, int]:
    raw = base64.urlsafe_b64decode(cursor.encode()).decode()
    ts_s, id_s = raw.split("|", 1)
    return ts_s, int(id_s)

def parse_date_string(date_str: str) -> Optional[datetime]:
    if not date_str:
        return None
    date_str = date_str.strip()
    for fmt in [
        "%Y-%m-%d",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
    ]:
        try:
            return datetime.strptime(date_str, fmt)
        except (ValueError, IndexError):
            pass
    return None

def create_date_comparison_conditions(col, operator: str, value: str):
    parsed_date = parse_date_string(value)
    if not parsed_date:
        return col == value
    is_date_only = (
        parsed_date.hour == 0 and parsed_date.minute == 0 and parsed_date.second == 0
    )
    if operator == "==":
        if is_date_only:
            start = parsed_date
            end = parsed_date + timedelta(days=1)
            return and_(col >= start, col < end)
        else:
            return col == parsed_date
    elif operator == ">=":
        return col >= parsed_date
    elif operator == "<=":
        return col <= parsed_date
    elif operator == ">":
        return col > parsed_date
    elif operator == "<":
        return col < parsed_date
    return col == value

@strawberry.enum
class Direction(enum.Enum):
    INCOMING = "incoming"
    OUTGOING = "outgoing"
    BOTH = "both"

@strawberry.enum
class TransactionOrderBy(enum.Enum):
    TIMESTAMP_ASC = "timestamp_asc"
    TIMESTAMP_DESC = "timestamp_desc"
    AMOUNT_ASC = "amount_asc"
    AMOUNT_DESC = "amount_desc"

@strawberry.type
class ALSalamModelResultType:
    id: int
    alsalam_id: int
    fraud: Optional[int]
    risk_score: Optional[FloatScalar]

    @staticmethod
    def from_model(m: ALSalamModelResult) -> "ALSalamModelResultType":
        return ALSalamModelResultType(
            id=m.id,
            alsalam_id=m.alsalam_id,
            fraud=m.fraud,
            risk_score=m.risk_score,
        )

@strawberry.type
class AlsalamTransType:
    id: int
    customer_id: str
    timestamp: str
    amount: FloatScalar
    location: Optional[str]
    to_customer_id: Optional[str]
    feature_data: Optional[ALSalamModelResultType]

    @staticmethod
    def from_model(t: AlsalamTrans) -> "AlsalamTransType":
        ts_str = t.Timestamp.isoformat() if isinstance(t.Timestamp, datetime) else str(t.Timestamp)
        return AlsalamTransType(
            id=t.id,
            customer_id=t.Customer_Id,
            timestamp=ts_str,
            amount=float(t.Amount),
            location=t.Location,
            to_customer_id=t.To_Customer_Id,
            feature_data=ALSalamModelResultType.from_model(t.feature_data) if t.feature_data else None,
        )

@strawberry.type
class PageInfo:
    has_next_page: bool
    end_cursor: Optional[str]

@strawberry.type
class TransactionEdge:
    cursor: str
    node: AlsalamTransType

@strawberry.type
class TransactionsConnection:
    total: int
    edges: List[TransactionEdge]
    page_info: PageInfo

@strawberry.type
class TransactionsAggregate:
    count: int
    sum_amount: Optional[FloatScalar]
    avg_amount: Optional[FloatScalar]
    min_amount: Optional[FloatScalar]
    max_amount: Optional[FloatScalar]

@strawberry.type
class CustomerTransactionStats:
    customer_id: str
    total_transactions: int
    outgoing_count: int
    incoming_count: int
    total_amount_sent: Optional[FloatScalar]
    total_amount_received: Optional[FloatScalar]
    avg_amount_sent: Optional[FloatScalar]
    avg_amount_received: Optional[float]
    fraud_count: int
    fraud_percentage: Optional[float]
    unique_recipients: int
    unique_senders: int
    most_frequent_recipient: Optional[str]
    most_frequent_sender: Optional[str]
    date_range_start: Optional[str]
    date_range_end: Optional[str]

@strawberry.type
class CustomerProfile:
    customer_id: str
    stats: CustomerTransactionStats
    outgoing_transactions: List[AlsalamTransType]
    incoming_transactions: List[AlsalamTransType]
    recent_transactions: List[AlsalamTransType]

@strawberry.input
class IntList:
    values: List[int]

@strawberry.input
class StringList:
    values: List[str]

@strawberry.input
class RangeInt:
    gte: Optional[int] = None
    lte: Optional[int] = None

@strawberry.input
class RangeFloat:
    gte: Optional[float] = None
    lte: Optional[float] = None

@strawberry.input
class RangeString:
    gte: Optional[str] = None
    lte: Optional[str] = None

@strawberry.input
class DateFilter:
    eq: Optional[str] = None
    gte: Optional[str] = None
    lte: Optional[str] = None
    gt: Optional[str] = None
    lt: Optional[str] = None
    between: Optional[List[str]] = None

@strawberry.input
class ResultFilter:
    fraud_eq: Optional[int] = None
    risk_score: Optional[RangeFloat] = None

@strawberry.input
class TransactionFilter:
    id_in: Optional[IntList] = None
    customer_id_eq: Optional[str] = None
    customer_id_in: Optional[StringList] = None
    to_customer_id_eq: Optional[str] = None
    participant_id_eq: Optional[str] = None
    direction: Optional[Direction] = Direction.BOTH
    date_filter: Optional[DateFilter] = None
    timestamp: Optional[RangeString] = None
    amount: Optional[RangeInt] = None
    location_contains: Optional[str] = None
    has_feature_data: Optional[bool] = None
    feature_data: Optional[ResultFilter] = None

def _apply_date_filter(col, date_filter: Optional[DateFilter], q):
    if not date_filter:
        return q
    if date_filter.eq:
        q = q.filter(create_date_comparison_conditions(col, "==", date_filter.eq))
    if date_filter.gte:
        q = q.filter(create_date_comparison_conditions(col, ">=", date_filter.gte))
    if date_filter.lte:
        q = q.filter(create_date_comparison_conditions(col, "<=", date_filter.lte))
    if date_filter.gt:
        q = q.filter(create_date_comparison_conditions(col, ">", date_filter.gt))
    if date_filter.lt:
        q = q.filter(create_date_comparison_conditions(col, "<", date_filter.lt))
    if date_filter.between and len(date_filter.between) == 2:
        q = q.filter(create_date_comparison_conditions(col, ">=", date_filter.between[0]))
        q = q.filter(create_date_comparison_conditions(col, "<=", date_filter.between[1]))
    return q

def _apply_range_int(col, rng: Optional[RangeInt], q):
    if not rng:
        return q
    if rng.gte is not None:
        q = q.filter(col >= rng.gte)
    if rng.lte is not None:
        q = q.filter(col <= rng.lte)
    return q

def _apply_range_float(col, rng: Optional[RangeFloat], q):
    if not rng:
        return q
    if rng.gte is not None:
        q = q.filter(col >= rng.gte)
    if rng.lte is not None:
        q = q.filter(col <= rng.lte)
    return q

def _apply_range_string(col, rng: Optional[RangeString], q):
    if not rng:
        return q
    if rng.gte is not None:
        q = q.filter(col >= rng.gte)
    if rng.lte is not None:
        q = q.filter(col <= rng.lte)
    return q

def _apply_result_filter(q, f: Optional[ResultFilter]):
    if not f:
        return q
    if f.fraud_eq is not None:
        q = q.filter(ALSalamModelResult.fraud == f.fraud_eq)
    q = _apply_range_float(ALSalamModelResult.risk_score, f.risk_score, q)
    return q

def _apply_transaction_filters(q, f: Optional[TransactionFilter]):
    if not f:
        return q

    if f.id_in and f.id_in.values:
        q = q.filter(AlsalamTrans.id.in_(f.id_in.values))

    if f.customer_id_eq is not None:
        q = q.filter(AlsalamTrans.Customer_Id == f.customer_id_eq)

    if f.customer_id_in and f.customer_id_in.values:
        q = q.filter(AlsalamTrans.Customer_Id.in_(f.customer_id_in.values))

    if f.to_customer_id_eq is not None:
        q = q.filter(AlsalamTrans.To_Customer_Id == f.to_customer_id_eq)

    if f.participant_id_eq is not None:
        pid = f.participant_id_eq
        if f.direction == Direction.INCOMING:
            q = q.filter(AlsalamTrans.To_Customer_Id == pid)
        elif f.direction == Direction.OUTGOING:
            q = q.filter(AlsalamTrans.Customer_Id == pid)
        else:
            q = q.filter(
                or_(
                    AlsalamTrans.Customer_Id == pid,
                    AlsalamTrans.To_Customer_Id == pid,
                )
            )

    q = _apply_date_filter(AlsalamTrans.Timestamp, f.date_filter, q)
    q = _apply_range_string(AlsalamTrans.Timestamp, f.timestamp, q)
    q = _apply_range_int(AlsalamTrans.Amount, f.amount, q)

    if f.location_contains:
        q = q.filter(AlsalamTrans.Location.ilike(f"%{f.location_contains}%"))

    if f.has_feature_data is True:
        q = q.filter(AlsalamTrans.feature_data != None)
    elif f.has_feature_data is False:
        q = q.filter(AlsalamTrans.feature_data == None)

    if f.feature_data:
        rf = f.feature_data
        q = q.join(AlsalamTrans.feature_data)
        if rf.fraud_eq is not None:
            q = q.filter(ALSalamModelResult.fraud == rf.fraud_eq)
        q = _apply_range_float(ALSalamModelResult.risk_score, rf.risk_score, q)

    return q

def _apply_ordering(q, order_by: TransactionOrderBy):
    if order_by == TransactionOrderBy.TIMESTAMP_ASC:
        return q.order_by(AlsalamTrans.Timestamp.asc(), AlsalamTrans.id.asc())
    if order_by == TransactionOrderBy.TIMESTAMP_DESC:
        return q.order_by(AlsalamTrans.Timestamp.desc(), AlsalamTrans.id.desc())
    if order_by == TransactionOrderBy.AMOUNT_ASC:
        return q.order_by(AlsalamTrans.Amount.asc(), AlsalamTrans.id.asc())
    if order_by == TransactionOrderBy.AMOUNT_DESC:
        return q.order_by(AlsalamTrans.Amount.desc(), AlsalamTrans.id.desc())
    return q

def _compute_customer_stats(
    db: Session,
    customer_id: str,
    date_filter: Optional[DateFilter] = None,
) -> Optional[CustomerTransactionStats]:
    outgoing_q = db.query(AlsalamTrans).options(joinedload(AlsalamTrans.feature_data)).filter(
        AlsalamTrans.Customer_Id == customer_id
    )
    incoming_q = db.query(AlsalamTrans).options(joinedload(AlsalamTrans.feature_data)).filter(
        AlsalamTrans.To_Customer_Id == customer_id
    )

    if date_filter:
        outgoing_q = _apply_date_filter(AlsalamTrans.Timestamp, date_filter, outgoing_q)
        incoming_q = _apply_date_filter(AlsalamTrans.Timestamp, date_filter, incoming_q)

    total_transactions = outgoing_q.count() + incoming_q.count()
    outgoing_count = outgoing_q.count()
    incoming_count = incoming_q.count()

    total_amount_sent = outgoing_q.with_entities(func.sum(AlsalamTrans.Amount)).scalar()
    total_amount_received = incoming_q.with_entities(func.sum(AlsalamTrans.Amount)).scalar()

    avg_amount_sent = outgoing_q.with_entities(func.avg(AlsalamTrans.Amount)).scalar()
    avg_amount_received = incoming_q.with_entities(func.avg(AlsalamTrans.Amount)).scalar()

    fraud_count = outgoing_q.join(ALSalamModelResult).filter(ALSalamModelResult.fraud == -1).count()
    fraud_percentage = (fraud_count / total_transactions * 100.0) if total_transactions > 0 else None

    unique_recipients = outgoing_q.with_entities(
        func.count(func.distinct(AlsalamTrans.To_Customer_Id))
    ).scalar() or 0
    unique_senders = incoming_q.with_entities(
        func.count(func.distinct(AlsalamTrans.Customer_Id))
    ).scalar() or 0

    most_frequent_recipient_result = outgoing_q.with_entities(
        AlsalamTrans.To_Customer_Id
    ).group_by(
        AlsalamTrans.To_Customer_Id
    ).order_by(
        func.count(AlsalamTrans.To_Customer_Id).desc()
    ).first()

    most_frequent_sender_result = incoming_q.with_entities(
        AlsalamTrans.Customer_Id
    ).group_by(
        AlsalamTrans.Customer_Id
    ).order_by(
        func.count(AlsalamTrans.Customer_Id).desc()
    ).first()

    most_frequent_recipient = most_frequent_recipient_result[0] if most_frequent_recipient_result else None
    most_frequent_sender = most_frequent_sender_result[0] if most_frequent_sender_result else None

    all_q = outgoing_q.union_all(incoming_q)
    earliest = all_q.with_entities(func.min(AlsalamTrans.Timestamp)).scalar()
    latest = all_q.with_entities(func.max(AlsalamTrans.Timestamp)).scalar()

    def iso(x):
        return x.isoformat() if isinstance(x, datetime) else (str(x) if x is not None else None)

    return CustomerTransactionStats(
        customer_id=customer_id,
        total_transactions=total_transactions,
        outgoing_count=outgoing_count,
        incoming_count=incoming_count,
        total_amount_sent=float(total_amount_sent) if total_amount_sent is not None else None,
        total_amount_received=float(total_amount_received) if total_amount_received is not None else None,
        avg_amount_sent=float(avg_amount_sent) if avg_amount_sent is not None else None,
        avg_amount_received=float(avg_amount_received) if avg_amount_received is not None else None,
        fraud_count=fraud_count,
        fraud_percentage=fraud_percentage,
        unique_recipients=unique_recipients,
        unique_senders=unique_senders,
        most_frequent_recipient=most_frequent_recipient,
        most_frequent_sender=most_frequent_sender,
        date_range_start=iso(earliest),
        date_range_end=iso(latest),
    )

@strawberry.type
class TransactionQuery:
    @strawberry.field
    def transactions(
        self,
        info,
        filter: Optional[TransactionFilter] = None,
        order_by: TransactionOrderBy = TransactionOrderBy.TIMESTAMP_DESC,
        first: int = 50,
        after: Optional[str] = None,
    ) -> TransactionsConnection:
        db: Session = info.context["db"]
        base_q = db.query(AlsalamTrans).options(joinedload(AlsalamTrans.feature_data))
        base_q = _apply_transaction_filters(base_q, filter)
        base_q = _apply_ordering(base_q, order_by)
        total = base_q.count()

        if after:
            after_ts_s, after_id = _decode_cursor(after)
            after_ts = parse_date_string(after_ts_s) or after_ts_s

            if order_by == TransactionOrderBy.TIMESTAMP_ASC:
                base_q = base_q.filter(
                    or_(
                        AlsalamTrans.Timestamp > after_ts,
                        and_(
                            AlsalamTrans.Timestamp == after_ts,
                            AlsalamTrans.id > after_id,
                        ),
                    )
                )
            elif order_by == TransactionOrderBy.TIMESTAMP_DESC:
                base_q = base_q.filter(
                    or_(
                        AlsalamTrans.Timestamp < after_ts,
                        and_(
                            AlsalamTrans.Timestamp == after_ts,
                            AlsalamTrans.id < after_id,
                        ),
                    )
                )

        rows = base_q.limit(first + 1).all()
        edges: List[TransactionEdge] = []
        has_next_page = False
        end_cursor: Optional[str] = None

        for row in rows[:first]:
            cursor = _encode_cursor(row.Timestamp, row.id)
            edges.append(TransactionEdge(cursor=cursor, node=AlsalamTransType.from_model(row)))
            end_cursor = cursor

        if len(rows) > first:
            has_next_page = True

        page_info = PageInfo(has_next_page=has_next_page, end_cursor=end_cursor)
        return TransactionsConnection(total=total, edges=edges, page_info=page_info)

    @strawberry.field
    def transactions_aggregate(
        self,
        info,
        filter: Optional[TransactionFilter] = None,
    ) -> TransactionsAggregate:
        db: Session = info.context["db"]
        q = db.query(AlsalamTrans)
        q = _apply_transaction_filters(q, filter)

        to_float = lambda v: float(v) if v is not None else None

        return TransactionsAggregate(
            count=(q.with_entities(func.count(func.distinct(AlsalamTrans.id))).scalar() or 0),
            sum_amount=to_float(q.with_entities(func.sum(AlsalamTrans.Amount)).scalar()),
            avg_amount=to_float(q.with_entities(func.avg(AlsalamTrans.Amount)).scalar()),
            min_amount=to_float(q.with_entities(func.min(AlsalamTrans.Amount)).scalar()),
            max_amount=to_float(q.with_entities(func.max(AlsalamTrans.Amount)).scalar()),
        )

    @strawberry.field
    def customer_stats(
        self,
        info,
        customer_id: str,
        date_filter: Optional[DateFilter] = None,
    ) -> Optional[CustomerTransactionStats]:
        db: Session = info.context["db"]
        return _compute_customer_stats(db, customer_id, date_filter)

    @strawberry.field
    def transaction_customer_profile(
        self,
        info,
        customer_id: str,
        limit: Optional[int] = 50,
        date_filter: Optional[DateFilter] = None,
        fraud_only: bool = False,
    ) -> Optional[CustomerProfile]:
        db: Session = info.context["db"]

        outgoing_q = db.query(AlsalamTrans).options(joinedload(AlsalamTrans.feature_data)).filter(
            AlsalamTrans.Customer_Id == customer_id
        )
        incoming_q = db.query(AlsalamTrans).options(joinedload(AlsalamTrans.feature_data)).filter(
            AlsalamTrans.To_Customer_Id == customer_id
        )

        if date_filter:
            outgoing_q = _apply_date_filter(AlsalamTrans.Timestamp, date_filter, outgoing_q)
            incoming_q = _apply_date_filter(AlsalamTrans.Timestamp, date_filter, incoming_q)

        if fraud_only:
            outgoing_q = outgoing_q.join(ALSalamModelResult).filter(ALSalamModelResult.fraud == -1)
            incoming_q = incoming_q.join(ALSalamModelResult).filter(ALSalamModelResult.fraud == -1)

        effective_limit = limit or 50

        outgoing_recent = outgoing_q.order_by(AlsalamTrans.Timestamp.desc()).limit(effective_limit).all()
        incoming_recent = incoming_q.order_by(AlsalamTrans.Timestamp.desc()).limit(effective_limit).all()

        stats = _compute_customer_stats(db, customer_id, date_filter)

        merged = [*outgoing_recent, *incoming_recent]
        merged_sorted = sorted(merged, key=lambda t: t.Timestamp, reverse=True)
        recent_limited = merged_sorted[:effective_limit]

        return CustomerProfile(
            customer_id=customer_id,
            stats=stats,
            outgoing_transactions=[AlsalamTransType.from_model(t) for t in outgoing_recent],
            incoming_transactions=[AlsalamTransType.from_model(t) for t in incoming_recent],
            recent_transactions=[AlsalamTransType.from_model(t) for t in recent_limited],
        )

transaction_schema = strawberry.Schema(
    query=TransactionQuery,
    config=StrawberryConfig(auto_camel_case=False),
)

def get_context(db: Session = Depends(get_db)):
    return {"db": db}
