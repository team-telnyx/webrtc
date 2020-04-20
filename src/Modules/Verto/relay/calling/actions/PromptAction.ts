import { BaseAction } from './BaseAction'
import { Prompt } from '../components/Prompt'
import { PromptResult } from '../results/PromptResult'
import { PromptVolumeResult } from '../results'

export class PromptAction extends BaseAction {

  constructor(public component: Prompt) {
    super(component)
  }

  get result(): PromptResult {
    return new PromptResult(this.component)
  }

  stop() {
    return this.component.stop()
  }

  async volume(value: number) {
    const res = await this.component.volume(value)
    return new PromptVolumeResult(res)
  }
}
