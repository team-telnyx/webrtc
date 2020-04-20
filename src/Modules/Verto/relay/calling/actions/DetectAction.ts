import { BaseAction } from './BaseAction'
import { Detect } from '../components'
import { DetectResult } from '../results/DetectResult'

export class DetectAction extends BaseAction {

  constructor(public component: Detect) {
    super(component)
  }

  get result(): DetectResult {
    return new DetectResult(this.component)
  }

  stop() {
    return this.component.stop()
  }
}
