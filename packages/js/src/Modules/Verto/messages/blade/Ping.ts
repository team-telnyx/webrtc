import BaseMessage from '../BaseMessage'

class Ping extends BaseMessage {
  method: string = 'blade.ping'

  constructor() {
    super()
    this.buildRequest({ method: this.method, params: {} })
  }
}

export { Ping }
