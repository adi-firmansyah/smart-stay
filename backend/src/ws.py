from typing import List
import asyncio
import json
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self.active: List[WebSocket] = []
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self.lock:
            self.active.append(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self.lock:
            if websocket in self.active:
                self.active.remove(websocket)

    async def broadcast_json(self, data: object) -> None:
        payload = json.dumps(data, default=str)
        async with self.lock:
            webs = list(self.active)
        for ws in webs:
            try:
                await ws.send_text(payload)
            except Exception:
                # ignore send errors; cleanup handled on disconnect
                pass


manager = WebSocketManager()


def access_log_event(access_log: dict) -> dict:
    return {"type": "access_log.created", "data": access_log}
