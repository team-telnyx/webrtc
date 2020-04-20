import { BaseAction } from './BaseAction'
import { BaseFax } from '../components/BaseFax'
import { FaxResult } from '../results/FaxResult'

export class FaxAction extends BaseAction {

  constructor(public component: BaseFax) {
    super(component)
  }

  get result(): FaxResult {
    return new FaxResult(this.component)
  }

  stop() {
    return this.component.stop()
  }
}
