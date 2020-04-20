import { Controllable } from './Controllable'
import { IRelayCallingPlay } from '../../../util/interfaces'
import { CallNotification, CallPlayState, CallMethod } from '../../../util/constants/relay'
import Call from '../Call'
import Event from '../Event'

export class Play extends Controllable {
  public eventType: string = CallNotification.Play
  public method: string = CallMethod.Play
  public controlId: string = this.controlId

  constructor(public call: Call, public play: IRelayCallingPlay[], public volumeValue: number = 0) {
    super(call)
  }

  get payload(): any {
    const tmp: any = {
      node_id: this.call.nodeId,
      call_id: this.call.id,
      control_id: this.controlId,
      play: this.play
    }
    if (this.volumeValue != 0) {
      tmp.volume = +this.volumeValue
    }
    return tmp
  }

  notificationHandler(params: any): void {
    this.state = params.state

    this.completed = this.state !== CallPlayState.Playing
    if (this.completed) {
      this.successful = this.state === CallPlayState.Finished
      this.event = new Event(this.state, params)
    }

    if (this._hasBlocker() && this._eventsToWait.includes(this.state)) {
      this.blocker.resolve()
    }
  }
}
