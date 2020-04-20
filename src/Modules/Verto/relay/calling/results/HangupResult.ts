import { BaseResult } from './BaseResult'
import { Hangup } from '../components/Hangup'

export class HangupResult extends BaseResult {
  constructor(public component: Hangup) {
    super(component)
  }

  get reason(): string {
    return this.component.reason
  }
}
