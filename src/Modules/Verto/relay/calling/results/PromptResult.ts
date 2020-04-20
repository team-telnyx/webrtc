import { BaseResult } from './BaseResult'
import { Prompt } from '../components/Prompt'

export class PromptResult extends BaseResult {
  constructor(public component: Prompt) {
    super(component)
  }

  get type(): string {
    return this.component.type
  }

  get result(): string {
    return this.component.input
  }

  get terminator(): string {
    return this.component.terminator
  }

  get confidence(): number {
    return this.component.confidence
  }
}
