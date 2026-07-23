export class ServiceError extends Error {
    constructor(message, status = 500, options = {}) {
        super(message);
        this.name = 'ServiceError';
        this.status = status;
        if (options.retryAfter != null) {
            this.retryAfter = Number(options.retryAfter) || 0;
        }
        if (options.headers && typeof options.headers === 'object') {
            this.headers = options.headers;
        }
    }
}

export class MissingDependencyError extends ServiceError {
    constructor(message = 'Required dependency is not available') {
        super(message, 501);
        this.name = 'MissingDependencyError';
    }
}

export class InvalidPayloadError extends ServiceError {
    constructor(message = 'Invalid payload') {
        super(message, 400);
        this.name = 'InvalidPayloadError';
    }
}

export class InvalidConfigError extends ServiceError {
    constructor(message = 'Invalid config') {
        super(message, 400);
        this.name = 'InvalidConfigError';
    }
}

export class UnauthorizedError extends ServiceError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
        this.name = 'UnauthorizedError';
    }
}

export class RateLimitError extends ServiceError {
    constructor(message = 'Too many requests', retryAfterSeconds = 60) {
        super(message, 429, { retryAfter: retryAfterSeconds });
        this.name = 'RateLimitError';
    }
}
