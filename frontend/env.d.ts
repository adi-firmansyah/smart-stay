/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_ESP32_CAM_STREAM_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
