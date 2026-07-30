/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORKER_HUB_API_KEY: string;
  readonly VITE_WORKER_HUB_WORKERID: string;
  readonly VITE_WORKER_HUB_WS_URL: string;
  readonly VITE_WORKER_SESSION_ID?: string;
  readonly VITE_WORKER_CHAT_VISIBILITY?: 'public' | 'debug';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
