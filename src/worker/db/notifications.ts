
export interface NotificationRow {
  event_key: string;
  recipient_telegram_id: number;
  text: string;
  reply_markup_json?: string | null;
}

export function notificationStatement(db: D1Database, row: NotificationRow): D1PreparedStatement {
  return db
    .prepare('INSERT OR IGNORE INTO notification_outbox (event_key, chat_id, text, reply_markup) VALUES (?, ?, ?, ?)')
    .bind(row.event_key, row.recipient_telegram_id, row.text.slice(0, 4096), row.reply_markup_json ?? null);
}

export function guardedNotificationStatement(
  db: D1Database,
  row: NotificationRow,
  where: string,
  params: unknown[]
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT OR IGNORE INTO notification_outbox (event_key, chat_id, text, reply_markup) SELECT ?, ?, ?, ? WHERE ${where}`
    )
    .bind(row.event_key, row.recipient_telegram_id, row.text.slice(0, 4096), row.reply_markup_json ?? null, ...params);
}
