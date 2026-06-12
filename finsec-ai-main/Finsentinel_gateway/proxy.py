# Finsentinel_gateway/proxy.py
import httpx
from fastapi import Request
from fastapi.responses import Response
import logging

logger = logging.getLogger(__name__)

async def proxy_request(
    request: Request,
    base_url: str,
    upstream_path: str,
    extra_headers: dict | None = None,
    timeout: float = 60.0,
) -> Response:
    url = f"{base_url.rstrip('/')}/{upstream_path.lstrip('/')}"

    # Read body once
    body = await request.body()

    # Copy headers, drop hop-by-hop ones
    headers = {
        k: v
        for k, v in request.headers.items()
        if k.lower() not in {"host", "content-length", "connection"}
    }
    if extra_headers:
        headers.update(extra_headers)

    # TEMP: debug for dashboard calls
    if "dashboard/dash_data_by_model" in url:
        logger.info("GATEWAY → CORE %s %s", request.method, url)
        logger.info("GATEWAY body bytes: %r", body)
        logger.info("GATEWAY headers: %r", headers)

    async with httpx.AsyncClient(timeout=httpx.Timeout(timeout)) as client:
        resp = await client.request(
            method=request.method,
            url=url,
            params=request.query_params,
            content=body,
            headers=headers,
            cookies=request.cookies,
        )

    # If upstream errors, log its response body too
    if resp.status_code >= 400:
        logger.error(
            "Upstream error %s %s -> %s, body=%r",
            request.method,
            url,
            resp.status_code,
            resp.text,
        )

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers={
            k: v
            for k, v in resp.headers.items()
            if k.lower() not in {"content-length", "connection", "content-encoding"}
        },
        media_type=resp.headers.get("content-type"),
    )
