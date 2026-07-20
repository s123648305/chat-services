# @worker-platform/uni-app-sdk

Lightweight uni-app SDK for the WorkerHub relay WebSocket API.

## Usage

Copy `src/` into a uni-app project, or import the package from this workspace.

```ts
import { WorkerHubClient } from '@worker-platform/uni-app-sdk';

const client = new WorkerHubClient({
  relayUrl: 'wss://workerhub.szdeepdata.cn/v1/customer/relay',
  apiBaseUrl: 'https://workerhub.szdeepdata.cn',
  apiKey: '<CUSTOMER_API_KEY>',
  workerId: '<WORKER_ID>',
});

await client.connect();

const session = await client.ensureSession({
  agentId: 'main',
  sessionKey: 'agent:main:owner-53970',
});

await client.sendMessage({
  sessionKey: session.key,
  message: '你好',
  onDelta: (text) => {
    console.log('delta', text);
  },
  onFinal: (message) => {
    console.log('final', message);
  },
});
```

## Workers

```ts
const workers = await client.listWorkers({ page: 1, pageSize: 20 });
const status = await client.getWorkerStatus();
```

`listWorkers()` uses the customer REST API and returns only workers that the
API key is allowed to access.

## Sessions And Agents

```ts
const agents = await client.listWorkerAgents();

const session = await client.ensureSession({
  agentId: agents.defaultAgentId,
  sessionKey: 'agent:main:owner-53970',
  label: 'Mini App Session',
  metadata: { source: 'uni-app', userId: '53970' },
});

await client.selectSession(session.key);

const sessions = await client.listSessions();
```

`listWorkerAgents()`, `createSession()`, and `ensureSession()` use the customer REST API. The
WebSocket relay is still used for session selection, chat commands, abort
commands, and streaming events.

Pass `sessionKey` when the frontend owns the business conversation id. The SDK
sends it as a top-level `POST /v1/sessions` field and rejects a response whose
`key/sessionKey` differs from the requested value.

## Streaming Events

```ts
const stopHealthEvents = client.on('health', (event) => {
  console.log(event.data);
});

client.on('chat', (event) => {
  console.log('chat event', event.data);
});

client.on('*', (event) => {
  console.log('any relay event', event.name);
});

stopHealthEvents();
```

`sendMessage()` still provides the common chat callbacks:

```ts
await client.sendMessage({
  sessionKey: session.key,
  message: '你好',
  onDelta: (text) => appendText(text),
  onFinal: (message) => replaceWithFinalMessage(message),
});
```

## Abort

```ts
await client.abortChat({ sessionKey: session.key });
await client.abortSession({ sessionKey: session.key });
```

## What It Wraps

- `uni.connectSocket`
- `uni.request`
- `Authorization: Bearer <apiKey>`
- `relay.open`
- `GET /v1/workers/:workerId/agents`
- `POST /v1/sessions`
- `sessions.select`
- `chat.send`
- `chat.abort`
- `sessions.abort`
- `idempotencyKey` generation
- `relay.event` streaming callbacks

## Retry Rule

If the same user message is retried after a timeout, pass the original
`idempotencyKey` again:

```ts
await client.sendMessage({
  sessionKey: session.key,
  idempotencyKey: savedMessageId,
  message: 'same message',
});
```

For new messages, omit `idempotencyKey`; the SDK generates one.
