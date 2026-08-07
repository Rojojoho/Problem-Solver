"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ColumnDef {
  key: string;
  defaultWidth: number;
}

// Persists per-column pixel widths to localStorage (one key per table,
// same pattern as the side-panel width in plan-workspace.tsx) and exposes a
// pointerdown handler for a drag handle on each resizable column's right
// edge. Pair with `table-fixed` + a <colgroup> reading `widths` so the
// columns actually honor these widths instead of auto-sizing to content.
export function useColumnWidths(storageKey: string, columns: ColumnDef[]) {
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((c) => [c.key, c.defaultWidth]))
  );
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Record<string, number>;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a persisted user preference from localStorage on mount
      setWidths((prev) => ({ ...prev, ...parsed }));
    } catch {
      // Ignore malformed/legacy storage — keep the defaults.
    }
  }, [storageKey]);

  function handlePointerDown(columnKey: string, minWidth = 60) {
    return (e: React.PointerEvent<HTMLDivElement>) => {
      const startX = e.clientX;
      const startWidth = widths[columnKey] ?? minWidth;
      const handle = e.currentTarget;
      handle.setPointerCapture(e.pointerId);
      setDraggingKey(columnKey);

      function handleMove(ev: PointerEvent) {
        const next = Math.max(minWidth, startWidth + (ev.clientX - startX));
        setWidths((prev) => ({ ...prev, [columnKey]: next }));
      }

      function handleEnd(ev: PointerEvent) {
        handle.releasePointerCapture(ev.pointerId);
        handle.removeEventListener("pointermove", handleMove);
        handle.removeEventListener("pointerup", handleEnd);
        setDraggingKey(null);
        setWidths((current) => {
          localStorage.setItem(storageKey, JSON.stringify(current));
          return current;
        });
      }

      handle.addEventListener("pointermove", handleMove);
      handle.addEventListener("pointerup", handleEnd);
    };
  }

  return { widths, draggingKey, handlePointerDown };
}

export function ResizableTh({
  isDragging,
  onPointerDown,
  className,
  children,
}: {
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <th
      className={cn(
        "relative border-b border-r border-border px-2 py-1.5 text-left font-semibold",
        className
      )}
    >
      {children}
      <div
        onPointerDown={onPointerDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize column"
        className={cn(
          "absolute inset-y-0 right-0 w-1.5 cursor-col-resize touch-none",
          isDragging ? "bg-border" : "hover:bg-border"
        )}
      />
    </th>
  );
}
