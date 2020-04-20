import { BaseComponent } from './BaseComponent'
import { CallNotification } from '../../../util/constants/relay'
import Event from '../Event'

export class Await extends BaseComponent {
  public eventType: string = CallNotification.State
  public method = null
  public controlId: string = this.call.tag

  get payload(): any {
    return null
  }

  notificationHandler(params: any): void {
    const { call_state } = params
    if (this._hasBlocker() && this._eventsToWait.includes(call_state)) {
      this.completed = true
      this.successful = true
      this.event = new Event(call_state, params)

      this.blocker.resolve()
    }
  }
}
