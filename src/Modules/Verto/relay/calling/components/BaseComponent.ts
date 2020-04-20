import { v4 as uuidv4 } from 'uuid'
import { Execute } from '../../../messages/Blade'
import Call from '../Call'
import Blocker from '../Blocker'
import Event from '../Event'

export abstract class BaseComponent {

  /** Type of Relay events to handle. state|play|collect|record|connect */
  public abstract eventType: string

  /** ControlId to identify the component among the notifications */
  public abstract controlId: string = uuidv4()

  /** Blocker to wait some evens */
  public blocker: Blocker

  /** Current component state */
  public state: string

  /** Whether the component has complete the execution */
  public completed: boolean = false

  /** Whether the component has finished successfully */
  public successful: boolean = false

  /** The final event of the component */
  public event: Event

  /** Relay response of the first execute. (200/400/500) */
  protected _executeResult: any

  /** Array of events to wait to resolve the Blocker */
  protected _eventsToWait: string[] = []

  constructor(public call: Call) {
  }

  /** Relay method to execute */
  abstract method: string = null

  /** Payload sent to Relay in requests */
  abstract get payload(): any

  /** Execute message and return the Relay response */
  async execute(): Promise<any> {
    if (this.call.ended) {
      return this.terminate()
    }
    if (!this.method) {
      return null
    }
    const msg = new Execute({
      protocol: this.call.relayInstance.session.relayProtocol,
      method: this.method,
      params: this.payload
    })

    this._executeResult = await this.call._execute(msg).catch(error => {
      this.terminate()
      return error
    })

    return this._executeResult
  }

  /**
   * Handle Relay notification to update the component
   *
   * @param params Relay notification params
   */
  abstract notificationHandler(params: any): void

  async _waitFor(...events: string[]): Promise<any> {
    this._eventsToWait = events
    this.blocker = new Blocker(this.eventType, this.controlId)

    await this.execute()

    return this.blocker.promise
  }

  terminate(params: any = {}): void {
    this.completed = true
    this.successful = false
    this.state = 'failed'
    const { call_state } = params
    if (call_state) {
      this.event = new Event(call_state, params)
    }
    if (this._hasBlocker()) {
      this.blocker.resolve()
    }
  }

  protected _hasBlocker(): boolean {
    return this.blocker instanceof Blocker
  }
}
