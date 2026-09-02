import type { JSONContent } from "@tiptap/react";

function extractText(node: JSONContent): string {
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(extractText).join("");
}

// Bullet/ordered list text lives two levels below the list node itself
// (bulletList -> listItem -> paragraph -> text), not directly under it —
// walked separately from plain blocks so list content isn't silently
// dropped, with a "- "/"1. " prefix per item so it still reads as a list
// once flattened to plain text.
function walk(nodes: JSONContent[], prefix = ""): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    if (node.type === "bulletList" || node.type === "orderedList") {
      (node.content ?? []).forEach((item, i) => {
        const itemPrefix = node.type === "orderedList" ? `${i + 1}. ` : "- ";
        lines.push(...walk(item.content ?? [], itemPrefix));
      });
      continue;
    }
    const text = extractText(node);
    if (text) lines.push(prefix + text);
  }
  return lines;
}

/** Flattens a Tiptap JSON doc into plain lines for read-only display —
 * one entry per paragraph/heading, or per list item. */
export function docToParagraphs(doc: JSONContent | undefined): string[] {
  if (!doc?.content) return [];
  return walk(doc.content);
}
