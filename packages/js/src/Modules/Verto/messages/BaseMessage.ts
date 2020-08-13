import { v4 as uuidv4 } from 'uuid'

abstract class BaseMessage {
  protected method: string
  public request: any
  public response: any
  public targetNodeId: string

  buildRequest(params: any) {
    this.request = { ...{ jsonrpc: '2.0', id: uuidv4() }, ...params }
  }
}

export default BaseMessage
