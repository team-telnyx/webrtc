import Call from '../Call'
import { BaseFax } from './BaseFax'
import { CallMethod } from '../../../util/constants/relay'

export class FaxSend extends BaseFax {
  public method: string = CallMethod.SendFax

  constructor(
    public call: Call,
    private _document: string,
    private _identity: string = null,
    private _header: string = null
  ) {
    super(call)
  }

  get payload(): any {
    const payload: any = {
      node_id: this.call.nodeId,
      call_id: this.call.id,
      control_id: this.controlId,
      document: this._document
    }
    if (this._identity) {
      payload.identity = this._identity
    }
    if (this._header) {
      payload.header_info = this._header
    }
    return payload
  }
}
