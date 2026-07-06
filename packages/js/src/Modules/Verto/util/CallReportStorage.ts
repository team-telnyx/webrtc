/**
 * sessionStorage-backed queue for call reports that could not be delivered
 * due to WebSocket disconnect (1001 Going Away), network failure, or socket
 * connect timeout.
 *
 * Reports are POSTed to the voice-sdk-proxy HTTP endpoint (/call_report), NOT
 * over the WebSocket itself. But when the network is down alongside the
 * socket, the HTTP POST also fails and the report is lost. This module
 * persists the failed report payload to sessionStorage so it can be retried
 * after the socket re-establishes or on the next session startup.
 *
 * Follows the same safe-storage pattern as {@link ./reconnect.ts} — every
 * sessionStorage operation is wrapped in try/catch so a blocked or
 * unavailable storage (private mode, disabled storage) silently no-ops
 * instead of crashing the SDK.
 */
import type { ICallReportPayload } from '../webrtc/CallReportCollector';
import logger from './logger';

const STORAGE_KEY = 'telnyx-voice-sdk-pending-call-reports';

/** Maximum number of pending reports to retain in storage. Oldest are dropped when exceeded. */
const MAX_PENDING_REPORTS = 20;

/** Maximum total serialized size of the pending reports blob (bytes). */
const MAX_STORAGE_BYTES = 4 * 1024 * 1024; // 4 MiB

export interface IPendingReportEntry {
  /** The serialized call report payload (stats + logs + summary). */
  payload: ICallReportPayload;
  /** The call_report_id assigned by the server (or a synthetic gen- ID). */
  callReportId: string;
  /** The voice-sdk-proxy host (wss://… or ws://…) to POST to. */
  host: string;
  /** Optional voice_sdk_id for the x-voice-sdk-id header. */
  voiceSdkId?: string;
  /** Epoch ms when the report was enqueued (for staleness / debugging). */
  queuedAt: number;
}

interface IPendingReportsBlob {
  entries: IPendingReportEntry[];
}

// ── Safe sessionStorage helpers (mirrors reconnect.ts pattern) ──────────────

function safeGetItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch (err) {
    logger.debug(
      `CallReportStorage: safeGetItem('${key}') failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch (err) {
    // Quota exceeded or storage unavailable (private mode). Drop the oldest
    // half of the entries and retry once before giving up.
    logger.info(
      `CallReportStorage: safeSetItem('${key}') failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

function safeRemoveItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (err) {
    logger.debug(
      `CallReportStorage: safeRemoveItem('${key}') failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

// ── Internal read/write ────────────────────────────────────────────────────

function readBlob(): IPendingReportsBlob | null {
  const raw = safeGetItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as IPendingReportsBlob;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.entries)) {
      logger.debug('CallReportStorage: stored payload was malformed — discarded.');
      return null;
    }
    return parsed;
  } catch (err) {
    logger.debug(
      `CallReportStorage: JSON parse failed — discarded: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

function writeBlob(blob: IPendingReportsBlob): boolean {
  const json = JSON.stringify(blob);

  if (json.length > MAX_STORAGE_BYTES) {
    // Drop oldest entries until we fit. Each drop removes one entry and we
    // re-check the size. If a single entry exceeds the limit, we drop it.
    const entries = [...blob.entries];
    while (entries.length > 0 && JSON.stringify({ entries }).length > MAX_STORAGE_BYTES) {
      const dropped = entries.shift();
      logger.info('CallReportStorage: dropping oldest entry to stay under size limit', {
        callId: dropped?.payload?.summary?.callId,
      });
    }
    blob.entries = entries;
  }

  if (blob.entries.length === 0) {
    safeRemoveItem(STORAGE_KEY);
    return true;
  }

  const before = safeGetItem(STORAGE_KEY);
  safeSetItem(STORAGE_KEY, JSON.stringify(blob));
  // Verify the write succeeded (quota may silently reject in private mode).
  const after = safeGetItem(STORAGE_KEY);
  return after !== before;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Enqueue a pending call report that could not be delivered immediately.
 * Enforces the {@link MAX_PENDING_REPORTS} limit by dropping the oldest
 * entries when exceeded.
 *
 * @returns `true` if the report was persisted, `false` if storage is
 *   unavailable or the write was rejected (quota / private mode).
 */
export function enqueuePendingReport(entry: IPendingReportEntry): boolean {
  const blob = readBlob() ?? { entries: [] };
  blob.entries.push(entry);

  // Enforce count limit — drop oldest first.
  while (blob.entries.length > MAX_PENDING_REPORTS) {
    const dropped = blob.entries.shift();
    logger.info('CallReportStorage: dropping oldest pending report (count limit)', {
      callId: dropped?.payload?.summary?.callId,
    });
  }

  return writeBlob(blob);
}

/**
 * Read and clear all pending call reports from storage.
 * After this call, the storage key is removed so reports cannot be
 * re-consumed by a duplicate recovery event (at-most-once delivery).
 *
 * @returns Array of pending entries (oldest first), or an empty array if
 *   nothing is stored or storage is unavailable.
 */
export function drainPendingReports(): IPendingReportEntry[] {
  const blob = readBlob();
  // Always clear after reading — at-most-once.
  safeRemoveItem(STORAGE_KEY);

  if (!blob) return [];
  return blob.entries;
}

/**
 * Peek at the number of pending reports without removing them.
 */
export function getPendingReportCount(): number {
  const blob = readBlob();
  return blob?.entries.length ?? 0;
}

/**
 * Remove all pending reports from storage.
 */
export function clearPendingReports(): void {
  safeRemoveItem(STORAGE_KEY);
}
