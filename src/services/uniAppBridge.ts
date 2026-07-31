export type UniAppEnvironment = {
  plus?: boolean;
  nvue?: boolean;
  miniprogram?: boolean;
  smartprogram?: boolean;
  harmony?: boolean;
  h5?: boolean;
  [key: string]: boolean | undefined;
};

export type UniAppMessageData = Record<string, unknown>;

export type UniAppEventMessage<T = unknown> = {
  type: string;
  payload?: T;
  source: 'chat-services';
  timestamp: number;
  requestId?: string;
};

type UniAppRouteOptions = {
  url: string;
};

type UniAppNavigateBackOptions = {
  delta?: number;
};

type UniAppWebViewApi = {
  getEnv: (callback: (environment: UniAppEnvironment) => void) => void;
  navigateBack: (options?: UniAppNavigateBackOptions) => void;
  navigateTo: (options: UniAppRouteOptions) => void;
  postMessage: (options: { data: UniAppMessageData }) => void;
  reLaunch: (options: UniAppRouteOptions) => void;
  redirectTo: (options: UniAppRouteOptions) => void;
  switchTab: (options: UniAppRouteOptions) => void;
};

type UniAppSdk = {
  webView?: Partial<UniAppWebViewApi>;
};

type UniAppMessageHandler = (data: unknown) => void;

declare global {
  interface Window {
    UniAppJSBridge?: boolean;
    uni?: UniAppSdk;
    __CHAT_SERVICES_UNIAPP_RECEIVE__?: (data: unknown) => void;
  }
}

const messageHandlers = new Set<UniAppMessageHandler>();
let bridgePromise: Promise<UniAppWebViewApi> | null = null;
let messageListenerRegistered = false;

function isUniAppWebViewApi(value: unknown): value is UniAppWebViewApi {
  if (!value || typeof value !== 'object') return false;

  const api = value as Partial<UniAppWebViewApi>;
  return typeof api.postMessage === 'function'
    && typeof api.getEnv === 'function'
    && typeof api.navigateTo === 'function'
    && typeof api.navigateBack === 'function';
}

function resolveSdkModule(module: unknown): UniAppSdk | undefined {
  if (!module || typeof module !== 'object') return undefined;

  const record = module as Record<string, unknown>;
  const candidate = record.default ?? module;
  return candidate && typeof candidate === 'object'
    ? candidate as UniAppSdk
    : undefined;
}

function dispatchIncomingMessage(data: unknown) {
  messageHandlers.forEach((handler) => handler(data));
}

function registerIncomingMessageBridge() {
  if (messageListenerRegistered) return;
  messageListenerRegistered = true;

  window.__CHAT_SERVICES_UNIAPP_RECEIVE__ = dispatchIncomingMessage;
  window.addEventListener('message', (event) => {
    if (event.source !== window && event.source !== window.parent) return;
    dispatchIncomingMessage(event.data);
  });
}

export function initializeUniAppBridge(): Promise<UniAppWebViewApi> {
  if (bridgePromise) return bridgePromise;

  bridgePromise = (async () => {
    if (typeof window === 'undefined') {
      throw new Error('UniApp bridge is only available in a browser environment.');
    }

    registerIncomingMessageBridge();

    const existingApi = window.uni?.webView;
    if (isUniAppWebViewApi(existingApi)) return existingApi;

    const sdkModule = await import('@dcloudio/uni-webview-js');
    const sdk = resolveSdkModule(sdkModule);
    if (sdk && !window.uni) window.uni = sdk;

    const api = window.uni?.webView ?? sdk?.webView;
    if (!isUniAppWebViewApi(api)) {
      bridgePromise = null;
      throw new Error('UniApp WebView JS SDK initialization failed.');
    }
    return api;
  })();

  return bridgePromise;
}

export async function getUniAppEnvironment() {
  const bridge = await initializeUniAppBridge();
  return new Promise<UniAppEnvironment>((resolve) => {
    bridge.getEnv(resolve);
  });
}

export async function postUniAppMessage(data: UniAppMessageData) {
  const bridge = await initializeUniAppBridge();
  bridge.postMessage({ data });
}

export async function sendUniAppEvent<T>(
  type: string,
  payload?: T,
  options: { requestId?: string } = {},
) {
  const normalizedType = type.trim();
  if (!normalizedType) throw new Error('UniApp message type is required.');

  const message: UniAppEventMessage<T> = {
    type: normalizedType,
    ...(payload === undefined ? {} : { payload }),
    source: 'chat-services',
    timestamp: Date.now(),
    ...(options.requestId ? { requestId: options.requestId } : {}),
  };

  await postUniAppMessage(message as UniAppMessageData);
}

export async function navigateUniAppTo(url: string) {
  const bridge = await initializeUniAppBridge();
  bridge.navigateTo({ url });
}

export async function redirectUniAppTo(url: string) {
  const bridge = await initializeUniAppBridge();
  bridge.redirectTo({ url });
}

export async function switchUniAppTab(url: string) {
  const bridge = await initializeUniAppBridge();
  bridge.switchTab({ url });
}

export async function relaunchUniApp(url: string) {
  const bridge = await initializeUniAppBridge();
  bridge.reLaunch({ url });
}

export async function navigateUniAppBack(delta = 1) {
  const bridge = await initializeUniAppBridge();
  bridge.navigateBack({ delta });
}

export function subscribeUniAppMessage(handler: UniAppMessageHandler) {
  registerIncomingMessageBridge();
  messageHandlers.add(handler);
  return () => {
    messageHandlers.delete(handler);
  };
}

export const uniAppBridge = {
  getEnvironment: getUniAppEnvironment,
  initialize: initializeUniAppBridge,
  navigateBack: navigateUniAppBack,
  navigateTo: navigateUniAppTo,
  postMessage: postUniAppMessage,
  reLaunch: relaunchUniApp,
  redirectTo: redirectUniAppTo,
  sendEvent: sendUniAppEvent,
  subscribe: subscribeUniAppMessage,
  switchTab: switchUniAppTab,
};
