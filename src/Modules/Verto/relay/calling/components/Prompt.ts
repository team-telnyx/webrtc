import { Controllable } from './Controllable'
import { IRelayCallingPlay, IRelayCallingCollect } from '../../../util/interfaces'
import { CallNotification, CallPromptState, CallMethod } from '../../../util/constants/relay'
import Call from '../Call'
import Event from '../Event'

export class Prompt extends Controllable {
  public eventType: string = CallNotification.Collect
  public method: string = CallMethod.PlayAndCollect
  public controlId: string = this.controlId

  public type: string
  public input: string
  public terminator: string
  public confidence: number

  constructor(
    public call: Call,
    public collect: IRelayCallingCollect,
    public play: IRelayCallingPlay[],
    public volumeValue: number = 0
  ) {
    super(call)
  }

  get payload(): any {
    const tmp: any = {
      node_id: this.call.nodeId,
      call_id: this.call.id,
      control_id: this.controlId,
      play: this.play,
      collect: this.collect
    }
    if (this.volumeValue != 0) {
      tmp.volume = +this.volumeValue
    }
    return tmp
  }

  notificationHandler(params: any): void {
    this.completed = true
    const { result } = params

    this.type = result.type
    this.event = new Event(this.type, result)
    switch (this.type) {
      case CallPromptState.Digit:
        this.state = 'successful'
        this.successful = true
        this.input = result.params.digits
        this.terminator = result.params.terminator
        break
      case CallPromptState.Speech:
        this.state = 'successful'
        this.successful = true
        this.input = result.params.text
        this.confidence = result.params.confidence
        break
      default:
        this.state = this.type
        this.successful = false
    }

    if (this._hasBlocker() && this._eventsToWait.includes(this.type)) {
      this.blocker.resolve()
    }
  }
}
