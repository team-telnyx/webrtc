export default class SendResult {

  public successful: boolean
  public messageId: string
  public errors: string[] = []

  constructor(protected result: { code: string, message: string, message_id: string }) {
    this.successful = result.code && result.code === '200'
    this.messageId = result.message_id
  }

}
