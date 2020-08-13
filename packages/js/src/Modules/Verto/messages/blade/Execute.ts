import BaseMessage from '../BaseMessage'
import { IBladeExecuteRequest, IBladeExecuteResult } from '../../util/interfaces'

class Execute extends BaseMessage {
  method: string = 'blade.execute'

  constructor(params: any, id: string = '') {
    super()

    let tmp: { id?: string, method?: string, params?: IBladeExecuteRequest, result?: IBladeExecuteResult }
    // Is a result or a request? Key 'result' vs 'params'
    if (params.hasOwnProperty('result')) {
      tmp = { result: params }
    } else { // ..request needs method property
      tmp = { method: this.method, params }
    }
    if (id) {
      tmp.id = id
    }

    this.buildRequest(tmp)
  }
}

export { Execute }
