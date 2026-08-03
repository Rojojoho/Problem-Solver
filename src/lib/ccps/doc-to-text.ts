import type { JSONContent } from "@tiptap/react";

/** Flattens a Tiptap JSON doc into plain paragraph strings for read-only display. */
export function docToParagraphs(doc: JSONContent | undefined): string[] {
  if (!doc?.content) return [];

  return doc.content
    .map((node) => {
      if (!node.content) return "";
      return node.content
        .map((textNode) => textNode.text ?? "")
        .join("");
    })
    .filter(Boolean);
}
