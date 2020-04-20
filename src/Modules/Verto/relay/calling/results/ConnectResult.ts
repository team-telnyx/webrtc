import { BaseResult } from './BaseResult'
import { Connect } from '../components/Connect'
import Call from '../Call'

export class ConnectResult extends BaseResult {
  constructor(public component: Connect) {
    super(component)
  }

  get call(): Call {
    return this.component.call.peer
  }
}
