import { BaseResult } from './BaseResult'
import { Record } from '../components/Record'

export class RecordResult extends BaseResult {
  constructor(public component: Record) {
    super(component)
  }

  get url(): string {
    return this.component.url
  }

  get duration(): number {
    return this.component.duration
  }

  get size(): number {
    return this.component.size
  }
}
