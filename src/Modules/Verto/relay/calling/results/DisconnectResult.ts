import { BaseResult } from './BaseResult'
import { Disconnect } from '../components/Disconnect'

export class DisconnectResult extends BaseResult {
  constructor(public component: Disconnect) {
    super(component)
  }
}
