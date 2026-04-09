import { CandidateFilter } from '../../webrtc/CandidateFilter';

// Suppress logger output during tests
jest.mock('../../util/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

function makeEvent(candidateStr: string | null): RTCPeerConnectionIceEvent {
  return {
    candidate: candidateStr
      ? ({ candidate: candidateStr } as RTCIceCandidate)
      : null,
  } as RTCPeerConnectionIceEvent;
}

describe('CandidateFilter', () => {
  let onCandidate: jest.Mock;
  let onEndOfCandidates: jest.Mock;

  beforeEach(() => {
    onCandidate = jest.fn();
    onEndOfCandidates = jest.fn();
  });

  describe('when disabled', () => {
    it('passes all candidates through', () => {
      const filter = new CandidateFilter(false, onCandidate, onEndOfCandidates);

      filter.add(
        makeEvent(
          'candidate:1 1 udp 2113937151 192.168.1.1 54400 typ host generation 0'
        )
      );
      filter.add(
        makeEvent(
          'candidate:2 1 udp 1677729535 50.236.171.26 16464 typ srflx raddr 192.168.101.233 rport 16464'
        )
      );
      filter.add(
        makeEvent(
          'candidate:3 1 udp 1677729535 50.236.171.26 42084 typ srflx raddr 192.168.1.195 rport 42084'
        )
      );
      filter.add(
        makeEvent(
          'candidate:4 1 udp 33562367 64.16.248.199 51648 typ relay raddr 192.168.101.233 rport 63650'
        )
      );
      filter.add(
        makeEvent(
          'candidate:5 1 udp 33562367 64.16.248.198 55626 typ relay raddr 192.168.1.195 rport 52901'
        )
      );
      filter.add(makeEvent(null));

      expect(onCandidate).toHaveBeenCalledTimes(5);
      expect(onEndOfCandidates).toHaveBeenCalledTimes(1);
    });
  });

  describe('when enabled', () => {
    it('passes host candidates through without locking', () => {
      const filter = new CandidateFilter(true, onCandidate, onEndOfCandidates);

      filter.add(
        makeEvent(
          'candidate:1 1 udp 2113937151 192.168.101.233 54400 typ host generation 0'
        )
      );
      filter.add(
        makeEvent(
          'candidate:2 1 udp 2113937151 192.168.1.195 54401 typ host generation 0'
        )
      );

      expect(onCandidate).toHaveBeenCalledTimes(2);
    });

    it('drops non-host TCP candidates', () => {
      const filter = new CandidateFilter(true, onCandidate, onEndOfCandidates);

      // TCP srflx — should be dropped
      filter.add(
        makeEvent(
          'candidate:1 1 tcp 1518280447 50.236.171.26 9 typ srflx raddr 192.168.101.233 rport 9 tcptype active'
        )
      );

      expect(onCandidate).not.toHaveBeenCalled();
    });

    it('passes TCP host candidates through (host takes priority)', () => {
      const filter = new CandidateFilter(true, onCandidate, onEndOfCandidates);

      // TCP host — passes through because host candidates always pass
      filter.add(
        makeEvent(
          'candidate:1 1 tcp 1518280447 192.168.101.233 9 typ host tcptype active'
        )
      );

      expect(onCandidate).toHaveBeenCalledTimes(1);
    });

    it('locks to first srflx raddr and drops candidates from other interfaces', () => {
      const filter = new CandidateFilter(true, onCandidate, onEndOfCandidates);

      // Host candidates — always pass through
      filter.add(
        makeEvent(
          'candidate:1 1 udp 2113937151 192.168.101.233 54400 typ host'
        )
      );
      filter.add(
        makeEvent(
          'candidate:2 1 udp 2113937151 192.168.1.195 54401 typ host'
        )
      );

      // First srflx — locks to 192.168.101.233
      filter.add(
        makeEvent(
          'candidate:3 1 udp 1677729535 50.236.171.26 16464 typ srflx raddr 192.168.101.233 rport 16464'
        )
      );

      // Second srflx from different interface — should be DROPPED
      filter.add(
        makeEvent(
          'candidate:4 1 udp 1677729535 50.236.171.26 42084 typ srflx raddr 192.168.1.195 rport 42084'
        )
      );

      // Relay from locked interface — should pass
      filter.add(
        makeEvent(
          'candidate:5 1 udp 33562367 64.16.248.199 51648 typ relay raddr 192.168.101.233 rport 63650'
        )
      );

      // Relay from other interface — should be DROPPED
      filter.add(
        makeEvent(
          'candidate:6 1 udp 33562367 64.16.248.198 55626 typ relay raddr 192.168.1.195 rport 52901'
        )
      );

      filter.add(makeEvent(null));

      // host(2) + srflx from iface1(1) + relay from iface1(1) = 4
      expect(onCandidate).toHaveBeenCalledTimes(4);
      expect(onEndOfCandidates).toHaveBeenCalledTimes(1);

      // Verify the passed candidates
      const passedCandidates = onCandidate.mock.calls.map(
        ([c]) => c.candidate
      );
      expect(passedCandidates).toEqual([
        'candidate:1 1 udp 2113937151 192.168.101.233 54400 typ host',
        'candidate:2 1 udp 2113937151 192.168.1.195 54401 typ host',
        'candidate:3 1 udp 1677729535 50.236.171.26 16464 typ srflx raddr 192.168.101.233 rport 16464',
        'candidate:5 1 udp 33562367 64.16.248.199 51648 typ relay raddr 192.168.101.233 rport 63650',
      ]);
    });

    it('falls back to network-id when raddr is 0.0.0.0', () => {
      const filter = new CandidateFilter(true, onCandidate, onEndOfCandidates);

      // raddr 0.0.0.0 but different network-ids — locks to first
      filter.add(
        makeEvent(
          'candidate:1 1 udp 58597631 64.16.248.194 53163 typ relay raddr 0.0.0.0 rport 0 generation 0 ufrag gHLB network-id 1'
        )
      );
      filter.add(
        makeEvent(
          'candidate:2 1 udp 58466559 64.16.248.194 50398 typ relay raddr 0.0.0.0 rport 0 generation 0 ufrag gHLB network-id 3 network-cost 10'
        )
      );
      filter.add(
        makeEvent(
          'candidate:3 1 udp 25042943 64.16.248.195 63369 typ relay raddr 0.0.0.0 rport 0 generation 0 ufrag gHLB network-id 1'
        )
      );

      // network-id 1 locked, network-id 3 dropped
      expect(onCandidate).toHaveBeenCalledTimes(2);
    });

    it('passes all candidates when raddr is 0.0.0.0 and no network-id', () => {
      const filter = new CandidateFilter(true, onCandidate, onEndOfCandidates);

      filter.add(
        makeEvent(
          'candidate:1 1 udp 1677729535 50.236.171.26 16464 typ srflx raddr 0.0.0.0 rport 0'
        )
      );
      filter.add(
        makeEvent(
          'candidate:2 1 udp 1677729535 50.236.171.26 42084 typ srflx raddr 0.0.0.0 rport 0'
        )
      );

      // No network-id, no raddr — can't filter, pass through
      expect(onCandidate).toHaveBeenCalledTimes(2);
    });

    it('passes candidates with no raddr at all', () => {
      const filter = new CandidateFilter(true, onCandidate, onEndOfCandidates);

      filter.add(
        makeEvent(
          'candidate:1 1 udp 1677729535 50.236.171.26 16464 typ srflx'
        )
      );

      expect(onCandidate).toHaveBeenCalledTimes(1);
    });

    it('resets locked interface on reset()', () => {
      const filter = new CandidateFilter(true, onCandidate, onEndOfCandidates);

      // Lock to interface 1
      filter.add(
        makeEvent(
          'candidate:1 1 udp 1677729535 50.236.171.26 16464 typ srflx raddr 192.168.101.233 rport 16464'
        )
      );

      // Interface 2 should be dropped
      filter.add(
        makeEvent(
          'candidate:2 1 udp 1677729535 50.236.171.26 42084 typ srflx raddr 192.168.1.195 rport 42084'
        )
      );

      expect(onCandidate).toHaveBeenCalledTimes(1);

      // Reset
      filter.reset();
      onCandidate.mockClear();

      // Now interface 2 should be the new lock target
      filter.add(
        makeEvent(
          'candidate:3 1 udp 1677729535 50.236.171.26 42084 typ srflx raddr 192.168.1.195 rport 42084'
        )
      );

      expect(onCandidate).toHaveBeenCalledTimes(1);
    });

    it('handles the exact Careco dual-NIC scenario', () => {
      const filter = new CandidateFilter(true, onCandidate, onEndOfCandidates);

      // Simulates the exact candidate order from the Careco bug report:
      // T+0ms host candidates
      filter.add(
        makeEvent(
          'candidate:1 1 udp 2113937151 192.168.101.233 54400 typ host'
        )
      );
      filter.add(
        makeEvent(
          'candidate:2 1 udp 2113937151 192.168.1.195 54401 typ host'
        )
      );

      // T+24ms first srflx (interface 1) — this locks the filter
      filter.add(
        makeEvent(
          'candidate:3 1 udp 1677729535 50.236.171.26 16464 typ srflx raddr 192.168.101.233 rport 16464'
        )
      );

      // T+180ms more srflx from both interfaces
      filter.add(
        makeEvent(
          'candidate:4 1 udp 1677729535 50.236.171.26 42084 typ srflx raddr 192.168.1.195 rport 42084'
        )
      );
      filter.add(
        makeEvent(
          'candidate:5 1 udp 1677729535 50.236.171.26 28263 typ srflx raddr 192.168.101.233 rport 28263'
        )
      );

      // T+290ms relay candidates from both interfaces
      filter.add(
        makeEvent(
          'candidate:6 1 udp 33562367 64.16.248.199 63650 typ relay raddr 192.168.101.233 rport 63650'
        )
      );
      filter.add(
        makeEvent(
          'candidate:7 1 udp 33562367 64.16.248.199 52901 typ relay raddr 192.168.1.195 rport 52901'
        )
      );
      filter.add(
        makeEvent(
          'candidate:8 1 udp 33562367 64.16.248.198 55626 typ relay raddr 192.168.1.195 rport 55626'
        )
      );

      filter.add(makeEvent(null));

      // Expected: host(2) + iface1 srflx(2) + iface1 relay(1) = 5
      // Dropped: iface2 srflx(1) + iface2 relay(2) = 3
      expect(onCandidate).toHaveBeenCalledTimes(5);
      expect(onEndOfCandidates).toHaveBeenCalledTimes(1);

      // All passed non-host candidates should have raddr 192.168.101.233
      const nonHostPassed = onCandidate.mock.calls
        .map(([c]) => c.candidate)
        .filter((s: string) => !s.includes('typ host'));

      nonHostPassed.forEach((c: string) => {
        expect(c).toContain('raddr 192.168.101.233');
      });
    });

    it('works with single interface (no filtering needed)', () => {
      const filter = new CandidateFilter(true, onCandidate, onEndOfCandidates);

      filter.add(
        makeEvent(
          'candidate:1 1 udp 2113937151 192.168.1.195 54400 typ host'
        )
      );
      filter.add(
        makeEvent(
          'candidate:2 1 udp 1677729535 50.236.171.26 16464 typ srflx raddr 192.168.1.195 rport 16464'
        )
      );
      filter.add(
        makeEvent(
          'candidate:3 1 udp 33562367 64.16.248.199 51648 typ relay raddr 192.168.1.195 rport 63650'
        )
      );
      filter.add(makeEvent(null));

      // All candidates pass — single interface
      expect(onCandidate).toHaveBeenCalledTimes(3);
      expect(onEndOfCandidates).toHaveBeenCalledTimes(1);
    });

    it('filters relay-only candidates by network-id (forceRelay dual-NIC)', () => {
      const filter = new CandidateFilter(true, onCandidate, onEndOfCandidates);

      // Exact scenario from call-report-force-relay-double-network.json
      // All relay, raddr 0.0.0.0, different network-ids
      filter.add(
        makeEvent(
          'candidate:1081149668 1 udp 58597631 64.16.248.194 53163 typ relay raddr 0.0.0.0 rport 0 generation 0 ufrag gHLB network-id 1'
        )
      );
      filter.add(
        makeEvent(
          'candidate:1081149668 1 udp 58466559 64.16.248.194 50398 typ relay raddr 0.0.0.0 rport 0 generation 0 ufrag gHLB network-id 3 network-cost 10'
        )
      );
      filter.add(
        makeEvent(
          'candidate:3651357931 1 udp 25042943 64.16.248.195 63369 typ relay raddr 0.0.0.0 rport 0 generation 0 ufrag gHLB network-id 1'
        )
      );

      filter.add(makeEvent(null));

      // network-id 1 locked (first seen), network-id 3 dropped
      expect(onCandidate).toHaveBeenCalledTimes(2);
      expect(onEndOfCandidates).toHaveBeenCalledTimes(1);

      const passed = onCandidate.mock.calls.map(([c]) => c.candidate);
      passed.forEach((c: string) => {
        expect(c).toContain('network-id 1');
      });
    });

    it('handles empty candidate string in event', () => {
      const filter = new CandidateFilter(true, onCandidate, onEndOfCandidates);

      const event = {
        candidate: { candidate: '' } as RTCIceCandidate,
      } as RTCPeerConnectionIceEvent;

      filter.add(event);

      // Empty candidate string triggers end-of-candidates
      expect(onEndOfCandidates).toHaveBeenCalledTimes(1);
    });
  });

  describe('interface selection by index (number option)', () => {
    it('locks to second interface when singleInterfaceIce: 1', () => {
      const filter = new CandidateFilter(1, onCandidate, onEndOfCandidates);

      // First interface (index 0)
      filter.add(
        makeEvent(
          'candidate:1 1 udp 1677729535 50.236.171.26 16464 typ srflx raddr 192.168.101.233 rport 16464'
        )
      );

      // Second interface (index 1) — this should be locked
      filter.add(
        makeEvent(
          'candidate:2 1 udp 1677729535 50.236.171.26 42084 typ srflx raddr 192.168.1.195 rport 42084'
        )
      );

      // Additional candidate from first interface — should be dropped
      filter.add(
        makeEvent(
          'candidate:3 1 udp 33562367 64.16.248.199 51648 typ relay raddr 192.168.101.233 rport 63650'
        )
      );

      // Additional candidate from second interface — should pass
      filter.add(
        makeEvent(
          'candidate:4 1 udp 33562367 64.16.248.198 55626 typ relay raddr 192.168.1.195 rport 52901'
        )
      );

      filter.add(makeEvent(null));

      // First 2 buffered until index 1 appears, candidate 3 dropped (wrong interface), candidate 4 passes
      expect(onCandidate).toHaveBeenCalledTimes(3);

      const passedCandidates = onCandidate.mock.calls.map(([c]) => c.candidate);
      // Should include 2 from locked interface (index 1): candidate 2 and candidate 4
      expect(passedCandidates.filter((c: string) => c.includes('raddr 192.168.1.195')).length).toBe(2);
    });

    it('locks to third interface when singleInterfaceIce: 2', () => {
      const filter = new CandidateFilter(2, onCandidate, onEndOfCandidates);

      // Three different interfaces
      filter.add(
        makeEvent(
          'candidate:1 1 udp 1677729535 50.236.171.26 16464 typ srflx raddr 192.168.101.233 rport 16464'
        )
      );
      filter.add(
        makeEvent(
          'candidate:2 1 udp 1677729535 50.236.171.26 42084 typ srflx raddr 192.168.1.195 rport 42084'
        )
      );
      filter.add(
        makeEvent(
          'candidate:3 1 udp 1677729535 50.236.171.26 28263 typ srflx raddr 10.0.0.5 rport 28263'
        )
      );

      // Fourth candidate from interface 0 — should be dropped after lock
      filter.add(
        makeEvent(
          'candidate:4 1 udp 33562367 64.16.248.199 51648 typ relay raddr 192.168.101.233 rport 63650'
        )
      );

      filter.add(makeEvent(null));

      // First 3 buffered until index 2 appears, candidate 4 dropped (wrong interface)
      expect(onCandidate).toHaveBeenCalledTimes(3);
    });

    it('falls back to first interface when requested index is out of range', () => {
      const filter = new CandidateFilter(5, onCandidate, onEndOfCandidates);

      // Only two interfaces available
      filter.add(
        makeEvent(
          'candidate:1 1 udp 1677729535 50.236.171.26 16464 typ srflx raddr 192.168.101.233 rport 16464'
        )
      );
      filter.add(
        makeEvent(
          'candidate:2 1 udp 1677729535 50.236.171.26 42084 typ srflx raddr 192.168.1.195 rport 42084'
        )
      );

      // Third candidate from interface 1 — should pass after fallback
      filter.add(
        makeEvent(
          'candidate:3 1 udp 33562367 64.16.248.198 55626 typ relay raddr 192.168.1.195 rport 52901'
        )
      );

      filter.add(makeEvent(null));

      // All pass (2 initial + 1 after lock), but locked to first interface
      expect(onCandidate).toHaveBeenCalledTimes(3);
    });

    it('singleInterfaceIce: 0 behaves like singleInterfaceIce: true', () => {
      const filterTrue = new CandidateFilter(true, onCandidate, onEndOfCandidates);
      const filterZero = new CandidateFilter(0, jest.fn(), jest.fn());

      // Both should lock to first interface
      filterTrue.add(
        makeEvent(
          'candidate:1 1 udp 1677729535 50.236.171.26 16464 typ srflx raddr 192.168.101.233 rport 16464'
        )
      );
      filterZero.add(
        makeEvent(
          'candidate:1 1 udp 1677729535 50.236.171.26 16464 typ srflx raddr 192.168.101.233 rport 16464'
        )
      );

      // Second interface should be dropped by both
      filterTrue.add(
        makeEvent(
          'candidate:2 1 udp 1677729535 50.236.171.26 42084 typ srflx raddr 192.168.1.195 rport 42084'
        )
      );
      filterZero.add(
        makeEvent(
          'candidate:2 1 udp 1677729535 50.236.171.26 42084 typ srflx raddr 192.168.1.195 rport 42084'
        )
      );

      expect(onCandidate).toHaveBeenCalledTimes(1);
    });

    it('works with network-id when raddr is anonymized', () => {
      const filter = new CandidateFilter(1, onCandidate, onEndOfCandidates);

      // Relay-only candidates with anonymized raddr, different network-ids
      filter.add(
        makeEvent(
          'candidate:1 1 udp 58597631 64.16.248.194 53163 typ relay raddr 0.0.0.0 rport 0 network-id 1'
        )
      );
      filter.add(
        makeEvent(
          'candidate:2 1 udp 58466559 64.16.248.194 50398 typ relay raddr 0.0.0.0 rport 0 network-id 3 network-cost 10'
        )
      );
      filter.add(
        makeEvent(
          'candidate:3 1 udp 25042943 64.16.248.195 63369 typ relay raddr 0.0.0.0 rport 0 network-id 1'
        )
      );

      filter.add(makeEvent(null));

      // First 2 buffered until index 1 appears, then candidate 3 dropped (wrong interface)
      expect(onCandidate).toHaveBeenCalledTimes(2);

      // Verify network-id 3 (index 1) was selected
      const passed = onCandidate.mock.calls.map(([c]) => c.candidate);
      expect(passed.filter((c: string) => c.includes('network-id 3')).length).toBe(1);
    });
  });
});
