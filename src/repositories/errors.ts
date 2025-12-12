/**
 * Base error class for all repository errors.
 * Provides a consistent error structure with error codes and optional cause.
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * Error thrown when a requested entity is not found in the database.
 */
export class NotFoundError extends RepositoryError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Error thrown when attempting to create a duplicate entry.
 */
export class DuplicateError extends RepositoryError {
  constructor(entity: string, field: string) {
    super(`${entity} with this ${field} already exists`, 'DUPLICATE');
    this.name = 'DuplicateError';
  }
}

/**
 * Error thrown when database connection fails.
 */
export class ConnectionError extends RepositoryError {
  constructor(cause: unknown) {
    super('Database connection failed', 'CONNECTION_ERROR', cause);
    this.name = 'ConnectionError';
  }
}
