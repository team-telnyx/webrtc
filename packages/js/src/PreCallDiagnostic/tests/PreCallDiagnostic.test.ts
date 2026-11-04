/* eslint-disable @typescript-eslint/no-explicit-any */
import { PreCallDiagnostic } from '../PreCallDiagnostic';

describe('PreCallDiagnostic', () => {
  const createClient = (call: any) => ({
    on: jest.fn(),
    off: jest.fn(),
    newCall: jest.fn(() => call),
  });

  // A call that has already ended, so the run stops at call setup and goes
  // straight to cleanup.
  const createEndedCall = () => ({
    id: 'diagnostic-call',
    state: 'destroy',
    hangup: jest.fn().mockResolvedValue(undefined),
  });

  it('hangs up the diagnostic call with initiator sdk:precall-diagnostic', async () => {
    const call = createEndedCall();
    const diagnostic = new PreCallDiagnostic({
      client: createClient(call),
      destinationNumber: 'echo',
    } as any);

    await diagnostic.run();

    expect(call.hangup).toHaveBeenCalledTimes(1);
    expect(call.hangup).toHaveBeenCalledWith({
      initiator: 'sdk:precall-diagnostic',
    });
  });

  it('does not hang up the diagnostic call when autoHangup is false', async () => {
    const call = createEndedCall();
    const diagnostic = new PreCallDiagnostic({
      client: createClient(call),
      destinationNumber: 'echo',
      autoHangup: false,
    } as any);

    await diagnostic.run();

    expect(call.hangup).not.toHaveBeenCalled();
  });
});
