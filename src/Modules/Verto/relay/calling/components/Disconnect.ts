import { BaseComponent } from './BaseComponent'
import { CallNotification, CallConnectState, CallMethod } from '../../../util/constants/relay'
import Event from '../Event'

export class Disconnect extends BaseComponent {
  public eventType: string = CallNotification.Connect
  public method: string = CallMethod.Disconnect
  public controlId: string = this.call.tag

  get payload(): any {
    return {
      node_id: this.call.nodeId,
      call_id: this.call.id
    }
  }

  notificationHandler(params: any): void {
    this.state = params.connect_state

    this.completed = this.state !== CallConnectState.Connecting
    if (this.completed) {
      this.successful = this.state === CallConnectState.Disconnected
      this.event = new Event(this.state, params)
    }

    if (this._hasBlocker() && this._eventsToWait.includes(this.state)) {
      this.blocker.resolve()
    }
  }
}
