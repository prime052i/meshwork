import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScanEvent } from '../src/shared/types';

// These remote-range liveness tests have no local interfaces or gateway. Keep that fixture
// independent of the runner's adapters, permissions and installed route command.
vi.mock('node:os', async (original) => ({
  ...(await original<typeof import('node:os')>()),
  networkInterfaces: () => ({}),
}));
vi.mock('node:child_process', async (original) => {
  const { EventEmitter } = await import('node:events');
  return {
    ...(await original<typeof import('node:child_process')>()),
    spawn: () => {
      const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), kill: () => {} });
      queueMicrotask(() => child.emit('close', 0));
      return child;
    },
  };
});

/** Probes sent to each address, and the addresses that answer a ping: `late` ones only from their second ping on. */
const pings = new Map<string, number>();
const connections = new Map<string, number>();
const prompt = new Set(['198.51.100.2']);
const late = new Set(['198.51.100.4']);
const count = (of: Map<string, number>, ip: string) => of.set(ip, (of.get(ip) ?? 0) + 1).get(ip) as number;

vi.mock('../src/scanner/probes', async (original) => ({
  ...(await original<typeof import('../src/scanner/probes')>()),
  ping: async (ip: string) => {
    const sent = count(pings, ip);
    return { alive: prompt.has(ip) || (late.has(ip) && sent > 1), ttl: 64, rttMs: 1 };
  },
  tcpProbe: async (ip: string) => (count(connections, ip), 'silent'),
}));

const { runScan } = await import('../src/scanner/engine');

/**
 * Scans `targets` up to the point where every address was looked at, and gives the events sent.
 * `stopAt` chooses where the scan is told to stop: when the neighbour table is read (before any
 * second look) or when the makers of the devices found are looked up (after it).
 */
async function look(targets: string, stopAt: 'table' | 'makers'): Promise<ScanEvent[]> {
  const stop = new AbortController();
  const events: ScanEvent[] = [];
  await runScan({
    runId: 'r',
    settings: { targets, timing: 'balanced', ports: 'top' } as never,
    vendors: { lookup: () => (stopAt === 'makers' ? void stop.abort() : undefined) } as never,
    signal: stop.signal,
    emit: (event) => events.push(event),
    readArp: async () => {
      if (stopAt === 'table') stop.abort();
      return new Map();
    },
  });
  return events;
}
const found = (events: ScanEvent[]) => [...new Set(events.flatMap((e) => (e.type === 'host' ? [e.host.ip] : [])))].sort();

beforeEach(() => {
  pings.clear();
  connections.clear();
});

describe('finding which addresses are in use', () => {
  it('finds a device that missed its first answer, with one more ping to the silent addresses beside a live one', async () => {
    const events = await look('198.51.100.1-198.51.100.6, 203.0.113.1-203.0.113.3', 'makers');
    expect(found(events)).toEqual(['198.51.100.2', '198.51.100.4']);
    // An address that answered is not asked again; one that stayed silent gets one more ping and no more connections.
    expect(pings.get('198.51.100.4')).toBe(2);
    expect(pings.get('198.51.100.5')).toBe(2);
    expect(connections.get('198.51.100.5')).toBe(connections.get('198.51.100.2'));
    // A block where nothing answered is not looked at again.
    expect(pings.get('203.0.113.1')).toBe(1);
    // The count of addresses looked at never runs past its total nor goes back; the total grows by
    // the five addresses looked at again.
    const liveness = events.flatMap((e) => (e.type === 'progress' && e.progress.phase === 'liveness' ? [e.progress] : []));
    for (const p of liveness) expect(p.done).toBeLessThanOrEqual(p.total);
    expect(liveness.map((p) => p.done)).toEqual([...liveness.map((p) => p.done)].sort((a, b) => a - b));
    expect(liveness.at(-1)?.total).toBe(9 + 5);
  });

  it('does not look again when the scan is stopped before the second look', async () => {
    const events = await look('198.51.100.1-198.51.100.6', 'table');
    expect(found(events)).toEqual(['198.51.100.2']);
    expect(pings.get('198.51.100.4')).toBe(1);
  });
});
