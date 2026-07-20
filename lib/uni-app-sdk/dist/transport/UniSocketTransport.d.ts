import type { SocketCloseEvent, SocketTransport, SocketTransportFactoryInput } from '../types.js';
export declare class UniSocketTransport implements SocketTransport {
    private readonly input;
    private task;
    private openHandler;
    private messageHandler;
    private closeHandler;
    private errorHandler;
    constructor(input: SocketTransportFactoryInput);
    connect(): Promise<void>;
    send(message: string): void;
    close(): void;
    onOpen(handler: () => void): void;
    onMessage(handler: (message: string) => void): void;
    onClose(handler: (event: SocketCloseEvent) => void): void;
    onError(handler: (error: unknown) => void): void;
}
export declare function createUniSocketTransport(input: SocketTransportFactoryInput): SocketTransport;
//# sourceMappingURL=UniSocketTransport.d.ts.map