"use client";

import { useRef, useState } from "react";

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

  function flush() {
    if (inFlightRef.current || !hasPendingRef.current) return;
    const value = pendingRef.current as T;
    hasPendingRef.current = false;
    inFlightRef.current = true;
    saveFn(value)
      .catch(() => onError?.(value))
      .finally(() => {
        inFlightRef.current = false;
        flush();
      });
  }

  function save(value: T) {
    pendingRef.current = value;
    hasPendingRef.current = true;
    flush();
  }

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

  function getQueue(key: string) {
    let q = queuesRef.current.get(key);
    if (!q) {
      q = { hasPending: false, inFlight: false };
      queuesRef.current.set(key, q);
    }
    return q;
  }

  function flush(key: string) {
    const q = queuesRef.current.get(key);
    if (!q || q.inFlight || !q.hasPending) return;
    const value = q.pending as T;
    q.hasPending = false;
    q.inFlight = true;
    setActiveCount((n) => n + 1);
    saveFn(key, value)
      .catch(() => onError?.(key, value))
      .finally(() => {
        q.inFlight = false;
        setActiveCount((n) => n - 1);
        flush(key);
      });
  }

  function save(key: string, value: T) {
    const q = getQueue(key);
    q.pending = value;
    q.hasPending = true;
    flush(key);
  }

  return { save, isSaving: activeCount > 0 };
}
