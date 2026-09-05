"use client";

import { useEditor, EditorContent, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { BoldIcon, ListIcon, LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  content: JSONContent;
  onBlurSave?: (content: JSONContent) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function TiptapEditor({
  content,
  onBlurSave,
  className,
  editable = true,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[120px] text-sm focus:outline-none " +
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 " +
          "[&_a]:text-primary [&_a]:underline [&_strong]:font-semibold",
      },
    },
    onBlur: ({ editor }) => {
      // getJSON() can carry mark attrs (e.g. the Link mark's) that aren't
      // plain objects internally — passing those straight into a Server
      // Action trips React's "opaque temporary reference" serialization
      // error. Round-tripping through JSON guarantees a plain-data value.
      onBlurSave?.(JSON.parse(JSON.stringify(editor.getJSON())));
    },
  });

  if (!editable) {
    return (
      <div className={className}>
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring",
        className
      )}
    >
      {editor && <Toolbar editor={editor} />}
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  function setLink() {
    const previousUrl = editor.getAttributes("link").href as string | undefined;

    if (previousUrl) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const url = window.prompt("Link URL");
    if (!url) return;

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="flex items-center gap-1 border-b px-2 py-1">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Link"
        active={editor.isActive("link")}
        onClick={setLink}
      >
        <LinkIcon className="size-4" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded hover:bg-muted",
        active && "bg-primary/10 text-primary"
      )}
    >
      {children}
    </button>
  );
}
