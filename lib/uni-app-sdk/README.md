# UniApp WebView 通信封装

项目通过 DCloud 官方 `@dcloudio/uni-webview-js` 加载 WebView JS SDK，并在
`src/services/uniAppBridge.ts` 中统一封装。业务组件不要直接访问 `window.uni`。

## 向 UniApp 发送消息

```ts
import { sendUniAppEvent } from '../../src/services/uniAppBridge';

await sendUniAppEvent('chat.ready', {
  sessionId: 'session-id',
});
```

UniApp 页面通过 `<web-view @message="handleMessage">` 接收时，从
`event.detail.data` 读取消息数组。

也可以发送不带公共信封的原始对象：

```ts
import { postUniAppMessage } from '../../src/services/uniAppBridge';

await postUniAppMessage({
  action: 'closeChat',
});
```

## 页面导航

```ts
import {
  navigateUniAppBack,
  navigateUniAppTo,
  relaunchUniApp,
  redirectUniAppTo,
  switchUniAppTab,
} from '../../src/services/uniAppBridge';

await navigateUniAppTo('/pages/order/detail?id=1');
await redirectUniAppTo('/pages/login/index');
await switchUniAppTab('/pages/home/index');
await relaunchUniApp('/pages/home/index');
await navigateUniAppBack();
```

## 接收 UniApp 主动传入的数据

UniApp 宿主可通过 WebView `evalJS` 调用：

```js
window.__CHAT_SERVICES_UNIAPP_RECEIVE__?.({ type: 'user.updated', payload: {} });
```

H5 页面订阅：

```ts
import { subscribeUniAppMessage } from '../../src/services/uniAppBridge';

const unsubscribe = subscribeUniAppMessage((message) => {
  console.log('收到 UniApp 消息', message);
});

unsubscribe();
```

也支持宿主使用 `window.postMessage` 发送数据。

## 获取运行环境

```ts
import { getUniAppEnvironment } from '../../src/services/uniAppBridge';

const environment = await getUniAppEnvironment();
```
