import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const relayUrl = env.WORKER_HUB_WS_URL;
  const workerId = env.WORKER_HUB_WORKERID;
  const apiKey = env.WORKER_HUB_API_KEY;

  const missingVariables = [
    !relayUrl && 'WORKER_HUB_WS_URL',
    !workerId && 'WORKER_HUB_WORKERID',
    !apiKey && 'WORKER_HUB_API_KEY',
  ].filter(Boolean);

  if (missingVariables.length > 0) {
    throw new Error(`缺少 WorkerHub 环境变量：${missingVariables.join(', ')}`);
  }

  const relayTarget = new URL(relayUrl);
  if (relayTarget.pathname === '/wsep') {
    throw new Error(
      'WORKER_HUB_WS_URL 不能使用 Worker 注册端点 /wsep，请改用客户 Relay 端点 /v1/customer/relay。',
    );
  }
  const apiProtocol = relayTarget.protocol === 'wss:' ? 'https:' : 'http:';
  const authorization = `Bearer ${apiKey}`;
  const workerHubProxy: Record<string, string | ProxyOptions> = {
    '/workerhub-relay': {
      target: relayTarget.origin,
      ws: true,
      changeOrigin: true,
      headers: { Authorization: authorization },
      rewrite: () => `${relayTarget.pathname}${relayTarget.search}`,
    },
    '/workerhub-api': {
      target: `${apiProtocol}//${relayTarget.host}`,
      changeOrigin: true,
      headers: { Authorization: authorization },
      rewrite: (path) => path.replace(/^\/workerhub-api/, ''),
    },
  };

    return {
    plugins: [react()],
    define: {
      __WORKER_HUB_WORKER_ID__: JSON.stringify(workerId),
      __WORKER_HUB_API_KEY__: JSON.stringify(apiKey),
    },
    resolve: {
      alias: {
        '@workerHub': '/lib/uni-app-sdk/dist/index.js',
      },
    },
    server: {
      proxy: workerHubProxy,
    },
    preview: {
      proxy: workerHubProxy,
    },
  };
});
