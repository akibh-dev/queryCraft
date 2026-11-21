import type { Predicate, QuerySpec } from "./level";

function quoteIdentifier(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

function condition(predicate: Predicate): string {
  const column = quoteIdentifier(predicate.column);
  if (predicate.op === "eq") {
    const value = predicate.value;
    const literal =
      typeof value === "string"
        ? `'${value.replaceAll("'", "''")}'`
        : String(value).toUpperCase();
    return `${column} = ${literal}`;
  }
  const bounds = [];
  if (predicate.gte !== undefined) bounds.push(`${column} >= ${predicate.gte}`);
  if (predicate.lt !== undefined) bounds.push(`${column} < ${predicate.lt}`);
  return bounds.join(" AND ");
}

// For display only. Simulation and correctness consume the structured query.
export function formatQuery(query: QuerySpec): string {
  const select = query.select.map(quoteIdentifier).join(", ");
  const conditions = query.predicates.map(condition).join(" AND ");
  return `SELECT ${select}\nFROM ${quoteIdentifier(query.table)}${conditions ? `\nWHERE ${conditions}` : ""};`;
}
