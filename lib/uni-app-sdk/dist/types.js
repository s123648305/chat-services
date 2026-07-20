export class WorkerHubError extends Error {
    constructor(code, message, details) {
        super(message);
        this.name = 'WorkerHubError';
        this.code = code;
        this.details = details;
    }
}
//# sourceMappingURL=types.js.map