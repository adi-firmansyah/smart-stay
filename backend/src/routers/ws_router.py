from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ws import manager

router = APIRouter(prefix="/ws", tags=["WebSocket"])


@router.websocket("/events")
async def websocket_events(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            # keep connection open; react to incoming pings if any
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket)
