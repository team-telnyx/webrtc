import { BaseComponent } from './BaseComponent'
import { CallNotification, CallState, CallMethod } from '../../../util/constants/relay'
import Event from '../Event'

export class Dial extends BaseComponent {
  public eventType: string = CallNotification.State
  public method: string = CallMethod.Begin
  public controlId: string = this.call.tag

  get payload(): any {
    return {
      tag: this.call.tag,
      device: this.call.device
    }
  }

  notificationHandler(params: any): void {
    this.state = params.call_state

    const events: string[] = [CallState.Answered, CallState.Ending, CallState.Ended]
    this.completed = events.includes(this.state)
    if (this.completed) {
      this.successful = this.state === CallState.Answered
      this.event = new Event(this.state, params)
    }

    if (this._hasBlocker() && this._eventsToWait.includes(this.state)) {
      this.blocker.resolve()
    }
  }
}
