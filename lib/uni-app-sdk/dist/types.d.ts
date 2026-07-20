export interface WorkerHubClientOptions {
    relayUrl: string;
    apiBaseUrl?: string;
    apiKey: string;
    workerId: string;
    defaultTimeoutMs?: number;
    transportFactory?: SocketTransportFactory;
    requestFactory?: HttpRequestTransportFactory;
    requestIdFactory?: () => string;
    idempotencyKeyFactory?: () => string;
}
export interface SocketTransportFactoryInput {
    url: string;
    headers: Record<string, string>;
}
export type SocketTransportFactory = (input: SocketTransportFactoryInput) => SocketTransport;
export interface SocketTransport {
    connect(): Promise<void>;
    send(message: string): void;
    close(): void;
    onOpen(handler: () => void): void;
    onMessage(handler: (message: string) => void): void;
    onClose(handler: (event: SocketCloseEvent) => void): void;
    onError(handler: (error: unknown) => void): void;
}
export interface SocketCloseEvent {
    code?: number;
    reason?: string;
}
export interface HttpRequestTransportFactoryInput {
    baseUrl: string;
    headers: Record<string, string>;
}
export type HttpRequestTransportFactory = (input: HttpRequestTransportFactoryInput) => HttpRequestTransport;
export interface HttpRequestTransport {
    request<T>(input: HttpRequestInput): Promise<T>;
}
export interface HttpRequestInput {
    method: "GET" | "POST";
    path: string;
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    timeoutMs?: number;
}
export interface RelaySession {
    relaySessionId: string;
    workerId: string;
    status: string;
}
export interface WorkerChatSession {
    key: string;
    sessionId?: string;
    sessionKey?: string;
    workerId?: string;
    agentId?: string;
    label?: string;
    status?: string;
}
export interface CreateSessionInput {
    sessionKey?: string;
    agentId?: string;
    label?: string;
    metadata?: Record<string, unknown>;
}
export interface WorkerAgent {
    agentId: string;
    name?: string;
    isDefault?: boolean;
}
export interface WorkerAgentsResponse {
    workerId: string;
    agents: WorkerAgent[];
    defaultAgentId?: string;
    source: 'worker' | 'unsupported';
}
export interface ListWorkersQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    };
}
export interface CustomerWorker {
    workerId: string;
    status: string;
    displayName: string;
    appVersion?: string | null;
    platform?: string | null;
    lastSeenAt?: string | null;
    lastHeartbeatAt?: string | null;
    gatewayStatus?: unknown;
    capabilities?: string[];
    [key: string]: unknown;
}
export interface SendMessageInput {
    sessionKey: string;
    message: string;
    attachments?: Array<Record<string, unknown>>;
    idempotencyKey?: string;
    timeoutMs?: number;
    onDelta?: (text: string, event: ChatStreamEvent) => void;
    onFinal?: (message: ChatMessage, event: ChatStreamEvent) => void;
    onEvent?: (event: ChatStreamEvent) => void;
    onError?: (error: WorkerHubError) => void;
}
export interface SendMessageResult {
    runId: string;
    status: string;
}
export interface ChatMessage {
    role: string;
    content: Array<{
        type: string;
        text?: string;
        [key: string]: unknown;
    }>;
    timestamp?: number;
    [key: string]: unknown;
}
export interface ChatStreamEvent {
    runId?: string;
    sessionKey?: string;
    seq?: number;
    state?: 'delta' | 'final' | string;
    deltaText?: string;
    message?: ChatMessage;
    [key: string]: unknown;
}
export interface RelayEventFrame {
    type: 'relay.event';
    eventId: string;
    name: string;
    workerId: string;
    relaySessionId: string;
    data: unknown;
}
export type RelayEventHandler = (event: RelayEventFrame) => void;
export interface RelayErrorPayload {
    code: string;
    message: string;
}
export declare class WorkerHubError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(code: string, message: string, details?: unknown);
}
//# sourceMappingURL=types.d.ts.map