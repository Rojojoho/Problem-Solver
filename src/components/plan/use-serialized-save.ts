"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Every table in this app autosaves by sending its *entire* current array
// to the server on every single edit, with nothing waiting for the
// previous save to finish first. Fire several edits in a burst (e.g. add
// a few rows quickly) and you get several independent in-flight requests,
// each carrying a different-length snapshot — and over a real network,
// responses don't necessarily land back in the order they were sent. If
// an earlier, smaller snapshot's request resolves *after* a later, larger
// one, it silently overwrites the newer data with no error at all.
//
// This guarantees at most one save in flight at a time and that saves are
// always sent (and therefore resolve) in the order they were queued —
// closing that race entirely. Superseded intermediate values are simply
// skipped once a newer one arrives; only the latest value ever matters.
export function useSerializedSave<T>(
  saveFn: (value: T) => Promise<void>,
  onError?: (value: T) => void
) {
  const pendingRef = useRef<T | undefined>(undefined);
  const hasPendingRef = useRef(false);
  const inFlightRef = useRef(false);
  // saveFn/onError are read through refs, kept current via an effect
  // (mutating a ref during render itself isn't allowed) so the returned
  // `save` callback below can have a stable identity across renders via an
  // empty dependency array — every table that consumes this hook can then
  // safely pass `save` to a memoized row component without it forcing a
  // re-render on every parent render regardless of memo.
  const saveFnRef = useRef(saveFn);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    saveFnRef.current = saveFn;
    onErrorRef.current = onError;
  }, [saveFn, onError]);

  const save = useCallback((value: T) => {
    pendingRef.current = value;
    hasPendingRef.current = true;
    // A named function expression (not the outer `const`) so the
    // recursive call in `.finally()` below resolves to this function's own
    // name binding rather than the outer binding, which wouldn't be
    // initialized yet the first time this runs synchronously.
    (function flush() {
      if (inFlightRef.current || !hasPendingRef.current) return;
      const next = pendingRef.current as T;
      hasPendingRef.current = false;
      inFlightRef.current = true;
      saveFnRef
        .current(next)
        .catch(() => onErrorRef.current?.(next))
        .finally(() => {
          inFlightRef.current = false;
          flush();
        });
    })();
  }, []);

  return save;
}

// Same guarantee as useSerializedSave, but keyed — independent resources
// (e.g. one Tiptap field per stage) queue separately and don't block or
// coalesce with each other, while saves to the *same* key still fully
// serialize. Also exposes an aggregate isSaving flag (true while any key
// has a save pending or in flight) for a shared "Saving…" indicator.
export function useKeyedSerializedSave<T>(
  saveFn: (key: string, value: T) => Promise<void>,
  onError?: (key: string, value: T) => void
) {
  const queuesRef = useRef(
    new Map<string, { pending?: T; hasPending: boolean; inFlight: boolean }>()
  );
  const [activeCount, setActiveCount] = useState(0);
  const saveFnRef = useRef(saveFn);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    saveFnRef.current = saveFn;
    onErrorRef.current = onError;
  }, [saveFn, onError]);

  const save = useCallback((key: string, value: T) => {
    let q = queuesRef.current.get(key);
    if (!q) {
      q = { hasPending: false, inFlight: false };
      queuesRef.current.set(key, q);
    }
    q.pending = value;
    q.hasPending = true;

    (function flush() {
      const current = queuesRef.current.get(key);
      if (!current || current.inFlight || !current.hasPending) return;
      const next = current.pending as T;
      current.hasPending = false;
      current.inFlight = true;
      setActiveCount((n) => n + 1);
      saveFnRef
        .current(key, next)
        .catch(() => onErrorRef.current?.(key, next))
        .finally(() => {
          current.inFlight = false;
          setActiveCount((n) => n - 1);
          flush();
        });
    })();
  }, []);

  return { save, isSaving: activeCount > 0 };
}
