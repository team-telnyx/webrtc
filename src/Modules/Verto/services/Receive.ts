import logger from '../util/logger'
import BaseSession from '../BaseSession'
import { Execute } from '../messages/Blade'

const method = 'signalwire.receive'

export default async (session: BaseSession, contexts: string | string[]): Promise<boolean> => {
  if (typeof contexts === 'string') {
    contexts = [contexts]
  }
  contexts = contexts.filter(Boolean)
  if (!contexts.length) {
    logger.error('One or more contexts are required.')
    return false
  }
  contexts = contexts.filter(c => !session.contexts.includes(c))
  if (!contexts.length) {
    return true
  }
  const { relayProtocol: protocol } = session
  const be = new Execute({ protocol, method, params: { contexts } })
  const response = await session.execute(be).catch(error => {
    logger.error(`Error registering contexts: [${error.code}] ${error.message}`)
    return null
  })
  if (response === null) {
    return false
  }
  logger.info(response.message)
  session.contexts = session.contexts.concat(contexts)

  return true
}
