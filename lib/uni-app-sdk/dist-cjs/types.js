"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerHubError = void 0;
class WorkerHubError extends Error {
    constructor(code, message, details) {
        super(message);
        this.name = 'WorkerHubError';
        this.code = code;
        this.details = details;
    }
}
exports.WorkerHubError = WorkerHubError;
//# sourceMappingURL=types.js.map