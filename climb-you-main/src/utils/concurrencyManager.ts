/**
 * Concurrency Management Utilities
 * Prevents race conditions and manages shared state safely
 */

export class ConcurrencyManager {
  private static locks: Map<string, Promise<void>> = new Map();
  private static mutexes: Map<string, { locked: boolean; queue: Array<() => void> }> = new Map();
  private static sharedCounters: Map<string, number> = new Map();

  /**
   * Execute function with exclusive lock to prevent race conditions
   */
  static async withLock<T>(
    lockId: string,
    operation: () => Promise<T>,
    timeout: number = 10000
  ): Promise<T> {
    // Wait for existing lock to release
    const existingLock = this.locks.get(lockId);
    if (existingLock) {
      try {
        await Promise.race([
          existingLock,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Lock timeout for ${lockId}`)), timeout)
          )
        ]);
      } catch (error) {
        // Lock may have been released or timed out, continue
      }
    }

    let resolveLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    this.locks.set(lockId, lockPromise);

    try {
      const result = await operation();
      return result;
    } finally {
      this.locks.delete(lockId);
      resolveLock!();
    }
  }

  /**
   * Mutex implementation for critical sections
   */
  static async acquireMutex(mutexId: string, timeout: number = 5000): Promise<() => void> {
    if (!this.mutexes.has(mutexId)) {
      this.mutexes.set(mutexId, { locked: false, queue: [] });
    }

    const mutex = this.mutexes.get(mutexId)!;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = mutex.queue.findIndex(callback => callback === resolver);
        if (index !== -1) {
          mutex.queue.splice(index, 1);
        }
        reject(new Error(`Mutex timeout for ${mutexId}`));
      }, timeout);

      const resolver = () => {
        clearTimeout(timeoutId);
        mutex.locked = true;
        
        // Return release function
        resolve(() => this.releaseMutex(mutexId));
      };

      if (!mutex.locked) {
        resolver();
      } else {
        mutex.queue.push(resolver);
      }
    });
  }

  /**
   * Release mutex and process queue
   */
  private static releaseMutex(mutexId: string): void {
    const mutex = this.mutexes.get(mutexId);
    if (!mutex) return;

    mutex.locked = false;

    if (mutex.queue.length > 0) {
      const nextCallback = mutex.queue.shift()!;
      nextCallback();
    }
  }

  /**
   * Atomic counter operations
   */
  static incrementCounter(counterId: string, amount: number = 1): number {
    const current = this.sharedCounters.get(counterId) || 0;
    const newValue = current + amount;
    this.sharedCounters.set(counterId, newValue);
    return newValue;
  }

  static decrementCounter(counterId: string, amount: number = 1): number {
    const current = this.sharedCounters.get(counterId) || 0;
    const newValue = Math.max(0, current - amount);
    this.sharedCounters.set(counterId, newValue);
    return newValue;
  }

  static getCounter(counterId: string): number {
    return this.sharedCounters.get(counterId) || 0;
  }

  static resetCounter(counterId: string): void {
    this.sharedCounters.set(counterId, 0);
  }

  /**
   * Safe batch operations
   */
  static async batchProcess<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: {
      concurrency?: number;
      batchSize?: number;
      onProgress?: (completed: number, total: number) => void;
      onError?: (error: Error, item: T, index: number) => void;
    } = {}
  ): Promise<R[]> {
    const {
      concurrency = 3,
      batchSize = 10,
      onProgress,
      onError
    } = options;

    const results: R[] = new Array(items.length);
    const errors: Array<{ index: number; error: Error }> = [];
    
    // Process in batches to avoid overwhelming the system
    for (let batchStart = 0; batchStart < items.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, items.length);
      const batch = items.slice(batchStart, batchEnd);
      
      // Process batch with limited concurrency
      await this.processBatchWithConcurrency(
        batch,
        batchStart,
        processor,
        concurrency,
        results,
        errors,
        onProgress,
        onError
      );
    }

    if (errors.length > 0 && !onError) {
      console.warn(`Batch processing completed with ${errors.length} errors`);
    }

    return results;
  }

  private static async processBatchWithConcurrency<T, R>(
    batch: T[],
    offset: number,
    processor: (item: T, index: number) => Promise<R>,
    concurrency: number,
    results: R[],
    errors: Array<{ index: number; error: Error }>,
    onProgress?: (completed: number, total: number) => void,
    onError?: (error: Error, item: T, index: number) => void
  ): Promise<void> {
    const semaphore = new Array(concurrency).fill(null).map(() => Promise.resolve());
    let semaphoreIndex = 0;

    const promises = batch.map(async (item, batchIndex) => {
      const globalIndex = offset + batchIndex;
      
      // Wait for available slot
      await semaphore[semaphoreIndex];
      const currentSlot = semaphoreIndex;
      semaphoreIndex = (semaphoreIndex + 1) % concurrency;

      try {
        const result = await processor(item, globalIndex);
        results[globalIndex] = result;
        
        if (onProgress) {
          onProgress(globalIndex + 1, results.length);
        }
      } catch (error) {
        const err = error as Error;
        errors.push({ index: globalIndex, error: err });
        
        if (onError) {
          onError(err, item, globalIndex);
        }
      } finally {
        // Release semaphore slot
        semaphore[currentSlot] = Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Debounced shared state updates
   */
  static createDebouncedStateManager<T>(
    stateId: string,
    initialState: T,
    debounceMs: number = 300
  ): {
    getState: () => T;
    setState: (newState: Partial<T>) => void;
    subscribe: (callback: (state: T) => void) => () => void;
  } {
    let state: T = { ...initialState };
    let pendingUpdate: NodeJS.Timeout | null = null;
    const subscribers: Array<(state: T) => void> = [];

    const notifySubscribers = () => {
      subscribers.forEach(callback => {
        try {
          callback(state);
        } catch (error) {
          console.error('State subscriber error:', error);
        }
      });
    };

    return {
      getState: () => ({ ...state }),
      
      setState: (newState: Partial<T>) => {
        state = { ...state, ...newState };
        
        if (pendingUpdate) {
          clearTimeout(pendingUpdate);
        }
        
        pendingUpdate = setTimeout(() => {
          notifySubscribers();
          pendingUpdate = null;
        }, debounceMs);
      },
      
      subscribe: (callback: (state: T) => void) => {
        subscribers.push(callback);
        
        // Return unsubscribe function
        return () => {
          const index = subscribers.indexOf(callback);
          if (index !== -1) {
            subscribers.splice(index, 1);
          }
        };
      }
    };
  }

  /**
   * Rate limiting for API calls or expensive operations
   */
  static createRateLimiter(
    limiterId: string,
    maxCalls: number,
    windowMs: number
  ): (operation: () => Promise<any>) => Promise<any> {
    const calls: number[] = [];

    return async (operation: () => Promise<any>) => {
      const now = Date.now();
      
      // Remove old calls outside the window
      while (calls.length > 0 && calls[0] <= now - windowMs) {
        calls.shift();
      }

      if (calls.length >= maxCalls) {
        const oldestCall = calls[0];
        const waitTime = windowMs - (now - oldestCall);
        
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return this.createRateLimiter(limiterId, maxCalls, windowMs)(operation);
        }
      }

      calls.push(now);
      return await operation();
    };
  }

  /**
   * Circuit breaker pattern for fault tolerance
   */
  static createCircuitBreaker<T>(
    breakerId: string,
    options: {
      failureThreshold?: number;
      resetTimeoutMs?: number;
      monitorWindowMs?: number;
    } = {}
  ): {
    execute: (operation: () => Promise<T>) => Promise<T>;
    getState: () => 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    reset: () => void;
  } {
    const {
      failureThreshold = 5,
      resetTimeoutMs = 60000,
      monitorWindowMs = 60000
    } = options;

    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    let failures: number[] = [];
    let lastFailure: number = 0;
    let nextAttempt: number = 0;

    const isHealthy = () => {
      const now = Date.now();
      failures = failures.filter(time => time > now - monitorWindowMs);
      return failures.length < failureThreshold;
    };

    return {
      execute: async (operation: () => Promise<T>): Promise<T> => {
        const now = Date.now();

        if (state === 'OPEN') {
          if (now < nextAttempt) {
            throw new Error(`Circuit breaker ${breakerId} is OPEN`);
          }
          state = 'HALF_OPEN';
        }

        try {
          const result = await operation();
          
          if (state === 'HALF_OPEN') {
            state = 'CLOSED';
            failures = [];
          }
          
          return result;
        } catch (error) {
          failures.push(now);
          lastFailure = now;

          if (!isHealthy()) {
            state = 'OPEN';
            nextAttempt = now + resetTimeoutMs;
          }

          throw error;
        }
      },

      getState: () => state,

      reset: () => {
        state = 'CLOSED';
        failures = [];
        lastFailure = 0;
        nextAttempt = 0;
      }
    };
  }

  /**
   * Clean up all concurrency resources
   */
  static cleanup(): void {
    console.log('🔄 Cleaning up concurrency resources...');
    
    this.locks.clear();
    this.mutexes.clear();
    this.sharedCounters.clear();
    
    console.log('✅ Concurrency cleanup completed');
  }
}