import { trigger } from '../../services/Handler'
import logger from '../../util/logger'
import Relay from '../Relay'

export default class Tasking extends Relay {
  protected service: string = 'tasking'

  notificationHandler(notification: any) {
    const { context, message } = notification
    logger.info(`Receive task in context: ${context}`)
    trigger(this.session.relayProtocol, message, this._ctxReceiveUniqueId(context))
  }
}
