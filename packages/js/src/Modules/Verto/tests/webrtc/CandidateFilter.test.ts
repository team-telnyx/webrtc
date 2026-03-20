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
});
