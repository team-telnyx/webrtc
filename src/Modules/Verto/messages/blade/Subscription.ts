import BaseMessage from '../BaseMessage'
import { IBladeSubscriptionRequest } from '../../util/interfaces'

class Subscription extends BaseMessage {
  method: string = 'blade.subscription'

  constructor(params: IBladeSubscriptionRequest['params']) {
    super()

    if (params.hasOwnProperty('auto_create') && !params.auto_create) {
      delete params.auto_create
    }
    if (params.hasOwnProperty('downstream') && !params.downstream) {
      delete params.downstream
    }
    this.buildRequest({ method: this.method, params })
  }
}

export { Subscription }
