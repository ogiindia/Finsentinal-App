from graphql_files.customer_graphql import customer_schema
from graphql_files.transaction_graphql import transaction_schema, get_context
from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter
from config import (LOGGING_CONFIG, settings, FORWARDED_ALLOW_IPS, 
                    LIMIT_CONCURRENCY, TIMEOUT_KEEP_ALIVE, GRAPHQL_SERVICE_PORT, HOST)

app = FastAPI(
    title="Finsentinel AI Graphql",
    description="Backend API for Finsentinel AI platform",
    version="1.0.0",
    docs_url=False,
    redoc_url=False,
    openapi_url=False
)

app.include_router(
    GraphQLRouter(customer_schema),
    prefix="/cust_graphql",
    tags=['Graphql']
)

app.include_router(
    GraphQLRouter(transaction_schema, context_getter=get_context),
    prefix="/trans_graphql",
    tags=['Graphql']
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST,
                port=GRAPHQL_SERVICE_PORT,
                log_level=settings.LOG_LEVEL,
                log_config=LOGGING_CONFIG,
                proxy_headers=True,
                forwarded_allow_ips=FORWARDED_ALLOW_IPS,
                limit_concurrency=LIMIT_CONCURRENCY,
                # limit_max_requests=LIMIT_MAX_REQUESTS,
                timeout_keep_alive=TIMEOUT_KEEP_ALIVE,
                # workers=WORKERS,
                backlog=2048 
                )