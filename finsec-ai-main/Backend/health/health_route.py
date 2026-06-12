from fastapi import APIRouter, Request
from datetime import datetime

health_router = APIRouter(tags=["Health"])

@health_router.get("/health")
async def health_check(request: Request):
    # System health check with active session count
    settings = request.app.state.settings
    session_manager = request.app.state.session_manager
    return {
        "status": "healthy",
        "service": settings.API_TITLE,
        "version": settings.API_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "activeSessions": len(session_manager.sessions)
    }

# @health_router.get("/")
# async def root(request: Request):
#     # Root endpoint with API information
#     settings = request.app.state.settings
#     return {
#         "message": settings.API_TITLE,
#         "version": settings.API_VERSION,
#         "endpoints": {
#             "/docs": "Interactive API documentation",
#             "/auth/login": "POST - User login",
#             "/auth/logout": "POST - User logout",
#             "/auth/session": "GET - Check session status",
#             "/alerts/query": "POST - Query alerts (requires active session)",
#         },
#         "sessionTimeout": f"{settings.SESSION_TIMEOUT_MINUTES} minutes"
#     }
