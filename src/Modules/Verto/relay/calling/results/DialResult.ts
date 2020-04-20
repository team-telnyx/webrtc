import { BaseResult } from './BaseResult'
import { Dial } from '../components/Dial'
import Call from '../Call'

export class DialResult extends BaseResult {
  constructor(public component: Dial) {
    super(component)
  }

  get call(): Call {
    return this.component.call
  }
}
