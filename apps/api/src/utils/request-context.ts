import { AsyncLocalStorage } from 'async_hooks';

/** Who is performing the current request (used to attribute time-entry changes without passing it everywhere). */
export interface Actor {
  userId: string;
  name: string | null;
}

export const actorStorage = new AsyncLocalStorage<Actor>();
