export class UniRequestTransport {
    constructor(input) {
        this.input = input;
    }
    request(request) {
        if (typeof uni === 'undefined') {
            return Promise.reject(new Error('uni runtime is not available.'));
        }
        return new Promise((resolve, reject) => {
            uni.request({
                url: buildUrl(this.input.baseUrl, request.path, request.query),
                method: request.method,
                header: this.input.headers,
                data: request.body,
                ...(request.timeoutMs ? { timeout: request.timeoutMs } : {}),
                success: (event) => {
                    if (event.statusCode < 200 || event.statusCode >= 300) {
                        reject(event);
                        return;
                    }
                    resolve(event.data);
                },
                fail: reject,
            });
        });
    }
}
export function createUniRequestTransport(input) {
    return new UniRequestTransport(input);
}
function buildUrl(baseUrl, path, query) {
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${normalizedBase}${normalizedPath}`;
    const queryString = buildQueryString(query);
    return queryString ? `${url}?${queryString}` : url;
}
function buildQueryString(query) {
    return Object.entries(query !== null && query !== void 0 ? query : {})
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${encodeQueryComponent(key)}=${encodeQueryComponent(String(value))}`)
        .join('&');
}
function encodeQueryComponent(value) {
    return encodeURIComponent(value).replace(/%20|[!'()~]/g, (match) => {
        if (match === '%20')
            return '+';
        return `%${match.charCodeAt(0).toString(16).toUpperCase()}`;
    });
}
//# sourceMappingURL=UniRequestTransport.js.map