import { BaseFax } from './BaseFax'
import { CallMethod } from '../../../util/constants/relay'

export class FaxReceive extends BaseFax {
  public method: string = CallMethod.ReceiveFax

  get payload(): any {
    return {
      node_id: this.call.nodeId,
      call_id: this.call.id,
      control_id: this.controlId
    }
  }
}
