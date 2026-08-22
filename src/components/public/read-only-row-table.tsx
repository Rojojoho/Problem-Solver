import type { ReactNode } from "react";

export interface ReadOnlyColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

// Plain, static table for the public plan viewer — deliberately not the
// interactive table components used elsewhere (no drag handles, inputs, or
// buttons, and no server actions imported), since this renders for
// anonymous, unauthenticated visitors.
export function ReadOnlyRowTable<T extends object>({
  columns,
  rows,
  emptyMessage,
}: {
  columns: ReadOnlyColumn<T>[];
  rows: T[];
  emptyMessage: string;
}) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className="border-b border-r border-border px-2 py-1.5 text-left font-semibold last:border-r-0"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border align-top last:border-b-0">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="border-r border-border px-2 py-1.5 whitespace-pre-wrap last:border-r-0"
                >
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
