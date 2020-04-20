import { BaseComponent } from './BaseComponent'
import { Execute } from '../../../messages/Blade'
import { StopResult } from '../results'

export abstract class Controllable extends BaseComponent {

  private async _execute(method: string) {
    try {
      const msg = new Execute({
        protocol: this.call.relayInstance.session.relayProtocol,
        method,
        params: {
          node_id: this.call.nodeId,
          call_id: this.call.id,
          control_id: this.controlId
        }
      })
      return await this.call._execute(msg)
    } catch (error) {
      return error
    }
  }

  async stop(): Promise<StopResult> {
    const result = await this._execute(`${this.method}.stop`)
    return new StopResult(result)
  }

  async pause(): Promise<boolean> {
    const { code } = await this._execute(`${this.method}.pause`)
    return code === '200'
  }

  async resume(): Promise<boolean> {
    const { code } = await this._execute(`${this.method}.resume`)
    return code === '200'
  }

  async volume(value: number): Promise<boolean> {
    try {
      const msg = new Execute({
        protocol: this.call.relayInstance.session.relayProtocol,
        method: `${this.method}.volume`,
        params: {
          node_id: this.call.nodeId,
          call_id: this.call.id,
          control_id: this.controlId,
          volume: value
        }
      })
      await this.call._execute(msg)
      return true
    } catch (error) {
      return false
    }
  }
}
