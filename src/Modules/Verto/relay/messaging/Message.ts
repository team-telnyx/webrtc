import { IMessage, IMessageOptions } from '../../util/interfaces'

export default class Message implements IMessage {
  public id: string
  public state: string
  public context: string
  public from: string
  public to: string
  public body: string
  public direction: string
  public media: string[]
  public segments: number
  public tags: string[]
  public reason: string

  constructor(protected options: IMessageOptions) {
    this.id = options.message_id
    this.state = options.message_state
    this.context = options.context
    this.from = options.from_number
    this.to = options.to_number
    this.body = options.body
    this.direction = options.direction
    this.media = options.media || []
    this.segments = options.segments
    this.tags = options.tags || []
    this.reason = options.reason
  }
}
