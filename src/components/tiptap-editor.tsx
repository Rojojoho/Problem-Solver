"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  content: JSONContent;
  onBlurSave: (content: JSONContent) => void;
  placeholder?: string;
  className?: string;
}

export function TiptapEditor({
  content,
  onBlurSave,
  className,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[120px]",
      },
    },
    onBlur: ({ editor }) => {
      onBlurSave(editor.getJSON());
    },
  });

  return (
    <div
      className={cn(
        "rounded-md border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring",
        className
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
