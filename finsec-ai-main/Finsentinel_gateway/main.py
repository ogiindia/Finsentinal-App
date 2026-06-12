# gateway/main.py
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from config import settings, FORWARDED_ALLOW_IPS, LIMIT_CONCURRENCY, TIMEOUT_KEEP_ALIVE
from auth_client import get_current_session, SessionInfo
from proxy import proxy_request


app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
)


# CORS (only on gateway)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Gateway up", "version": settings.API_VERSION}

# AUTH ENDPOINTS (no session required)
@app.api_route(
    "/auth/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
)
async def auth_proxy(path: str, request: Request):
    """
    Pure proxy for /auth/** to your existing microservice.
    examples:
      POST /auth/login  -> AUTH_CORE_SERVICE_URL/auth/login
      GET  /auth/session -> AUTH_CORE_SERVICE_URL/auth/session
    """
    return await proxy_request(
        request,
        base_url=str(settings.CORE_SERVICE_URL),
        upstream_path=f"auth/{path}"
    )

# # PROTECTED routes to Auth/Core microservice
# @app.api_route(
#     "/api/{path:path}",
#     methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
# )
# async def core_proxy(
#     path: str,
#     request: Request,
#     session: SessionInfo = Depends(get_current_session),
# ):
#     """
#     Any call to /core/** requires a valid session.
#     We validate it via /auth/session and then forward to your microservice.
#     """
#     # Inject user info headers for downstream services (optional)
#     extra_headers = {
#         "X-User-Name": session.username or "",
#         "X-User-Type": session.user_type or "",
#     }

#     return await proxy_request(
#         request,
#         base_url=str(settings.CORE_SERVICE_URL),
#         upstream_path=f"api/{path}",  # no extra prefix: /core/alerts/... -> /alerts/...
#         extra_headers=extra_headers,
#     )


@app.api_route(
    "/customer/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
)
async def customer_proxy(
    path: str,
    request: Request,
    # session: SessionInfo = Depends(get_current_session),
):
    """
    Any call to /core/** requires a valid session.
    We validate it via /auth/session and then forward to your microservice.
    """
    # # Inject user info headers for downstream services (optional)
    # extra_headers = {
    #     "X-User-Name": session.username or "",
    #     "X-User-Type": session.user_type or "",
    # }

    return await proxy_request(
        request,
        base_url=str(settings.CORE_SERVICE_URL),
        upstream_path=f"customer/{path}"
        # extra_headers=extra_headers,
    )

@app.api_route(
    "/model_config/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
)
async def model_config_proxy(
    path: str,
    request: Request,
    # session: SessionInfo = Depends(get_current_session),
):
    """
    Any call to /core/** requires a valid session.
    We validate it via /auth/session and then forward to your microservice.
    """
    # # Inject user info headers for downstream services (optional)
    # extra_headers = {
    #     "X-User-Name": session.username or "",
    #     "X-User-Type": session.user_type or "",
    # }

    return await proxy_request(
        request,
        base_url=str(settings.CORE_SERVICE_URL),
        upstream_path=f"model_config/{path}"
        # extra_headers=extra_headers,
    )

@app.api_route(
    "/alerts/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
)
async def alerts_proxy(
    path: str,
    request: Request,
    # session: SessionInfo = Depends(get_current_session),
):
    """
    Any call to /core/** requires a valid session.
    We validate it via /auth/session and then forward to your microservice.
    """
    # # Inject user info headers for downstream services (optional)
    # extra_headers = {
    #     "X-User-Name": session.username or "",
    #     "X-User-Type": session.user_type or "",
    # }

    return await proxy_request(
        request,
        base_url=str(settings.CORE_SERVICE_URL),
        upstream_path=f"alerts/{path}"
        # extra_headers=extra_headers,
    )

@app.api_route(
    "/mule/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
)
async def mule_proxy(
    path: str,
    request: Request,
    # session: SessionInfo = Depends(get_current_session),
):
    """
    Any call to /core/** requires a valid session.
    We validate it via /auth/session and then forward to your microservice.
    """
    # # Inject user info headers for downstream services (optional)
    # extra_headers = {
    #     "X-User-Name": session.username or "",
    #     "X-User-Type": session.user_type or "",
    # }

    return await proxy_request(
        request,
        base_url=str(settings.CORE_SERVICE_URL),
        upstream_path=f"mule/{path}"
        # extra_headers=extra_headers,
    )

@app.api_route(
    "/api/version/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
)
async def version_proxy(
    path: str,
    request: Request,
    # session: SessionInfo = Depends(get_current_session),
):
    """
    Any call to /core/** requires a valid session.
    We validate it via /auth/session and then forward to your microservice.
    """
    # # Inject user info headers for downstream services (optional)
    # extra_headers = {
    #     "X-User-Name": session.username or "",
    #     "X-User-Type": session.user_type or "",
    # }

    return await proxy_request(
        request,
        base_url=str(settings.CORE_SERVICE_URL),
        upstream_path=f"api/version/{path}"
        # extra_headers=extra_headers,
    )

@app.api_route(
    "/api/retrain/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
)
async def retrain_proxy(
    path: str,
    request: Request,
    # session: SessionInfo = Depends(get_current_session),
):
    """
    Any call to /core/** requires a valid session.
    We validate it via /auth/session and then forward to your microservice.
    """
    # # Inject user info headers for downstream services (optional)
    # extra_headers = {
    #     "X-User-Name": session.username or "",
    #     "X-User-Type": session.user_type or "",
    # }

    return await proxy_request(
        request,
        base_url=str(settings.CORE_SERVICE_URL),
        upstream_path=f"api/retrain/{path}"
        # extra_headers=extra_headers,
    )

@app.api_route(
    "/dashboard/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
)
async def dashboard_proxy(
    path: str,
    request: Request,
    # session: SessionInfo = Depends(get_current_session),
):
    """
    Any call to /core/** requires a valid session.
    We validate it via /auth/session and then forward to your microservice.
    """
    # # Inject user info headers for downstream services (optional)
    # extra_headers = {
    #     "X-User-Name": session.username or "",
    #     "X-User-Type": session.user_type or "",
    # }

    return await proxy_request(
        request,
        base_url=str(settings.CORE_SERVICE_URL),
        upstream_path=f"dashboard/{path}"
        # extra_headers=extra_headers,
    )

@app.api_route(
    "/workflow/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
)
async def workflow_proxy(
    path: str,
    request: Request,
    # session: SessionInfo = Depends(get_current_session),
):
    # extra_headers = {
    #     "X-User-Name": session.username or "",
    #     "X-User-Type": session.user_type or "",
    # }
    return await proxy_request(
        request,
        base_url=str(settings.WORKFLOW_SERVICE_URL),
        upstream_path=f"/api/{path}",
        timeout=120.0
        # extra_headers=extra_headers,
    )

@app.api_route(
    "/cust_graphql/{path:path}",
    methods=["GET", "POST"]
)
async def cust_graphql_proxy(
    path: str,
    request: Request,
    # session: SessionInfo = Depends(get_current_session),
):
    # extra_headers = {
    #     "X-User-Name": session.username or "",
    #     "X-User-Type": session.user_type or "",
    # }
    return await proxy_request(
        request,
        base_url=str(settings.CORE_SERVICE_URL),
        upstream_path=f"cust_graphql/{path}",
        timeout=120.0
        # extra_headers=extra_headers,
    )

@app.api_route(
    "/trans_graphql/{path:path}",
    methods=["GET", "POST"]
)
async def trans_graphql_proxy(
    path: str,
    request: Request
    # session: SessionInfo = Depends(get_current_session),
):
    # extra_headers = {
    #     "X-User-Name": session.username or "",
    #     "X-User-Type": session.user_type or "",
    # }
    return await proxy_request(
        request,
        base_url=str(settings.CORE_SERVICE_URL),
        upstream_path=f"trans_graphql/{path}",
        timeout=120.0
        # extra_headers=extra_headers,
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        # reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL,
        # log_config=LOGGING_CONFIG,
        proxy_headers=True,
        forwarded_allow_ips=FORWARDED_ALLOW_IPS,
        limit_concurrency=LIMIT_CONCURRENCY,
        timeout_keep_alive=TIMEOUT_KEEP_ALIVE,
        backlog=2048 
    )