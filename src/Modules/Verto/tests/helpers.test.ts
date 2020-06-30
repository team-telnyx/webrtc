import { ITelnyxRTCOptions } from '../util/interfaces';
import { objEmpty, mutateLiveArrayData, safeParseJson, isDefined, checkWebSocketHost, destructResponse, isValidOptions } from '../util/helpers'

describe('Helpers functions', () => {
  describe('objEmpty', () => {
    it('should return true if object has no values', () => {
      const tmp = { test: 1234 }
      expect(objEmpty(tmp)).toEqual(false)

      const tmp1 = {}
      expect(objEmpty(tmp1)).toEqual(true)
    })
  })

  describe('mutateLiveArrayData', () => {
    it('should filter data from liveArray', () => {
      const data = JSON.parse('["0067","email@domain.com","Js Client Test","opus@48000","{\\"audio\\":{\\"muted\\":false,\\"deaf\\":false,\\"onHold\\":false,\\"talking\\":true,\\"floor\\":true,\\"energyScore\\":1159},\\"video\\":{\\"visible\\":true,\\"videoOnly\\":false,\\"avatarPresented\\":false,\\"mediaFlow\\":\\"sendRecv\\",\\"muted\\":false,\\"floor\\":true,\\"reservationID\\":null,\\"roleID\\":null,\\"videoLayerID\\":1},\\"oldStatus\\":\\"TALKING (FLOOR) VIDEO (FLOOR)\\"}",{"email":"email","avatar":"avatar"},null]')
      const media = JSON.parse('{"audio":{"muted":false,"deaf":false,"onHold":false,"talking":true,"floor":true,"energyScore":1159},"video":{"visible":true,"videoOnly":false,"avatarPresented":false,"mediaFlow":"sendRecv","muted":false,"floor":true,"reservationId":null,"roleId":null,"videoLayerId":1},"oldStatus":"TALKING (FLOOR) VIDEO (FLOOR)"}')
      expect(mutateLiveArrayData(data)).toMatchObject({ participantId: 67, participantNumber: 'email@domain.com', participantName: 'Js Client Test', codec: 'opus@48000', media, participantData: { email: 'email', avatar: 'avatar' } })
    })
  })

  describe('safeParseJson', () => {
    it('should parse a valid JSON string', () => {
      const jsonString = '{"jsonrpc":"2.0","id":"fb5daf53-14f9-4972-8ece-310824054da8","method":"blade.execute"}'
      expect(safeParseJson(jsonString)).toMatchObject({ jsonrpc: '2.0', id: 'fb5daf53-14f9-4972-8ece-310824054da8', method: 'blade.execute' })
    })

    it('return the input parameter if its not a string', () => {
      const obj = { jsonrpc: '2.0', id: 'fb5daf53-14f9-4972-8ece-310824054da8', method: 'blade.execute' }
      // @ts-ignore
      expect(safeParseJson(obj)).toMatchObject({ jsonrpc: '2.0', id: 'fb5daf53-14f9-4972-8ece-310824054da8', method: 'blade.execute' })
      // @ts-ignore
      expect(safeParseJson(null)).toEqual(null)
      // @ts-ignore
      expect(safeParseJson(true)).toEqual(true)
    })
  })

  describe('isDefined', () => {
    it('should return true if the variable is defined', () => {
      const obj = { key: 'value' }
      expect(isDefined(obj.key)).toEqual(true)
    })

    it('should return false if the variable is undefined', () => {
      const obj = { key: 'value' }
      // @ts-ignore
      expect(isDefined(obj.key2)).toEqual(false)
      expect(isDefined(undefined)).toEqual(false)
      delete obj.key
      expect(isDefined(obj.key)).toEqual(false)
    })
  })

  describe('checkWebSocketHost()', () => {

    describe('on a telnyx space', () => {
      it('should add wss protocol and suffix if not present', () => {
        expect(checkWebSocketHost('example.telnyx.com')).toEqual('wss://example.telnyx.com')
      })

      it('should dont add suffix if its already specified', () => {
        const hostOk = 'wss://example.telnyx.com:9999/something/else'
        expect(checkWebSocketHost('example.telnyx.com:9999/something/else')).toEqual(hostOk)
        expect(checkWebSocketHost(hostOk)).toEqual(hostOk)
      })

      it('should do nothing with protocol and suffix already specified', () => {
        expect(checkWebSocketHost('ws://example.telnyx.com:8888')).toEqual('ws://example.telnyx.com:8888')
      })
    })

    describe('on an host that is not a telnyx space', () => {
      it('should add wss protocol if not present', () => {
        expect(checkWebSocketHost('example.com')).toEqual('wss://example.com')
        expect(checkWebSocketHost('test.example.com:8082')).toEqual('wss://test.example.com:8082')
      })

      it('should do nothing if protocol is already present', () => {
        expect(checkWebSocketHost('ws://example.com')).toEqual('ws://example.com')
        expect(checkWebSocketHost('wss://test.example.com:8082')).toEqual('wss://test.example.com:8082')
      })
    })

  })

  describe('destructResponse()', () => {
    it('should handle normal json-rpc result', () => {
      const msg = JSON.parse('{"jsonrpc":"2.0","id":"123","result":{"message":"CALL CREATED","callID":"call-id","sessid":"sid"}}')
      expect(destructResponse(msg)).toEqual({ result: msg.result })
    })

    it('should handle normal json-rpc error', () => {
      const msg = JSON.parse('{"jsonrpc":"2.0","id":"123","error":{"message":"Random Error","callID":"call-id","code":"123"}}')
      expect(destructResponse(msg)).toEqual({ error: msg.error })
    })

    it('should handle blade.execute result', () => {
      const msg = JSON.parse('{"jsonrpc":"2.0","id":"uuid","result":{"requester_nodeid":"req-id","responder_nodeid":"res-id","result":{"code":"200","message":"Playing","call_id":"call-id"}}}')
      expect(destructResponse(msg)).toEqual({ result: { code: '200', message: 'Playing', call_id: 'call-id' } })
    })

    it('should handle blade.execute result', () => {
      const msg = JSON.parse('{"jsonrpc":"2.0","id":"uuid","error":{"requester_nodeid":"req-id","responder_nodeid":"res-id","code":-32601,"message":"msg"}}')
      expect(destructResponse(msg)).toEqual({ error: msg.error })
    })

    it('should handle Verto result over Blade', () => {
      const vertoNoResult = JSON.parse('{"jsonrpc":"2.0","id":"uuid","result":{"requester_nodeid":"req-id","responder_nodeid":"res-id","result":{"code":"200","node_id":"node-id","result":{}}}}')
      expect(destructResponse(vertoNoResult)).toEqual({ result: { node_id: 'node-id' } })

      const vertoResult = JSON.parse('{"jsonrpc":"2.0","id":"uuid","result":{"requester_nodeid":"req-id","responder_nodeid":"res-id","result":{"code":"200","node_id":"node-id","result":{"jsonrpc":"2.0","id":"verto-uuid","result":{"message":"CALL CREATED","callID":"call-id"}}}}}')
      expect(destructResponse(vertoResult)).toEqual({ result: { message: 'CALL CREATED', callID: 'call-id', node_id: 'node-id' } })
    })

    it('should handle Verto error over Blade', () => {
      const msg = JSON.parse('{"jsonrpc":"2.0","id":"uuid","result":{"requester_nodeid":"req-id","responder_nodeid":"res-id","result":{"code":"200","node_id":"node-id","result":{"jsonrpc":"2.0","id":"123","error":{"message":"Random Error","callID":"call-id","code":"123"}}}}}')
      expect(destructResponse(msg)).toEqual({ error: { code: '123', message: 'Random Error', callID: 'call-id' } })
    })
  })
  describe('isValidOptions()', () => {
    it("should return false if is a empty object", () => {
      const options: ITelnyxRTCOptions = {}
      expect(isValidOptions(options)).toBeFalsy();
    })
    it("should return false if none of options is provided", () => {
      const options: ITelnyxRTCOptions = {
        login: "",
        password: "",
        passwd: "",
        login_token: ""
      }
      expect(isValidOptions(options)).toBeFalsy();
    })
    it("should return true if login and password is provided", () => {
      const options: ITelnyxRTCOptions = {
        login: "deivid",
        password: "test",
      }
      expect(isValidOptions(options)).toBeTruthy();
    })
    it("should return true if login and passwd is provided", () => {
      const options: ITelnyxRTCOptions = {
        login: "deivid",
        passwd: "test",
      }
      expect(isValidOptions(options)).toBeTruthy();
    })
    it("should return true if only login_token is provided", () => {
      const options: ITelnyxRTCOptions = {
        login_token: "asdfkasdf1243123njn123oi4n"
      }
      expect(isValidOptions(options)).toBeTruthy();
    })
  })
})
