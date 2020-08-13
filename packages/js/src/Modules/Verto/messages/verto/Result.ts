import BaseRequest from './BaseRequest'

class Result extends BaseRequest {
  constructor(id: number, method: string) {
    super()
    this.buildRequest({ id, result: { method } })
  }
}

export { Result }
