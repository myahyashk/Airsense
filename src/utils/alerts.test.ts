import { describe, it, expect } from 'vitest';
import { dedupeAlerts, shouldNotifyForAlert } from './alerts';

describe('alert deduplication', () => {
  it('removes duplicate alert items by id while keeping unique ones', () => {
    const items = [
      { id: 1, title: 'Dust spike', active: true, read: false },
      { id: 1, title: 'Dust spike', active: true, read: false },
      { id: 2, title: 'Late warning', active: true, read: true },
    ];

    expect(dedupeAlerts(items as any)).toHaveLength(2);
    expect(dedupeAlerts(items as any).map((item) => item.id)).toEqual([1, 2]);
  });

  it('notifies only for new unread alert events', () => {
    const prev = [{ id: 1, read: true, active: true }];
    const next = [{ id: 1, read: true, active: true }, { id: 2, read: false, active: true }];

    expect(shouldNotifyForAlert(prev as any, next as any)).toBe(true);
  });

  it('does not notify when the alert already existed and was already read', () => {
    const prev = [{ id: 1, read: true, active: true }];
    const next = [{ id: 1, read: true, active: true }];

    expect(shouldNotifyForAlert(prev as any, next as any)).toBe(false);
  });
});
