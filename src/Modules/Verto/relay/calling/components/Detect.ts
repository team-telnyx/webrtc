import { Controllable } from './Controllable'
import { IRelayCallingDetect } from '../../../util/interfaces'
import { CallNotification, CallDetectState, CallDetectType, CallMethod } from '../../../util/constants/relay'
import Call from '../Call'
import Event from '../Event'

const _finishedEvents: string[] = [CallDetectState.Error, CallDetectState.Finished]
const _machineStateEvents: string[] = [CallDetectState.Ready, CallDetectState.NotReady]

export class Detect extends Controllable {
  public eventType: string = CallNotification.Detect
  public method: string = CallMethod.Detect
  public controlId: string = this.controlId

  public type: string
  public result: string

  private _events: string[] = []
  private _waitingForReady: boolean = false

  constructor(
    public call: Call,
    private _detect: IRelayCallingDetect,
    private _timeout: number = null,
    private _waitForBeep: boolean = false
  ) {
    super(call)
  }

  get payload(): any {
    const { params } = this._detect
    this._detect.params = params || {}
    const payload: any = {
      node_id: this.call.nodeId,
      call_id: this.call.id,
      control_id: this.controlId,
      detect: this._detect
    }
    if (this._timeout) {
      payload.timeout = this._timeout
    }
    return payload
  }

  notificationHandler(params: any): void {
    const { detect } = params
    const { type, params: { event } } = detect

    this.type = type
    this.state = event

    if (_finishedEvents.includes(event)) {
      return this._complete(detect)
    }

    if (!this._hasBlocker()) {
      this._events.push(this.state)
      return
    }

    if (this.type === CallDetectType.Digit) {
      return this._complete(detect)
    }

    if (this._waitingForReady) {
      if (event === CallDetectState.Ready) {
        return this._complete(detect)
      }
      return
    }

    if (this._waitForBeep && event === CallDetectState.Machine) {
      this._waitingForReady = true
      return
    }

    if (this._eventsToWait.includes(this.state)) {
      return this._complete(detect)
    }
  }

  private _complete(detect: { type: string, params: any }): void {
    this.completed = true
    this.event = new Event(this.state, detect)
    if (this._hasBlocker()) {
      this.successful = !_finishedEvents.includes(this.state)
      if (_machineStateEvents.includes(this.state)) {
        this.result = CallDetectState.Machine
      } else if (this.successful) {
        this.result = this.state
      }
      this.blocker.resolve()
    } else {
      this.result = this._events.join(',')
      this.successful = this.state !== CallDetectState.Error
    }
  }
}
