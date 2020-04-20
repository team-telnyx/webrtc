import { BaseComponent } from './BaseComponent'
import { CallNotification, CallState, CallMethod } from '../../../util/constants/relay'
import Call from '../Call'
import Event from '../Event'

export class Hangup extends BaseComponent {
  public eventType: string = CallNotification.State
  public method: string = CallMethod.End
  public controlId: string = this.call.tag

  constructor(public call: Call, public reason: string) {
    super(call)
  }

  get payload(): any {
    return {
      node_id: this.call.nodeId,
      call_id: this.call.id,
      reason: this.reason
    }
  }

  notificationHandler(params: any): void {
    const { call_state, end_reason } = params
    this.state = call_state

    this.completed = this.state === CallState.Ended
    if (this.completed) {
      this.successful = true
      this.reason = end_reason
      this.event = new Event(this.state, params)
    }

    if (this._hasBlocker() && this._eventsToWait.includes(this.state)) {
      this.reason = end_reason
      this.blocker.resolve()
    }
  }
}
