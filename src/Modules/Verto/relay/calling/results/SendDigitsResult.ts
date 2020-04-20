import { BaseResult } from './BaseResult'
import { SendDigits } from '../components/SendDigits'

export class SendDigitsResult extends BaseResult {
  constructor(public component: SendDigits) {
    super(component)
  }
}
