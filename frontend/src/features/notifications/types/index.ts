export type NotificationKind = "new_review" | "review_response" | "org_status" | string;

export type AppNotification = {
  id: string;
  kind?: NotificationKind;
  type?: string;
  title: string;
  body?: string;
  message?: string;
  link?: string | null;
  read_at: string | null;
  created_at: string;
};

/** Count of notifications the user has not opened yet. */
export const unreadCount = (items: Pick<AppNotification, "read_at">[] | unknown): number =>
  Array.isArray(items) ? items.filter((n) => !n.read_at).length : 0;