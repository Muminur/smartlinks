/**
 * Debounce utility for rate limiting function calls
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

/**
 * Creates a debounced async function that returns a promise
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;
  let promiseResolve: ((value: ReturnType<T>) => void) | null = null;
  let promiseReject: ((reason?: any) => void) | null = null;

  return function (...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise((resolve, reject) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      promiseResolve = resolve;
      promiseReject = reject;

      timeout = setTimeout(async () => {
        try {
          const result = await func(...args);
          if (promiseResolve) {
            promiseResolve(result);
          }
        } catch (error) {
          if (promiseReject) {
            promiseReject(error);
          }
        } finally {
          timeout = null;
          promiseResolve = null;
          promiseReject = null;
        }
      }, wait);
    });
  };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, wait);
    } else {
      lastArgs = args;
    }
  };
}