import { BaseResult } from './BaseResult'
import { BaseFax } from '../components/BaseFax'

export class FaxResult extends BaseResult {
  constructor(public component: BaseFax) {
    super(component)
  }

  get direction(): string {
    return this.component.direction
  }

  get identity(): string {
    return this.component.identity
  }

  get remoteIdentity(): string {
    return this.component.remoteIdentity
  }

  get document(): string {
    return this.component.document
  }

  get pages(): number {
    return this.component.pages
  }
}
