
from fastapi import Request, HTTPException
import signal

@app.post("/_internal/shutdown")
async def shutdown(request: Request):
    # Simple auth example: allow only localhost
    client = request.client.host if request.client else ""
    if client not in ("127.0.0.1", "::1"):
        raise HTTPException(status_code=403, detail="Forbidden")
    # Trigger shutdown
    import threading
    threading.Thread(target=lambda: signal.raise_signal(signal.SIGTERM)).start()
    return {"status": "shutting down"}

