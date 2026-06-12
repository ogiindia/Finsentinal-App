import json
import logging
from fastapi import WebSocket, WebSocketDisconnect

from ..logging.manager import log_manager

logger = logging.getLogger('temporal_websocket')

async def websocket_workflow_logs(websocket: WebSocket, workflow_id: int):
    """
    WebSocket endpoint for real-time workflow logs
    
    Args:
        websocket: WebSocket connection
        workflow_id: The workflow ID to stream logs for
    """
    await websocket.accept()
    
    log_manager.add_websocket(workflow_id, websocket)
    
    try:
        # Send existing logs to the new client
        existing_logs = log_manager.get_logs(workflow_id)
        for log_entry in existing_logs:
            await websocket.send_text(json.dumps(log_entry))
        
        logger.info(f"WebSocket connected for workflow {workflow_id}, sent {len(existing_logs)} existing logs")
        
        # Keep connection alive and handle ping/pong
        while True:
            try:
                message = await websocket.receive_text()
                if message == "ping":
                    await websocket.send_text("pong")
                elif message == "get_logs":
                    # Send current logs on request
                    current_logs = log_manager.get_logs(workflow_id)
                    for log_entry in current_logs:
                        await websocket.send_text(json.dumps(log_entry))
                else:
                    logger.debug(f"Received unknown message from websocket: {message}")
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error for workflow {workflow_id}: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for workflow {workflow_id}")
    except Exception as e:
        logger.error(f"WebSocket error for workflow {workflow_id}: {e}")
    finally:
        # Clean up the connection
        log_manager.remove_websocket(workflow_id, websocket)
        logger.info(f"WebSocket cleaned up for workflow {workflow_id}")