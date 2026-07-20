import { type CreateSessionInput, type CustomerWorker, type ListWorkersQuery, type PaginatedResponse, type RelayEventHandler, type RelaySession, type SendMessageInput, type SendMessageResult, type WorkerAgentsResponse, type WorkerChatSession, type WorkerHubClientOptions } from './types.js';
export declare class WorkerHubClient {
    private readonly options;
    private readonly transport;
    private readonly requestTransport;
    private readonly defaultTimeoutMs;
    private readonly requestIdFactory;
    private readonly idempotencyKeyFactory;
    private readonly pending;
    private readonly streams;
    private readonly eventHandlers;
    private relaySession;
    private connected;
    constructor(options: WorkerHubClientOptions);
    connect(): Promise<void>;
    close(): void;
    on(eventName: string, handler: RelayEventHandler): () => void;
    off(eventName: string, handler: RelayEventHandler): void;
    listWorkers(query?: ListWorkersQuery): Promise<PaginatedResponse<CustomerWorker>>;
    openRelay(): Promise<RelaySession>;
    listWorkerAgents(workerId?: string): Promise<WorkerAgentsResponse>;
    createSession(input?: CreateSessionInput): Promise<WorkerChatSession>;
    ensureSession(input: CreateSessionInput & {
        sessionKey: string;
    }): Promise<WorkerChatSession>;
    listSessions(payload?: Record<string, unknown>): Promise<unknown>;
    selectSession(sessionKey: string): Promise<unknown>;
    getWorkerStatus(): Promise<unknown>;
    abortChat(input?: {
        sessionKey?: string;
        runId?: string;
    }): Promise<unknown>;
    abortSession(input?: {
        sessionKey?: string;
    }): Promise<unknown>;
    requestCommand<T = unknown>(command: string, payload?: Record<string, unknown>, timeoutMs?: number): Promise<T>;
    sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
    private sendRelayRequest;
    private sendFrame;
    private handleMessage;
    private handleRelayResponse;
    private handleRelayError;
    private handleRelayEvent;
    private emitEvent;
    private resolvePending;
    private rejectPending;
    private rejectAll;
}
//# sourceMappingURL=WorkerHubClient.d.ts.map