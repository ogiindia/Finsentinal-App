# utils/pyd_sa.py
from typing import Any
from decimal import Decimal
from pydantic import BaseModel, create_model, ConfigDict
from sqlalchemy.inspection import inspect
from sqlalchemy.sql.sqltypes import NullType

def pydantic_model_from_sa(sa_model, name: str | None = None) -> type[BaseModel]:

    mapper = inspect(sa_model)
    fields: dict[str, tuple[type[Any], Any]] = {}

    for col in mapper.columns:
        # Best-effort python_type
        try:
            py_type = col.type.python_type  # works for most types (Integer, String, Float, Boolean, DateTime, Enum, Numeric->Decimal)
        except NotImplementedError:
            # Fallback for exotic/NullType types
            py_type = Any

        # required vs optional/default
        if col.primary_key and col.autoincrement:
            default = None  # PK autoincrement comes from DB; expose as optional in output
        elif col.default is not None or col.server_default is not None or col.nullable:
            default = None  # optional field in output
        else:
            default = ...   # required

        fields[col.key] = (py_type, default)

    model_cls = create_model(
        name or f"{sa_model.__name__}Out",
        __base__=BaseModel,
        __module__=__name__,
        **fields,
    )
    # Pydantic v2 config (replaces orm_mode=True)
    model_cls.model_config = ConfigDict(from_attributes=True)
    return model_cls
