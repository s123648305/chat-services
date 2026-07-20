import type { HttpRequestInput, HttpRequestTransport, HttpRequestTransportFactoryInput } from '../types.js';
export declare class UniRequestTransport implements HttpRequestTransport {
    private readonly input;
    constructor(input: HttpRequestTransportFactoryInput);
    request<T>(request: HttpRequestInput): Promise<T>;
}
export declare function createUniRequestTransport(input: HttpRequestTransportFactoryInput): HttpRequestTransport;
//# sourceMappingURL=UniRequestTransport.d.ts.map