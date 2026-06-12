from alert.alert_route import alerts_router
from fastapi import FastAPI
import uvicorn
from config import (LOGGING_CONFIG, settings, FORWARDED_ALLOW_IPS, LIMIT_CONCURRENCY,
                    TIMEOUT_KEEP_ALIVE, ALERT_SERVICE_PORT, HOST)

app = FastAPI(
    title='Alert Service API',
    description='Alert Service API for getting and returning the alerts from casemanager',
    version='1.0.0',
    docs_url=False,
    redoc_url=False,
    openapi_url=False
)
app.include_router(alerts_router)
app.state.settings = settings
# app.state.session_manager = session_manager

if __name__ == "__main__":
    uvicorn.run(app, host=HOST,
                port=ALERT_SERVICE_PORT,
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