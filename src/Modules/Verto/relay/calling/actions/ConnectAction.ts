import { BaseAction } from './BaseAction'
import { Connect } from '../components/Connect'
import { ConnectResult } from '../results/ConnectResult'

export class ConnectAction extends BaseAction {

  constructor(public component: Connect) {
    super(component)
  }

  get result(): ConnectResult {
    return new ConnectResult(this.component)
  }
}
