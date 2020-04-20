import { BaseComponent } from './BaseComponent'
import { DeepArray, ICallDevice, IRelayCallingPlay } from '../../../util/interfaces'
import { CallNotification, CallConnectState, CallMethod } from '../../../util/constants/relay'
import Call from '../Call'
import Event from '../Event'

export class Connect extends BaseComponent {
  public eventType: string = CallNotification.Connect
  public method: string = CallMethod.Connect
  public controlId: string = this.call.tag

  constructor(
    public call: Call,
    public devices: DeepArray<ICallDevice>,
    public ringback?: IRelayCallingPlay
  ) {
    super(call)
  }

  get payload(): any {
    const tmp: any = {
      node_id: this.call.nodeId,
      call_id: this.call.id,
      devices: this.devices
    }
    if (this.ringback) {
      tmp.ringback = this.ringback
    }
    return tmp
  }

  notificationHandler(params: any): void {
    this.state = params.connect_state

    this.completed = this.state !== CallConnectState.Connecting
    if (this.completed) {
      this.successful = this.state === CallConnectState.Connected
      this.event = new Event(this.state, params)
    }

    if (this._hasBlocker() && this._eventsToWait.includes(this.state)) {
      this.blocker.resolve()
    }
  }
}
