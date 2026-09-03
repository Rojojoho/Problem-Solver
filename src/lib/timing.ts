// Temporary diagnostic helper for tracking down the slow-tab-switch lag.
// Not meant to stay in the codebase long-term.
//
// Plain console.log calls made on the server only show up in the browser
// console during local `next dev` — Next.js does not forward server-side
// logs to the browser on a deployed/production build. So instead of
// logging directly, each timed server call's duration is collected into a
// plain object that gets sent back to the client as part of the actual
// response, and logged there with a normal client-side console.log —
// which always reaches the browser console, in every environment.
export function makeTimer() {
  const timings: Record<string, number> = {};

  function timed<T>(label: string, promise: Promise<T>): Promise<T> {
    const start = Date.now();
    return promise.then(
      (result) => {
        timings[label] = Date.now() - start;
        return result;
      },
      (err) => {
        timings[label] = Date.now() - start;
        throw err;
      }
    );
  }

  return { timed, timings };
}
