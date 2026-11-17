export type NotificationKind = "new_review" | "review_response" | "org_status";
export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

/** Count of notifications the user has not opened yet. */
export const unreadCount = (items: Pick<AppNotification, "read_at">[]) =>
  items.filter((n) => !n.read_at).length;
