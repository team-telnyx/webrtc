import { BaseComponent } from '../components/BaseComponent'
import { BaseResult } from '../results/BaseResult'

export abstract class BaseAction {
  constructor(public component: BaseComponent) {}

  abstract get result(): BaseResult

  get controlId(): string {
    return this.component.controlId
  }

  get payload(): any {
    return this.component.payload
  }

  get completed(): boolean {
    return this.component.completed
  }

  get state(): string {
    return this.component.state
  }
}
