function requireEnv(name: string, value: string | undefined) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    throw new Error(`缺少 Vite 环境变量：${name}`);
  }
  return normalizedValue;
}

export const workerHubConfig = {
  apiKey: requireEnv(
    'VITE_WORKER_HUB_API_KEY',
    import.meta.env.VITE_WORKER_HUB_API_KEY,
  ),
  workerId: requireEnv(
    'VITE_WORKER_HUB_WORKERID',
    import.meta.env.VITE_WORKER_HUB_WORKERID,
  ),
  wsUrl: requireEnv(
    'VITE_WORKER_HUB_HOST',
    import.meta.env.VITE_WORKER_HUB_HOST,
  ),
};

export function createWorkerHubApiUrl() {
  const url = new URL(workerHubConfig.wsUrl);
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.origin;
}
