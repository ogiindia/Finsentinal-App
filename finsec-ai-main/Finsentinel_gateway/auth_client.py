# gateway/auth_client.py
from fastapi import HTTPException, Request, status, Depends
import httpx
from pydantic import BaseModel
from config import settings


class SessionInfo(BaseModel):
    valid: bool
    username: str | None = None
    user_type: str | None = None
    remainingTime: int | None = None


async def _call_auth_session(cookies: dict) -> SessionInfo:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{settings.CORE_SERVICE_URL}/auth/session",
                cookies=cookies,
                timeout=5.0,
            )
        except httpx.RequestError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Auth service unavailable",
            )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Auth service error",
        )

    data = SessionInfo(**resp.json())
    return data


async def get_current_session(request: Request) -> SessionInfo:
    """
    Dependency for protected routes.
    Validates the session using your microservice's /auth/session endpoint.
    """
    cookies = request.cookies
    session = await _call_auth_session(cookies)

    if not session.valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    return session
