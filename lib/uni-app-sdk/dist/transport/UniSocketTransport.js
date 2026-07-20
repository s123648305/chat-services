export class UniSocketTransport {
    constructor(input) {
        this.input = input;
    }
    connect() {
        if (typeof uni === 'undefined') {
            return Promise.reject(new Error('uni runtime is not available.'));
        }
        return new Promise((resolve, reject) => {
            console.log('connectSocket:', this.input);
            const task = uni.connectSocket({
                url: this.input.url,
                header: this.input.headers,
                fail: reject,
            });
            this.task = task;
            task.onOpen(() => {
                var _a;
                (_a = this.openHandler) === null || _a === void 0 ? void 0 : _a.call(this);
                resolve();
            });
            task.onMessage((event) => {
                var _a;
                (_a = this.messageHandler) === null || _a === void 0 ? void 0 : _a.call(this, normalizeSocketMessage(event.data));
            });
            task.onClose((event) => {
                var _a;
                (_a = this.closeHandler) === null || _a === void 0 ? void 0 : _a.call(this, event);
            });
            task.onError((error) => {
                var _a;
                (_a = this.errorHandler) === null || _a === void 0 ? void 0 : _a.call(this, error);
                reject(error);
            });
        });
    }
    send(message) {
        if (!this.task) {
            throw new Error('Socket is not connected.');
        }
        console.log('sendSocket:', message);
        this.task.send({ data: message });
    }
    close() {
        var _a;
        (_a = this.task) === null || _a === void 0 ? void 0 : _a.close({ code: 1000, reason: 'closed by app' });
    }
    onOpen(handler) {
        this.openHandler = handler;
    }
    onMessage(handler) {
        this.messageHandler = handler;
    }
    onClose(handler) {
        this.closeHandler = handler;
    }
    onError(handler) {
        this.errorHandler = handler;
    }
}
function normalizeSocketMessage(data) {
    if (typeof data === 'string') {
        return data;
    }
    return new TextDecoder().decode(data);
}
export function createUniSocketTransport(input) {
    return new UniSocketTransport(input);
}
//# sourceMappingURL=UniSocketTransport.js.map