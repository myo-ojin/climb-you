/**
 * Memory Management Utilities
 * Helps prevent memory leaks and manages async operations safely
 */

export class MemoryManager {
  private static timers: Map<string, NodeJS.Timeout> = new Map();
  private static intervals: Map<string, NodeJS.Timer> = new Map();
  private static eventListeners: Map<string, { element: any; event: string; handler: Function }[]> = new Map();
  private static activePromises: Map<string, { promise: Promise<any>; controller: AbortController }> = new Map();

  /**
   * Create a managed timer that will be automatically cleaned up
   */
  static createTimer(id: string, callback: () => void, delay: number): string {
    // Clean up existing timer with same ID
    this.clearTimer(id);
    
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(id);
    }, delay);
    
    this.timers.set(id, timer);
    return id;
  }

  /**
   * Create a managed interval that will be automatically cleaned up
   */
  static createInterval(id: string, callback: () => void, interval: number): string {
    // Clean up existing interval with same ID
    this.clearInterval(id);
    
    const intervalId = setInterval(callback, interval);
    this.intervals.set(id, intervalId);
    return id;
  }

  /**
   * Clear a specific timer
   */
  static clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  /**
   * Clear a specific interval
   */
  static clearInterval(id: string): void {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
  }

  /**
   * Clear all managed timers and intervals
   */
  static clearAll(): void {
    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Clear all intervals
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();

    // Clean up event listeners
    this.eventListeners.forEach((listeners, id) => {
      listeners.forEach(({ element, event, handler }) => {
        if (element && element.removeEventListener) {
          element.removeEventListener(event, handler);
        }
      });
    });
    this.eventListeners.clear();

    // Abort active promises
    this.activePromises.forEach(({ controller }) => {
      if (controller && !controller.signal.aborted) {
        controller.abort();
      }
    });
    this.activePromises.clear();
  }

  /**
   * Add a managed event listener
   */
  static addEventListener(
    id: string,
    element: any,
    event: string,
    handler: Function
  ): void {
    if (!element || !element.addEventListener) {
      console.warn('Invalid element provided to addEventListener');
      return;
    }

    // Remove existing listeners for this ID
    this.removeEventListeners(id);

    element.addEventListener(event, handler);
    
    if (!this.eventListeners.has(id)) {
      this.eventListeners.set(id, []);
    }
    
    this.eventListeners.get(id)!.push({ element, event, handler });
  }

  /**
   * Remove event listeners for a specific ID
   */
  static removeEventListeners(id: string): void {
    const listeners = this.eventListeners.get(id);
    if (listeners) {
      listeners.forEach(({ element, event, handler }) => {
        if (element && element.removeEventListener) {
          element.removeEventListener(event, handler);
        }
      });
      this.eventListeners.delete(id);
    }
  }

  /**
   * Create a managed promise with abort controller
   */
  static createManagedPromise<T>(
    id: string,
    promiseFactory: (signal: AbortSignal) => Promise<T>,
    timeout: number = 30000
  ): Promise<T> {
    // Clean up existing promise with same ID
    this.abortPromise(id);

    const controller = new AbortController();
    const { signal } = controller;

    // Create timeout for the promise
    const timeoutId = setTimeout(() => {
      if (!signal.aborted) {
        controller.abort();
      }
    }, timeout);

    const promise = promiseFactory(signal)
      .finally(() => {
        clearTimeout(timeoutId);
        this.activePromises.delete(id);
      });

    this.activePromises.set(id, { promise, controller });
    return promise;
  }

  /**
   * Abort a specific managed promise
   */
  static abortPromise(id: string): void {
    const managed = this.activePromises.get(id);
    if (managed && !managed.controller.signal.aborted) {
      managed.controller.abort();
      this.activePromises.delete(id);
    }
  }

  /**
   * Get memory usage statistics
   */
  static getMemoryStats(): {
    activeTimers: number;
    activeIntervals: number;
    activeEventListeners: number;
    activePromises: number;
    memoryUsage?: any;
  } {
    const stats = {
      activeTimers: this.timers.size,
      activeIntervals: this.intervals.size,
      activeEventListeners: Array.from(this.eventListeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
      activePromises: this.activePromises.size,
    };

    // Add Node.js memory usage if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      stats.memoryUsage = process.memoryUsage();
    }

    return stats;
  }

  /**
   * Check for potential memory leaks
   */
  static checkForLeaks(): {
    hasLeaks: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    const stats = this.getMemoryStats();

    if (stats.activeTimers > 10) {
      warnings.push(`High number of active timers: ${stats.activeTimers}`);
      recommendations.push('Consider clearing unused timers or using shorter timeout periods');
    }

    if (stats.activeIntervals > 5) {
      warnings.push(`High number of active intervals: ${stats.activeIntervals}`);
      recommendations.push('Review interval usage and clear unnecessary ones');
    }

    if (stats.activeEventListeners > 50) {
      warnings.push(`High number of active event listeners: ${stats.activeEventListeners}`);
      recommendations.push('Ensure event listeners are properly removed when components unmount');
    }

    if (stats.activePromises > 20) {
      warnings.push(`High number of active promises: ${stats.activePromises}`);
      recommendations.push('Consider implementing promise timeouts and cleanup');
    }

    // Check memory usage if available
    if (stats.memoryUsage) {
      const heapUsedMB = stats.memoryUsage.heapUsed / 1024 / 1024;
      if (heapUsedMB > 100) {
        warnings.push(`High memory usage: ${heapUsedMB.toFixed(2)}MB`);
        recommendations.push('Monitor memory usage and implement cleanup strategies');
      }
    }

    return {
      hasLeaks: warnings.length > 0,
      warnings,
      recommendations,
    };
  }

  /**
   * Safe async operation wrapper that prevents race conditions
   */
  static async safeAsync<T>(
    id: string,
    operation: () => Promise<T>,
    options: {
      timeout?: number;
      retries?: number;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<T> {
    const { timeout = 10000, retries = 0, onError } = options;
    
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.createManagedPromise(
          `${id}_attempt_${attempt}`,
          () => operation(),
          timeout
        );
      } catch (error) {
        lastError = error as Error;
        if (onError) {
          onError(lastError);
        }
        
        if (attempt < retries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Debounced function execution to prevent excessive calls
   */
  static debounce<T extends (...args: any[]) => any>(
    id: string,
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      this.clearTimer(`debounce_${id}`);
      this.createTimer(`debounce_${id}`, () => func(...args), delay);
    };
  }

  /**
   * Throttled function execution to limit call frequency
   */
  static throttle<T extends (...args: any[]) => any>(
    id: string,
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  /**
   * Cleanup function to be called when application shuts down
   */
  static cleanup(): void {
    console.log('🧹 Performing memory cleanup...');
    const stats = this.getMemoryStats();
    console.log('Memory stats before cleanup:', stats);
    
    this.clearAll();
    
    const finalStats = this.getMemoryStats();
    console.log('Memory stats after cleanup:', finalStats);
  }
}

// Automatic cleanup on process exit (Node.js)
if (typeof process !== 'undefined') {
  process.on('exit', () => MemoryManager.cleanup());
  process.on('SIGINT', () => {
    MemoryManager.cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    MemoryManager.cleanup();
    process.exit(0);
  });
}