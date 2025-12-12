import { db, Database } from '@/db';

// Type for transaction context - allows both db and transaction instances
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DatabaseContext = Database | any;

/**
 * Base repository class that provides the Drizzle database instance.
 * All concrete repositories should extend this class.
 */
export abstract class BaseRepository {
  protected db: DatabaseContext;

  constructor(database?: DatabaseContext) {
    this.db = database ?? db;
  }
}
