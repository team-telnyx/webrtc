/**
 * Unit tests for CallReportStorage — sessionStorage-backed pending report queue.
 */

import {
  enqueuePendingReport,
  drainPendingReports,
  getPendingReportCount,
  clearPendingReports,
  type IPendingReportEntry,
} from '../util/CallReportStorage';

const STORAGE_KEY = 'telnyx-voice-sdk-pending-call-reports';

function makeEntry(
  overrides: Partial<IPendingReportEntry> = {}
): IPendingReportEntry {
  return {
    payload: {
      summary: {
        callId: 'call-123',
        destinationNumber: '+15551234567',
        callerNumber: '+15557654321',
        direction: 'outbound',
        state: 'active',
        sdkVersion: '2.27.2-beta.1',
        startTimestamp: '2026-06-29T23:46:12.000Z',
      },
      stats: [],
    },
    callReportId: 'report-abc',
    host: 'wss://telnyx.example.com',
    queuedAt: Date.now(),
    ...overrides,
  };
}

describe('CallReportStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('enqueuePendingReport', () => {
    it('stores a report in sessionStorage', () => {
      const entry = makeEntry();
      const result = enqueuePendingReport(entry);

      expect(result).toBe(true);
      expect(getPendingReportCount()).toBe(1);

      const raw = sessionStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.entries).toHaveLength(1);
      expect(parsed.entries[0].callReportId).toBe('report-abc');
    });

    it('appends to existing entries (FIFO order)', () => {
      enqueuePendingReport(makeEntry({ callReportId: 'report-1' }));
      enqueuePendingReport(makeEntry({ callReportId: 'report-2' }));
      enqueuePendingReport(makeEntry({ callReportId: 'report-3' }));

      const entries = drainPendingReports();
      expect(entries).toHaveLength(3);
      expect(entries[0].callReportId).toBe('report-1');
      expect(entries[1].callReportId).toBe('report-2');
      expect(entries[2].callReportId).toBe('report-3');
    });

    it('enforces MAX_PENDING_REPORTS limit (drops oldest)', () => {
      // Enqueue 25 entries — only the last 20 should survive
      for (let i = 0; i < 25; i++) {
        enqueuePendingReport(makeEntry({ callReportId: `report-${i}` }));
      }

      expect(getPendingReportCount()).toBe(20);

      const entries = drainPendingReports();
      // Oldest 5 (report-0 through report-4) should have been dropped
      expect(entries[0].callReportId).toBe('report-5');
      expect(entries[entries.length - 1].callReportId).toBe('report-24');
    });

    it('handles malformed stored data gracefully', () => {
      sessionStorage.setItem(STORAGE_KEY, 'not valid json');

      const result = enqueuePendingReport(makeEntry({ callReportId: 'new' }));

      expect(result).toBe(true);
      const entries = drainPendingReports();
      expect(entries).toHaveLength(1);
      expect(entries[0].callReportId).toBe('new');
    });
  });

  describe('drainPendingReports', () => {
    it('returns entries and clears storage (at-most-once)', () => {
      enqueuePendingReport(makeEntry({ callReportId: 'r1' }));
      enqueuePendingReport(makeEntry({ callReportId: 'r2' }));

      const entries = drainPendingReports();
      expect(entries).toHaveLength(2);

      // Second drain should return empty
      const entries2 = drainPendingReports();
      expect(entries2).toHaveLength(0);

      // Storage key should be removed
      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('returns empty array when nothing stored', () => {
      const entries = drainPendingReports();
      expect(entries).toEqual([]);
    });

    it('returns empty array when storage has malformed data', () => {
      sessionStorage.setItem(STORAGE_KEY, '{ broken json');
      const entries = drainPendingReports();
      expect(entries).toEqual([]);
      // Malformed data is cleared
      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('getPendingReportCount', () => {
    it('returns 0 when nothing stored', () => {
      expect(getPendingReportCount()).toBe(0);
    });

    it('returns the correct count', () => {
      enqueuePendingReport(makeEntry());
      enqueuePendingReport(makeEntry());
      expect(getPendingReportCount()).toBe(2);
    });

    it('returns 0 for malformed data', () => {
      sessionStorage.setItem(STORAGE_KEY, 'garbage');
      expect(getPendingReportCount()).toBe(0);
    });
  });

  describe('clearPendingReports', () => {
    it('removes all entries from storage', () => {
      enqueuePendingReport(makeEntry());
      enqueuePendingReport(makeEntry());
      expect(getPendingReportCount()).toBe(2);

      clearPendingReports();
      expect(getPendingReportCount()).toBe(0);
      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });
});
