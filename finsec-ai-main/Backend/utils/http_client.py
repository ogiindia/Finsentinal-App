import httpx
import ssl
from typing import Union

def get_http_client(settings) -> httpx.AsyncClient:
    # Create httpx client with proper SSL and timeout configuration
    verify_ssl = settings.VERIFY_SSL
    
    # Convert VERIFY_SSL to boolean if it's a string
    if isinstance(verify_ssl, str):
        verify_ssl = verify_ssl.lower() in ('true', '1', 'yes')
    
    # Handle timeout conversion
    timeout = settings.REQUEST_TIMEOUT
    if isinstance(timeout, str):
        try:
            timeout = float(timeout)
        except (ValueError, TypeError):
            timeout = 30.0
    elif not isinstance(timeout, (int, float)):
        timeout = 30.0
    
    # Return client with proper SSL verification setting
    return httpx.AsyncClient(
        verify=verify_ssl,
        timeout=timeout,
        headers={"User-Agent": f"{settings.API_TITLE}/{settings.API_VERSION}"}
    )

def get_base_url(settings) -> str:
    # Build base URL for external API
    return f"https://{settings.EXTERNAL_API_IP}:{settings.EXTERNAL_API_PORT}/cm-new-gen"
