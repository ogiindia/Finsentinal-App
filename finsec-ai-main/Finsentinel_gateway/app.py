from pathlib import Path
import json
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings, FORWARDED_ALLOW_IPS, LIMIT_CONCURRENCY, TIMEOUT_KEEP_ALIVE, LOGGING_CONFIG
from auth_client import get_current_session, SessionInfo
from proxy import proxy_request

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

app = FastAPI(title=settings.API_TITLE,
              version=settings.API_VERSION,
              docs_url=None,
              redoc_url=None,
              openapi_url=None)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})

app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
async def root():
    return {"message": "Gateway up", "version": settings.API_VERSION}

ROUTES_CONFIG_PATH = Path(__file__).resolve().parent / "config" / "routes.json"

def load_routes_config() -> Dict[str, Any]:
    with open(ROUTES_CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

routes_cfg = load_routes_config()

service_map: Dict[str, str] = {}
raw_services = routes_cfg.get("services", {})
for name, value in raw_services.items():
    service_map[name] = value


def create_proxy_handler(
    *,
    base_url: str,
    target_prefix: str,
    timeout: float,
    auth_required: bool,
    rate_limit: Optional[str] = None,
):
    target_prefix = target_prefix.strip("/")

    if auth_required:
        async def handler(
            path: str = "",
            request: Request = None,
            session: SessionInfo = Depends(get_current_session),
        ):
            extra_headers = {
                "X-User-Name": session.username or "",
                "X-User-Type": session.user_type or "",
            }

            if target_prefix and path:
                upstream_path = f"{target_prefix}/{path}"
            elif target_prefix:
                upstream_path = target_prefix
            else:
                upstream_path = path

            return await proxy_request(
                request,
                base_url=base_url,
                upstream_path=upstream_path,
                extra_headers=extra_headers,
                timeout=timeout,
            )
    else:
        async def handler(
            path: str = "",
            request: Request = None,
        ):
            extra_headers = None

            if target_prefix and path:
                upstream_path = f"{target_prefix}/{path}"
            elif target_prefix:
                upstream_path = target_prefix
            else:
                upstream_path = path

            return await proxy_request(
                request,
                base_url=base_url,
                upstream_path=upstream_path,
                extra_headers=extra_headers,
                timeout=timeout,
            )

    if rate_limit:
        return limiter.limit(rate_limit)(handler)

    return handler


for route in routes_cfg.get("routes", []):
    prefix: str = route["prefix"].rstrip("/")
    methods: List[str] = route.get("methods", ["GET", "POST", "PUT", "PATCH", "DELETE"])
    service_key: str = route["service"]
    base_url = service_map[service_key]
    target_prefix: str = route.get("target_prefix", prefix)
    timeout: float = float(route.get("timeout", 60.0))
    auth_required: bool = bool(route.get("auth_required", False))
    rate_limit: Optional[str] = route.get("rate_limit")

    handler = create_proxy_handler(
        base_url=base_url,
        target_prefix=target_prefix,
        timeout=timeout,
        auth_required=auth_required,
        rate_limit=rate_limit,
    )

    name = route.get("name") or f"{service_key}_{prefix.strip('/').replace('/', '_')}_proxy"

    app.add_api_route(path=prefix, endpoint=handler, methods=methods, name=name)
    app.add_api_route(
        path=f"{prefix}/{{path:path}}",
        endpoint=handler,
        methods=methods,
        name=f"{name}_sub",
    )

@app.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def auth_proxy(path: str, request: Request):
    return await proxy_request(
        request,
        base_url=settings.CORE_SERVICE_URL,
        upstream_path=f"auth/{path}",
        timeout=60.0,
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL,
        log_config=LOGGING_CONFIG,
        proxy_headers=True,
        forwarded_allow_ips=FORWARDED_ALLOW_IPS,
        limit_concurrency=LIMIT_CONCURRENCY,
        timeout_keep_alive=TIMEOUT_KEEP_ALIVE,
        backlog=2048 
    )
