export type AlertLike = {
  id: number;
  active?: boolean;
  read?: boolean;
  title?: string;
  severity?: string;
};

export function dedupeAlerts<T extends AlertLike>(alerts: T[]): T[] {
  const seen = new Set<number>();
  return alerts.filter((alert) => {
    if (seen.has(alert.id)) {
      return false;
    }
    seen.add(alert.id);
    return true;
  });
}

export function shouldNotifyForAlert(prevAlerts: AlertLike[], nextAlerts: AlertLike[]): boolean {
  const prevMap = new Map(prevAlerts.map((alert) => [alert.id, alert]));

  for (const nextAlert of nextAlerts) {
    const previous = prevMap.get(nextAlert.id);
    const isNewUnread = !previous || previous.read !== false;
    if (nextAlert.active !== false && nextAlert.read === false && isNewUnread) {
      return true;
    }
  }

  return false;
}
