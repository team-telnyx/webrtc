import { BaseAction } from './BaseAction'
import { SendDigits } from '../components/SendDigits'
import { SendDigitsResult } from '../results/SendDigitsResult'

export class SendDigitsAction extends BaseAction {

  constructor(public component: SendDigits) {
    super(component)
  }

  get result(): SendDigitsResult {
    return new SendDigitsResult(this.component)
  }

}
