import pino from 'pino';

// Log level configuration
const logLevel = process.env.LOG_LEVEL || 'info';

// Configuration for pino-pretty (development only)
const transport = process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
        },
    }
    : undefined;

/**
 * Structured Logger Instance
 * 
 * Usage:
 * import logger from '@/lib/logger';
 * 
 * logger.info('Message');
 * logger.info({ obj: data }, 'Message with data');
 * logger.error({ err: error }, 'Error occurred');
 */
const logger = pino({
    level: logLevel,
    transport,
    base: {
        env: process.env.NODE_ENV,
    },
    // Redact sensitive keys
    redact: {
        paths: [
            'password',
            'passwordHash',
            'token',
            'accessToken',
            'refreshToken',
            'Authorization',
            'cookie',
        ],
        remove: true,
    }
});

export default logger;
