import type { Service } from "../types";
export function ServiceList({ services }: { services: Service[] }) {
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {services.map((s) => (
        <li key={s.id} className="p-4"><p className="font-medium">{s.name}</p><p className="text-sm text-muted-foreground">{s.description}</p></li>
      ))}
    </ul>
  );
}
