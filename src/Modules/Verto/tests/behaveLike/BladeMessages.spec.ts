import { trigger } from '../../services/Handler'
import { SwEvent } from '../../util/constants'
import { Execute } from '../../messages/Blade'

/**
 * Module to test "blade.xxx" messages in both browser/node following DRY principle.
 */

describe('BladeDisconnect', () => {
  it("should be true", () => {
    expect(true).toEqual(true)
  })
})
const BladeDisconnect = (instance: any) => {
  describe('blade.disconnect', () => {
    beforeAll(async done => {
      await instance.connect()

      const msg = JSON.parse('{"id":"378d7dea-e581-4305-a7e7-d29173797f32","jsonrpc":"2.0","method":"blade.disconnect"}')
      trigger(SwEvent.SocketMessage, msg, instance.uuid)
      done()
    })

    it('should put the session in a idle state', () => {
      expect(instance._idle).toEqual(true)
    })

    it('should queue subsequent requests', () => {
      const be = new Execute({ protocol: 'test', method: 'fake', params: {} })
      instance.execute(be).catch(error => error)
      expect(instance._executeQueue).toHaveLength(1)
      expect(instance._executeQueue[0]).toHaveProperty('msg')
      expect(instance._executeQueue[0]).toHaveProperty('resolve')
    })

    it('should queue subsequent raw requests', () => {
      instance.executeRaw('#TEST')
      expect(instance._executeQueue).toHaveLength(2)
      expect(instance._executeQueue[1]).toHaveProperty('msg')
      expect(instance._executeQueue[1]).not.toHaveProperty('resolve')
    })
  })
}

export {
  BladeDisconnect
}
