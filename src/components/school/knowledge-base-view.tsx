"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Linkified } from "@/components/plan/knowledge-panel";
import type { SharedKnowledgeItemData } from "@/lib/ccps/types";

export function KnowledgeBaseView({ items }: { items: SharedKnowledgeItemData[] }) {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);

  const types = Array.from(
    new Set(items.map((item) => item.typeLabel).filter((label): label is string => Boolean(label)))
  );

  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing shared yet — add a Knowledge item from any plan and leave
        &quot;Share with school&quot; checked to see it here.
      </p>
    );
  }

  const filtered = items.filter(
    (item) =>
      (!activeType || item.typeLabel === activeType) &&
      (!query.trim() || item.title.toLowerCase().includes(query.trim().toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeType === null ? "default" : "outline"}
          onClick={() => setActiveType(null)}
        >
          All
        </Button>
        {types.map((type) => (
          <Button
            key={type}
            type="button"
            size="sm"
            variant={activeType === type ? "default" : "outline"}
            onClick={() => setActiveType(type)}
          >
            {type}
          </Button>
        ))}
      </div>

      <Input
        placeholder="Search knowledge…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matches.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.id} className="space-y-1.5 rounded-md border border-border p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">{item.title}</span>
                {item.typeLabel && <Badge variant="outline">{item.typeLabel}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                From:{" "}
                <Link href={`/plans/${item.sourcePlanId}`} className="hover:underline">
                  {item.sourcePlanName}
                </Link>
              </p>
              {item.description && (
                <p className="text-sm break-words whitespace-pre-wrap">
                  <Linkified text={item.description} />
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
