from mule.mule_route import mule_route
from fastapi import FastAPI
import uvicorn
from config import (LOGGING_CONFIG, settings, FORWARDED_ALLOW_IPS, LIMIT_CONCURRENCY,
                    TIMEOUT_KEEP_ALIVE, MULE_SERVICE_PORT, HOST)

app = FastAPI(
    title='Mule Service API',
    description='Mule Service API for Network Visualization and Analysis',
    version='1.0.0',
    # docs_url=False,
    # redoc_url=False,
    # openapi_url=False
)
app.include_router(mule_route)

if __name__ == "__main__":
    uvicorn.run(app, host=HOST,
                port=MULE_SERVICE_PORT,
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