import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { notificationsQuery, markRead } from "../api/notifications";
import { unreadCount } from "../types";

export function NotificationBell({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery(notificationsQuery(userId));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = unreadCount(data);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const readAll = async () => {
    await markRead(data.filter((n) => !n.read_at).map((n) => n.id));
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
  };

  return (
    <div ref={ref} className="relative">
      <button
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-md border hover:bg-muted"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="font-display text-base">Notifications</span>
            {unread > 0 && (
              <button onClick={readAll} className="text-xs text-muted-foreground hover:text-foreground">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {data.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</li>
            )}
            {data.map((n) => (
              <li key={n.id} className={n.read_at ? "" : "bg-accent/40"}>
                <Link
                  href={n.link ?? "/"}
                  onClick={async () => {
                    setOpen(false);
                    if (!n.read_at) {
                      await markRead([n.id]);
                      qc.invalidateQueries({ queryKey: ["notifications", userId] });
                    }
                  }}
                  className="block border-b px-4 py-3 hover:bg-muted"
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
