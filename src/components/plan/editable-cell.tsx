"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// A borderless, auto-growing textarea used for every free-text table cell —
// starts single-line and expands to fit pasted/typed paragraphs instead of
// scrolling horizontally, so the row grows naturally with its content.
export function EditableCell({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  disabled,
}: EditableCellProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lastWidthRef = useRef<number | null>(null);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useLayoutEffect(() => {
    resize();
  }, [value]);

  // The height frozen above only accounts for the textarea's width and font
  // metrics at that instant. Neither is guaranteed final on first paint: the
  // table's column widths can still settle after mount, and the Roboto font
  // (next/font, font-display: swap) can swap in after an initial fallback
  // render with different glyph metrics -- either can change how many lines
  // the same text needs, leaving stale-height cells visibly clipped until
  // something (like typing) re-triggers the effect above. Re-measure when
  // the element's width changes or once the real font finishes loading.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width === undefined) return;
      if (lastWidthRef.current !== null && width !== lastWidthRef.current) {
        resize();
      }
      lastWidthRef.current = width;
    });
    observer.observe(el);

    let cancelled = false;
    document.fonts?.ready?.then(() => {
      if (!cancelled) resize();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "block w-full resize-none overflow-hidden bg-transparent px-2 py-1.5 leading-snug outline-none focus:bg-muted/30",
        className
      )}
    />
  );
}
