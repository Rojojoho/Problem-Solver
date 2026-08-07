"use client";

import { useLayoutEffect, useRef } from "react";
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

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

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
