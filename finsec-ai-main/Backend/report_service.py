from report_route.report_route import router
from fastapi import FastAPI
import uvicorn
from config import LOGGING_CONFIG, settings, FORWARDED_ALLOW_IPS, LIMIT_CONCURRENCY, TIMEOUT_KEEP_ALIVE, HOST, REPORT_SERVICE_PORT

app = FastAPI(
    title='Report Service API',
    description='Report Service API for providing the informations in pdf formats',
    version='1.0.0',
    docs_url=False,
    redoc_url=False,
    openapi_url=False
)
app.include_router(router)

if __name__ == "__main__":
    uvicorn.run(app, host=HOST,
                port=REPORT_SERVICE_PORT,
                log_level=settings.LOG_LEVEL,
                log_config=LOGGING_CONFIG,
                proxy_headers=True,
                forwarded_allow_ips=FORWARDED_ALLOW_IPS,
                limit_concurrency=LIMIT_CONCURRENCY,
                # limit_max_requests=LIMIT_MAX_REQUESTS,
                timeout_keep_alive=TIMEOUT_KEEP_ALIVE,
                # workers=WORKERS,
                backlog=2048,
                reload=False
            )