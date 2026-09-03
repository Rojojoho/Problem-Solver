// Temporary diagnostic helper — wraps a promise to log how long it took.
// Not meant to stay in the codebase long-term; remove once the slow-tab-
// switch investigation is done.
export function timed<T>(label: string, promise: Promise<T>): Promise<T> {
  const start = Date.now();
  return promise.then(
    (result) => {
      console.log(`[timing] ${label}: ${Date.now() - start}ms`);
      return result;
    },
    (err) => {
      console.log(`[timing] ${label}: ${Date.now() - start}ms (failed)`);
      throw err;
    }
  );
}
