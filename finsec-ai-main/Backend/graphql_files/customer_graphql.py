from __future__ import annotations

from typing import Optional, List, Any
import enum
import strawberry
from strawberry.schema.config import StrawberryConfig
from strawberry.extensions import SchemaExtension
from sqlalchemy import func, or_, and_
from sqlalchemy.orm import Session

from database import get_db
from model import Customer

class DBSessionExtension(SchemaExtension):
    def on_operation(self):
        db = next(get_db())
        self.execution_context.context["db"] = db
        try:
            yield
        finally:
            db.close()

@strawberry.type
class CustomerType:
    id: int
    customer_id: str
    first_name: Optional[str]
    last_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    gender: Optional[str]
    age: Optional[int]
    is_married: Optional[bool]
    address: Optional[str]
    merchant_address: Optional[int]
    state: Optional[str]
    geo_location: Optional[str]
    registered: Optional[str]
    account_holding: Optional[int]
    loan_account: Optional[str]
    current_balance: Optional[float]
    income: Optional[float]
    orders: Optional[int]
    spent: Optional[float]
    job: Optional[str]
    hobbies: Optional[str]
    vulnerability: Optional[int]
    device_id: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]

    @staticmethod
    def from_model(m: Customer) -> "CustomerType":
        def iso(x):
            try:
                return x.isoformat() if x is not None else None
            except Exception:
                return x

        return CustomerType(
            id=m.id,
            customer_id=m.customer_id,
            first_name=m.first_name,
            last_name=m.last_name,
            email=m.email,
            phone=m.phone,
            gender=m.gender,
            age=m.age,
            is_married=m.is_married,
            address=m.address,
            merchant_address=m.merchant_address,
            state=m.state,
            geo_location=m.geo_location,
            registered=iso(m.registered),
            account_holding=m.account_holding,
            loan_account=m.loan_account,
            current_balance=m.current_balance,
            income=m.income,
            orders=m.orders,
            spent=m.spent,
            job=m.job,
            hobbies=m.hobbies,
            vulnerability=m.vulnerability,
            device_id=m.device_id,
            created_at=iso(m.created_at),
            updated_at=iso(m.updated_at),
        )

@strawberry.enum
class SortDir(enum.Enum):
    ASC = "ASC"
    DESC = "DESC"

@strawberry.enum
class FilterOp(enum.Enum):
    EQ = "EQ"
    NE = "NE"
    GT = "GT"
    GTE = "GTE"
    LT = "LT"
    LTE = "LTE"
    LIKE = "LIKE"
    ILIKE = "ILIKE"
    IN = "IN"
    NOT_IN = "NOT_IN"
    IS_NULL = "IS_NULL"

@strawberry.input
class DynamicFilterCondition:
    column: str
    op: FilterOp
    value: Optional[str] = None

@strawberry.input
class DynamicFilter:
    AND: Optional[List["DynamicFilter"]] = None
    OR: Optional[List["DynamicFilter"]] = None
    conditions: Optional[List[DynamicFilterCondition]] = None

@strawberry.input
class CustomerFilter:
    customer_id_eq: Optional[str] = None
    email_contains: Optional[str] = None
    name_contains: Optional[str] = None
    state_eq: Optional[str] = None
    min_balance: Optional[float] = None
    max_balance: Optional[float] = None
    vulnerable_only: Optional[bool] = None

@strawberry.type
class ColumnValueCheck:
    column_name: str
    value: Optional[str]
    exists: bool
    count: int
    other_customer_ids: List[str]
    has_more: bool

def _get_column_attribute(column_name: str):
    COLUMN_MAP = {
        "customer_id": Customer.customer_id,
        "first_name": Customer.first_name,
        "last_name": Customer.last_name,
        "email": Customer.email,
        "phone": Customer.phone,
        "gender": Customer.gender,
        "age": Customer.age,
        "is_married": Customer.is_married,
        "address": Customer.address,
        "merchant_address": Customer.merchant_address,
        "state": Customer.state,
        "geo_location": Customer.geo_location,
        "registered": Customer.registered,
        "account_holding": Customer.account_holding,
        "loan_account": Customer.loan_account,
        "current_balance": Customer.current_balance,
        "income": Customer.income,
        "orders": Customer.orders,
        "spent": Customer.spent,
        "job": Customer.job,
        "hobbies": Customer.hobbies,
        "vulnerability": Customer.vulnerability,
        "device_id": Customer.device_id,
        "created_at": Customer.created_at,
        "updated_at": Customer.updated_at,
    }

    if column_name not in COLUMN_MAP:
        raise ValueError(f"Invalid column name: {column_name}")

    return COLUMN_MAP[column_name]

def _apply_dynamic_condition(q, condition: DynamicFilterCondition):
    try:
        col = _get_column_attribute(condition.column)
    except ValueError:
        return q

    if condition.op == FilterOp.EQ:
        q = q.filter(col == condition.value)
    elif condition.op == FilterOp.NE:
        q = q.filter(col != condition.value)
    elif condition.op == FilterOp.GT:
        q = q.filter(col > condition.value)
    elif condition.op == FilterOp.GTE:
        q = q.filter(col >= condition.value)
    elif condition.op == FilterOp.LT:
        q = q.filter(col < condition.value)
    elif condition.op == FilterOp.LTE:
        q = q.filter(col <= condition.value)
    elif condition.op == FilterOp.LIKE:
        q = q.filter(col.like(condition.value))
    elif condition.op == FilterOp.ILIKE:
        q = q.filter(col.ilike(condition.value))
    elif condition.op == FilterOp.IN:
        if condition.value:
            values = condition.value.split(',')
            q = q.filter(col.in_(values))
    elif condition.op == FilterOp.NOT_IN:
        if condition.value:
            values = condition.value.split(',')
            q = q.filter(~col.in_(values))
    elif condition.op == FilterOp.IS_NULL:
        if condition.value is None:
            q = q.filter(col.is_(None))
        else:
            if condition.value and condition.value.lower() == 'true':
                q = q.filter(col.is_(None))
            else:
                q = q.filter(col.isnot(None))

    return q

def _apply_dynamic_filters(q, where: Optional[DynamicFilter]):
    if not where:
        return q

    conditions = where.conditions or []
    for cond in conditions:
        q = _apply_dynamic_condition(q, cond)

    if where.AND:
        for sub in where.AND:
            q = q.filter(_build_dynamic_filter_expression(sub))
    if where.OR:
        or_expressions = []
        for sub in where.OR:
            or_expressions.append(_build_dynamic_filter_expression(sub))
        if or_expressions:
            q = q.filter(or_(*or_expressions))

    return q

def _build_dynamic_filter_expression(where: DynamicFilter):
    conditions = where.conditions or []
    expr = None

    for cond in conditions:
        col = _get_column_attribute(cond.column)
        sub_expr = None

        if cond.op == FilterOp.EQ:
            sub_expr = (col == cond.value)
        elif cond.op == FilterOp.NE:
            sub_expr = (col != cond.value)
        elif cond.op == FilterOp.GT:
            sub_expr = (col > cond.value)
        elif cond.op == FilterOp.GTE:
            sub_expr = (col >= cond.value)
        elif cond.op == FilterOp.LT:
            sub_expr = (col < cond.value)
        elif cond.op == FilterOp.LTE:
            sub_expr = (col <= cond.value)
        elif cond.op == FilterOp.LIKE:
            sub_expr = col.like(cond.value)
        elif cond.op == FilterOp.ILIKE:
            sub_expr = col.ilike(cond.value)
        elif cond.op == FilterOp.IN:
            if cond.value:
                values = cond.value.split(',')
                sub_expr = col.in_(values)
        elif cond.op == FilterOp.NOT_IN:
            if cond.value:
                values = cond.value.split(',')
                sub_expr = ~col.in_(values)
        elif cond.op == FilterOp.IS_NULL:
            if cond.value is None or cond.value.lower() == 'true':
                sub_expr = col.is_(None)
            else:
                sub_expr = col.isnot(None)

        if sub_expr is not None:
            expr = sub_expr if expr is None else and_(expr, sub_expr)

    if where.AND:
        for sub in where.AND:
            sub_expr = _build_dynamic_filter_expression(sub)
            if sub_expr is not None:
                expr = sub_expr if expr is None else and_(expr, sub_expr)

    if where.OR:
        or_expr = None
        for sub in where.OR:
            sub_expr = _build_dynamic_filter_expression(sub)
            if sub_expr is not None:
                or_expr = sub_expr if or_expr is None else or_(or_expr, sub_expr)
        if or_expr is not None:
            expr = or_expr if expr is None else and_(expr, or_expr)

    if expr is None:
        expr = True

    return expr

def _apply_filters(q, f: Optional[CustomerFilter]):
    if not f:
        return q

    if f.customer_id_eq is not None:
        q = q.filter(Customer.customer_id == f.customer_id_eq)

    if f.email_contains:
        q = q.filter(Customer.email.ilike(f"%{f.email_contains}%"))

    if f.name_contains:
        name = f"%{f.name_contains}%"
        q = q.filter(
            or_(
                Customer.first_name.ilike(name),
                Customer.last_name.ilike(name),
            )
        )

    if f.state_eq:
        q = q.filter(Customer.state == f.state_eq)

    if f.min_balance is not None:
        q = q.filter(Customer.current_balance >= f.min_balance)

    if f.max_balance is not None:
        q = q.filter(Customer.current_balance <= f.max_balance)

    if f.vulnerable_only:
        q = q.filter(Customer.vulnerability == 1)

    return q

def _apply_order(q, order_by: Optional[str], order_dir: SortDir):
    mapping = {
        "id": Customer.id,
        "customer_id": Customer.customer_id,
        "first_name": Customer.first_name,
        "last_name": Customer.last_name,
        "email": Customer.email,
        "phone": Customer.phone,
        "state": Customer.state,
        "current_balance": Customer.current_balance,
        "income": Customer.income,
        "orders": Customer.orders,
        "spent": Customer.spent,
        "created_at": Customer.created_at,
        "updated_at": Customer.updated_at,
    }

    col = mapping.get(order_by or "created_at", Customer.created_at)
    if order_dir == SortDir.ASC:
        q = q.order_by(col.asc())
    else:
        q = q.order_by(col.desc())
    return q

@strawberry.type
class Query:
    @strawberry.field
    def customer_by_id(self, info, id: int) -> Optional[CustomerType]:
        db: Session = info.context["db"]
        row = db.get(Customer, id)
        return CustomerType.from_model(row) if row else None

    @strawberry.field
    def customers(
        self,
        info,
        filter: Optional[CustomerFilter] = None,
        where: Optional[DynamicFilter] = None,
        order_by: Optional[str] = "created_at",
        order_dir: SortDir = SortDir.DESC,
        limit: int = 100,
        offset: int = 0,
    ) -> List[CustomerType]:
        db: Session = info.context["db"]
        q = db.query(Customer)
        q = _apply_filters(q, filter)
        q = _apply_dynamic_filters(q, where)
        q = _apply_order(q, order_by, order_dir)
        rows = q.offset(offset).limit(limit).all()
        return [CustomerType.from_model(r) for r in rows]

    @strawberry.field
    def customers_count(
        self, 
        info, 
        filter: Optional[CustomerFilter] = None,
        where: Optional[DynamicFilter] = None
    ) -> int:
        db: Session = info.context["db"]
        q = db.query(func.count(Customer.id))
        q = _apply_filters(q, filter)
        q = _apply_dynamic_filters(q, where)
        return q.scalar() or 0

    @strawberry.field
    def check_column_value(
        self,
        info,
        column_name: str,
        value: str,
        exclude_customer_id: Optional[str] = None,
        limit: int = 100
    ) -> ColumnValueCheck:
        db: Session = info.context["db"]
        try:
            col = _get_column_attribute(column_name)
        except ValueError:
            return ColumnValueCheck(
                column_name=column_name,
                value=value,
                exists=False,
                count=0,
                other_customer_ids=[],
                has_more=False
            )

        q = db.query(Customer.customer_id).filter(col == value)

        if exclude_customer_id is not None:
            q = q.filter(Customer.customer_id != exclude_customer_id)

        total_count = q.count()
        matching_customers = q.limit(limit).all()
        customer_ids = [cust[0] for cust in matching_customers]

        return ColumnValueCheck(
            column_name=column_name,
            value=value,
            exists=total_count > 0,
            count=total_count,
            other_customer_ids=customer_ids,
            has_more=total_count > limit
        )

    @strawberry.field
    def get_valid_columns(self, info) -> List[str]:
        return [
            "customer_id", "first_name", "last_name", "email", "phone",
            "gender", "age", "is_married", "address", "merchant_address",
            "state", "geo_location", "registered", "account_holding",
            "loan_account", "current_balance", "income", "orders",
            "spent", "job", "hobbies", "vulnerability", "device_id",
            "created_at", "updated_at"
        ]

customer_schema = strawberry.Schema(
    query=Query,
    config=StrawberryConfig(auto_camel_case=False),
    extensions=[DBSessionExtension]
)
