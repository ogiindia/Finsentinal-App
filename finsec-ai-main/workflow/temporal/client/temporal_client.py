import logging
from typing import Optional

from ..config import TEMPORAL_HOST, TEMPORAL_NAMESPACE, TEMPORAL_AVAILABLE

if TEMPORAL_AVAILABLE:
    from temporalio.client import Client

logger = logging.getLogger('temporal_client_manager')

class TemporalClientManager:
    """Manages Temporal client connections with singleton pattern"""
    
    def __init__(self):
        self._client: Optional['Client'] = None
        self._connected = False
    
    async def get_client(self) -> Optional['Client']:
        """
        Get or create Temporal client
        
        Returns:
            Optional[Client]: Temporal client instance or None if not available
        """
        if not TEMPORAL_AVAILABLE:
            logger.warning("Temporal SDK not available")
            return None
        
        if not self._client or not self._connected:
            try:
                logger.info(f"Initializing Temporal client to {TEMPORAL_HOST}")
                self._client = await Client.connect(TEMPORAL_HOST, namespace=TEMPORAL_NAMESPACE)
                self._connected = True
                logger.info("Successfully connected to Temporal")
            except Exception as e:
                logger.error(f"Failed to connect to Temporal: {e}")
                self._client = None
                self._connected = False
                raise e
        
        return self._client
    
    async def check_connection(self) -> bool:
        """
        Check if connection to Temporal is healthy
        
        Returns:
            bool: True if connection is healthy
        """
        try:
            client = await self.get_client()
            if client:
                # Try to list workflows to verify connection
                await client.list_workflows()
                return True
        except Exception as e:
            logger.error(f"Temporal connection check failed: {e}")
            self._connected = False
        
        return False
    
    async def disconnect(self):
        """Disconnect from Temporal"""
        if self._client:
            try:
                # Note: temporalio.Client doesn't have an explicit close method
                # The connection will be closed when the client is garbage collected
                self._client = None
                self._connected = False
                logger.info("Disconnected from Temporal")
            except Exception as e:
                logger.error(f"Error disconnecting from Temporal: {e}")
    
    def reset_connection(self):
        """Reset connection state (forces reconnection on next get_client call)"""
        self._client = None
        self._connected = False
        logger.info("Temporal connection reset")
    
    @property
    def is_connected(self) -> bool:
        """Check if currently connected"""
        return self._connected and self._client is not None
    
    @property
    def connection_info(self) -> dict:
        """Get connection information"""
        return {
            "host": TEMPORAL_HOST,
            "namespace": TEMPORAL_NAMESPACE,
            "connected": self._connected,
            "available": TEMPORAL_AVAILABLE
        }

# Global instance
temporal_client_manager = TemporalClientManager()