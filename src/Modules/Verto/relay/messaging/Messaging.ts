import logger from '../../util/logger'
import { trigger } from '../../services/Handler'
import { MessageNotification } from '../../util/constants/relay'
import Relay from '../Relay'
import { Execute } from '../../messages/Blade'
import SendResult from './SendResult'
import Message from './Message'

export default class Messaging extends Relay {
  protected service: string = 'messaging'

  notificationHandler(notification: any) {
    const { event_type, params, context } = notification
    const message = new Message(params)
    switch (event_type) {
      case MessageNotification.State: {
        logger.info(`Relay message '${message.id}' changes state to '${message.state}'`)
        return trigger(this.session.relayProtocol, message, this._ctxStateUniqueId(context))
      }
      case MessageNotification.Receive: {
        logger.info(`New Relay ${message.direction} message in context '${context}'`)
        return trigger(this.session.relayProtocol, message, this._ctxReceiveUniqueId(context))
      }
    }
  }

  async send(params: any): Promise<SendResult> {
    const { from = '', to = '' } = params
    params.from_number = from
    params.to_number = to
    delete params.from
    delete params.to
    const msg = new Execute({
      protocol: this.session.relayProtocol,
      method: 'messaging.send',
      params
    })

    const response: any = await this.session.execute(msg).catch(error => error)
    logger.debug('Send message response', response)
    return new SendResult(response)
  }
}
