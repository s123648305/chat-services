import { createUniSocketTransport } from './transport/UniSocketTransport.js';
import { createUniRequestTransport } from './transport/UniRequestTransport.js';
import { WorkerHubError, } from './types.js';
const DEFAULT_TIMEOUT_MS = 30000;
export class WorkerHubClient {
    constructor(options) {
        var _a, _b, _c, _d, _e, _f;
        this.options = options;
        this.pending = new Map();
        this.streams = new Map();
        this.eventHandlers = new Map();
        this.connected = false;
        this.defaultTimeoutMs = (_a = options.defaultTimeoutMs) !== null && _a !== void 0 ? _a : DEFAULT_TIMEOUT_MS;
        this.requestIdFactory = (_b = options.requestIdFactory) !== null && _b !== void 0 ? _b : createRequestId;
        this.idempotencyKeyFactory = (_c = options.idempotencyKeyFactory) !== null && _c !== void 0 ? _c : createIdempotencyKey;
        const authHeaders = {
            Authorization: `Bearer ${options.apiKey}`,
        };
        this.transport = ((_d = options.transportFactory) !== null && _d !== void 0 ? _d : createUniSocketTransport)({
            url: options.relayUrl,
            headers: authHeaders,
        });
        this.requestTransport = ((_e = options.requestFactory) !== null && _e !== void 0 ? _e : createUniRequestTransport)({
            baseUrl: (_f = options.apiBaseUrl) !== null && _f !== void 0 ? _f : deriveApiBaseUrl(options.relayUrl),
            headers: authHeaders,
        });
        this.transport.onMessage((message) => this.handleMessage(message));
        this.transport.onClose((event) => {
            var _a;
            this.connected = false;
            this.relaySession = undefined;
            this.rejectAll('SOCKET_CLOSED', (_a = event.reason) !== null && _a !== void 0 ? _a : 'Socket closed.');
        });
        this.transport.onError((error) => {
            this.connected = false;
            this.relaySession = undefined;
            this.rejectAll('SOCKET_ERROR', error instanceof Error ? error.message : String(error));
        });
    }
    async connect() {
        if (this.connected) {
            return;
        }
        await this.transport.connect();
        this.connected = true;
    }
    close() {
        this.transport.close();
        this.connected = false;
        this.relaySession = undefined;
        this.pending.clear();
        this.streams.clear();
    }
    on(eventName, handler) {
        var _a;
        const handlers = (_a = this.eventHandlers.get(eventName)) !== null && _a !== void 0 ? _a : new Set();
        handlers.add(handler);
        this.eventHandlers.set(eventName, handlers);
        return () => this.off(eventName, handler);
    }
    off(eventName, handler) {
        const handlers = this.eventHandlers.get(eventName);
        if (!handlers) {
            return;
        }
        handlers.delete(handler);
        if (handlers.size === 0) {
            this.eventHandlers.delete(eventName);
        }
    }
    listWorkers(query = {}) {
        return this.requestTransport.request({
            method: 'GET',
            path: '/v1/workers',
            query: stripQueryUndefined({
                page: query.page,
                pageSize: query.pageSize,
                search: query.search,
                status: query.status,
            }),
        });
    }
    async openRelay() {
        if (!this.connected) {
            await this.connect();
        }
        if (this.relaySession) {
            return this.relaySession;
        }
        const requestId = this.requestIdFactory();
        const session = await this.sendFrame(requestId, {
            type: 'relay.open',
            requestId,
            workerId: this.options.workerId,
        }, this.defaultTimeoutMs);
        this.relaySession = session;
        return session;
    }
    async listWorkerAgents(workerId = this.options.workerId) {
        try {
            return await this.requestTransport.request({
                method: 'GET',
                path: `/v1/workers/${encodeURIComponent(workerId)}/agents`,
            });
        }
        catch (error) {
            if (isUnsupportedAgentsListError(error)) {
                return {
                    workerId,
                    agents: [],
                    source: 'unsupported',
                };
            }
            throw error;
        }
    }
    async createSession(input = {}) {
        const response = await this.requestTransport.request({
            method: 'POST',
            path: '/v1/sessions',
            body: stripUndefined({
                workerId: this.options.workerId,
                agentId: input.agentId,
                sessionKey: input.sessionKey,
                label: input.label,
                metadata: input.metadata,
            }),
        });
        const session = readWorkerChatSession(response);
        if (input.sessionKey && session.sessionKey !== input.sessionKey && session.key !== input.sessionKey) {
            throw new WorkerHubError('SESSION_KEY_MISMATCH', 'sessions.create returned a different sessionKey.');
        }
        return session;
    }
    async ensureSession(input) {
        return this.createSession(input);
    }
    async listSessions(payload = {}) {
        return this.requestCommand('sessions.list', payload);
    }
    async selectSession(sessionKey) {
        return this.requestCommand('sessions.select', { sessionKey });
    }
    async getWorkerStatus() {
        return this.requestCommand('worker.status', {});
    }
    async abortChat(input = {}) {
        return this.requestCommand('chat.abort', stripUndefined(input));
    }
    async abortSession(input = {}) {
        return this.requestCommand('sessions.abort', stripUndefined(input));
    }
    async requestCommand(command, payload = {}, timeoutMs = this.defaultTimeoutMs) {
        var _a;
        const relay = (_a = this.relaySession) !== null && _a !== void 0 ? _a : (await this.openRelay());
        return this.sendRelayRequest({
            relaySessionId: relay.relaySessionId,
            command,
            payload,
            timeoutMs,
        });
    }
    async sendMessage(input) {
        var _a, _b, _c;
        const relay = (_a = this.relaySession) !== null && _a !== void 0 ? _a : (await this.openRelay());
        const idempotencyKey = (_b = input.idempotencyKey) !== null && _b !== void 0 ? _b : this.idempotencyKeyFactory();
        const response = await this.sendRelayRequest({
            relaySessionId: relay.relaySessionId,
            command: 'chat.send',
            payload: stripUndefined({
                sessionKey: input.sessionKey,
                idempotencyKey,
                message: input.message,
                attachments: input.attachments && input.attachments.length > 0 ? input.attachments : undefined,
            }),
            timeoutMs: (_c = input.timeoutMs) !== null && _c !== void 0 ? _c : 60000,
        });
        const result = readSendMessageResult(response);
        this.streams.set(result.runId, {
            onDelta: input.onDelta,
            onFinal: input.onFinal,
            onEvent: input.onEvent,
            onError: input.onError,
        });
        return result;
    }
    sendRelayRequest(input) {
        const requestId = this.requestIdFactory();
        return this.sendFrame(requestId, {
            type: 'relay.request',
            requestId,
            relaySessionId: input.relaySessionId,
            command: input.command,
            payload: input.payload,
            timeoutMs: input.timeoutMs,
        }, input.timeoutMs);
    }
    sendFrame(requestId, frame, timeoutMs) {
        const promise = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(requestId);
                reject(new WorkerHubError('REQUEST_TIMEOUT', `Request ${requestId} timed out.`));
            }, timeoutMs);
            this.pending.set(requestId, {
                resolve: resolve,
                reject,
                timer,
            });
        });
        this.transport.send(JSON.stringify(frame));
        return promise;
    }
    handleMessage(message) {
        var _a, _b, _c;
        let frame;
        try {
            frame = JSON.parse(message);
        }
        catch {
            return;
        }
        if (!isRecord(frame)) {
            return;
        }
        if (frame.type === 'relay.ready') {
            return;
        }
        if (frame.type === 'relay.open.ack') {
            const requestId = stringValue(frame.requestId);
            const pending = requestId ? this.pending.get(requestId) : undefined;
            if (!requestId || !pending) {
                return;
            }
            this.resolvePending(requestId, {
                relaySessionId: (_a = stringValue(frame.relaySessionId)) !== null && _a !== void 0 ? _a : '',
                workerId: (_b = stringValue(frame.workerId)) !== null && _b !== void 0 ? _b : this.options.workerId,
                status: (_c = stringValue(frame.status)) !== null && _c !== void 0 ? _c : 'connected',
            });
            return;
        }
        if (frame.type === 'relay.response') {
            this.handleRelayResponse(frame);
            return;
        }
        if (frame.type === 'relay.error') {
            this.handleRelayError(frame);
            return;
        }
        if (frame.type === 'relay.event') {
            this.handleRelayEvent(frame);
        }
    }
    handleRelayResponse(frame) {
        var _a, _b;
        const requestId = stringValue(frame.requestId);
        if (!requestId) {
            return;
        }
        const pending = this.pending.get(requestId);
        if (!pending) {
            return;
        }
        if (frame.ok === true) {
            this.resolvePending(requestId, frame.data);
            return;
        }
        const error = isRecord(frame.error)
            ? new WorkerHubError((_a = stringValue(frame.error.code)) !== null && _a !== void 0 ? _a : 'RELAY_ERROR', (_b = stringValue(frame.error.message)) !== null && _b !== void 0 ? _b : 'Relay request failed.', frame.error)
            : new WorkerHubError('RELAY_ERROR', 'Relay request failed.');
        this.rejectPending(requestId, error);
    }
    handleRelayError(frame) {
        var _a, _b;
        const error = isRecord(frame.error)
            ? new WorkerHubError((_a = stringValue(frame.error.code)) !== null && _a !== void 0 ? _a : 'RELAY_ERROR', (_b = stringValue(frame.error.message)) !== null && _b !== void 0 ? _b : 'Relay error.', frame.error)
            : new WorkerHubError('RELAY_ERROR', 'Relay error.');
        const requestId = stringValue(frame.requestId);
        if (requestId && this.pending.has(requestId)) {
            this.rejectPending(requestId, error);
        }
    }
    handleRelayEvent(frame) {
        var _a, _b, _c;
        const event = readRelayEventFrame(frame);
        if (!event) {
            return;
        }
        this.emitEvent(event);
        if (event.name !== 'chat' || !isRecord(event.data)) {
            return;
        }
        const streamEvent = event.data;
        const runId = stringValue(streamEvent.runId);
        if (!runId) {
            return;
        }
        const stream = this.streams.get(runId);
        if (!stream) {
            return;
        }
        (_a = stream.onEvent) === null || _a === void 0 ? void 0 : _a.call(stream, streamEvent);
        if (streamEvent.state === 'delta' && typeof streamEvent.deltaText === 'string') {
            (_b = stream.onDelta) === null || _b === void 0 ? void 0 : _b.call(stream, streamEvent.deltaText, streamEvent);
        }
        if (streamEvent.state === 'final' && isChatMessage(streamEvent.message)) {
            (_c = stream.onFinal) === null || _c === void 0 ? void 0 : _c.call(stream, streamEvent.message, streamEvent);
            this.streams.delete(runId);
        }
    }
    emitEvent(event) {
        var _a, _b;
        for (const handler of (_a = this.eventHandlers.get(event.name)) !== null && _a !== void 0 ? _a : []) {
            handler(event);
        }
        for (const handler of (_b = this.eventHandlers.get('*')) !== null && _b !== void 0 ? _b : []) {
            handler(event);
        }
    }
    resolvePending(requestId, value) {
        const pending = this.pending.get(requestId);
        if (!pending) {
            return;
        }
        clearTimeout(pending.timer);
        this.pending.delete(requestId);
        pending.resolve(value);
    }
    rejectPending(requestId, error) {
        const pending = this.pending.get(requestId);
        if (!pending) {
            return;
        }
        clearTimeout(pending.timer);
        this.pending.delete(requestId);
        pending.reject(error);
    }
    rejectAll(code, message) {
        for (const [requestId, pending] of this.pending) {
            clearTimeout(pending.timer);
            pending.reject(new WorkerHubError(code, message));
            this.pending.delete(requestId);
        }
    }
}
function readRelayEventFrame(frame) {
    const eventId = stringValue(frame.eventId);
    const name = stringValue(frame.name);
    const workerId = stringValue(frame.workerId);
    const relaySessionId = stringValue(frame.relaySessionId);
    if (frame.type !== 'relay.event' || !eventId || !name || !workerId || !relaySessionId) {
        return undefined;
    }
    return {
        type: 'relay.event',
        eventId,
        name,
        workerId,
        relaySessionId,
        data: frame.data,
    };
}
function readWorkerChatSession(value) {
    var _a;
    if (!isRecord(value)) {
        throw new WorkerHubError('INVALID_SESSION_RESPONSE', 'sessions.create returned invalid data.');
    }
    const sessionKey = (_a = stringValue(value.sessionKey)) !== null && _a !== void 0 ? _a : stringValue(value.key);
    const key = sessionKey;
    if (!key) {
        throw new WorkerHubError('INVALID_SESSION_RESPONSE', 'sessions.create response is missing sessionKey.');
    }
    const sessionId = stringValue(value.sessionId);
    const workerId = stringValue(value.workerId);
    const agentId = stringValue(value.agentId);
    const label = stringValue(value.label);
    const status = stringValue(value.status);
    return {
        key,
        sessionKey,
        ...(sessionId ? { sessionId } : {}),
        ...(workerId ? { workerId } : {}),
        ...(agentId ? { agentId } : {}),
        ...(label ? { label } : {}),
        ...(status ? { status } : {}),
    };
}
function readSendMessageResult(value) {
    if (!isRecord(value)) {
        throw new WorkerHubError('INVALID_CHAT_RESPONSE', 'chat.send returned invalid data.');
    }
    const runId = stringValue(value.runId);
    const status = stringValue(value.status);
    if (!runId || !status) {
        throw new WorkerHubError('INVALID_CHAT_RESPONSE', 'chat.send response is missing runId or status.');
    }
    return { runId, status };
}
function isChatMessage(value) {
    return isRecord(value) && typeof value.role === 'string' && Array.isArray(value.content);
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function stringValue(value) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}
function isUnsupportedAgentsListError(error) {
    const code = readNestedErrorCode(error);
    return code === 'METHOD_NOT_ALLOWED' || code === 'COMMAND_NOT_SUPPORTED';
}
function readNestedErrorCode(value) {
    if (!isRecord(value)) {
        return undefined;
    }
    const directCode = stringValue(value.code);
    if (directCode) {
        return directCode;
    }
    if (isRecord(value.error)) {
        const nestedCode = stringValue(value.error.code);
        if (nestedCode) {
            return nestedCode;
        }
    }
    if (isRecord(value.response) && isRecord(value.response.data)) {
        return readNestedErrorCode(value.response.data);
    }
    if (isRecord(value.data)) {
        return readNestedErrorCode(value.data);
    }
    return undefined;
}
function stripUndefined(input) {
    return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
function stripQueryUndefined(input) {
    return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
function deriveApiBaseUrl(relayUrl) {
    const url = new URL(relayUrl);
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
}
function createRequestId() {
    return `req-${createUniqueId()}`;
}
function createIdempotencyKey() {
    return `mobile-msg-${createUniqueId()}`;
}
function createUniqueId() {
    const cryptoLike = globalThis.crypto;
    if (cryptoLike && 'randomUUID' in cryptoLike && typeof cryptoLike.randomUUID === 'function') {
        return cryptoLike.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
//# sourceMappingURL=WorkerHubClient.js.map