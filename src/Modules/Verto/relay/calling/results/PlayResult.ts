import { BaseResult } from './BaseResult'
import { Play } from '../components/Play'

export class PlayResult extends BaseResult {
  constructor(public component: Play) {
    super(component)
  }
}
