import { setAgentName, Connect } from '../messages/blade/Connect'
import { Execute, Subscription, Ping } from '../messages/Blade'
import { Login, Invite, Answer, Bye, Modify, Info, Result } from '../messages/Verto'

describe('Messages', function () {
  describe('BladeConnect', function () {
    const auth = { project: 'project', token: 'token' }
    it('should match struct without sessionId', function () {
      const message = new Connect(auth).request
      const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","method":"blade.connect","params":{"authentication":{"project":"project","token":"token"},"version":{"major":2,"minor":1,"revision":0}}}`)
      expect(message).toEqual(res)
    })
    it('should match struct with sessionId', function () {
      const sessionId = '5c26c8d1-adcc-4b46-aa32-d9550022fddc'
      const message = new Connect(auth, sessionId).request
      const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","method":"blade.connect","params":{"authentication":{"project":"project","token":"token"},"version":{"major":2,"minor":1,"revision":0},"sessionid":"${sessionId}"}}`)
      expect(message).toEqual(res)
    })
    it('should match struct with jwt_token', function () {
      const jwtAuth = { project: 'project', jwt_token: 'token' }
      const message = new Connect(jwtAuth).request
      const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","method":"blade.connect","params":{"authentication":{"project":"project","jwt_token":"token"},"version":{"major":2,"minor":1,"revision":0}}}`)
      expect(message).toEqual(res)
    })
    it('should match struct with agent', function () {
      setAgentName('Jest SDK/1.0.0')
      const message = new Connect(auth).request
      const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","method":"blade.connect","params":{"authentication":{"project":"project","token":"token"},"version":{"major":2,"minor":1,"revision":0},"agent":"Jest SDK/1.0.0"}}`)
      expect(message).toEqual(res)
    })
  })

  describe('BladeExecute', function () {
    it('Request should match struct', function () {
      const params = {
        requester_nodeid: 'S1',
        responder_nodeid: 'S2',
        protocol: 'myprot',
        method: 'sayHello',
        params: { name: 'Joe' }
      }
      const message = new Execute(params).request
      const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","method":"blade.execute","params":{"requester_nodeid":"S1","responder_nodeid":"S2","protocol":"myprot","method":"sayHello","params":{"name":"Joe"}}}`)
      expect(message).toEqual(res)
    })
    it('Response should match struct', function () {
      const params = {
        requester_nodeid: 'S1',
        responder_nodeid: 'S2',
        protocol: 'myprot',
        result: { msg: 'Hello Joe!' }
      }
      const message = new Execute(params).request
      const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","result":{"requester_nodeid":"S1","responder_nodeid":"S2","protocol":"myprot","result":{"msg":"Hello Joe!"}}}`)
      expect(message).toEqual(res)
    })
  })

  describe('BladeSubscription', function () {
    describe('Add', function () {
      it('should match struct', function () {
        const message = new Subscription({
          command: 'add',
          protocol: 'myprotocol',
          channels: ['myprotocol.channel']
        }).request
        const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","method":"blade.subscription","params":{"command":"add","protocol":"myprotocol","channels":["myprotocol.channel"]}}`)
        expect(message).toEqual(res)
      })
    })
  })

  describe('Verto', function () {
    describe('Login', function () {
      it('should match struct', function () {
        const message = new Login('login', 'password', null).request
        const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","method":"login","params":{"login":"login","passwd":"password","loginParams":{},"userVariables":{}}}`)
        expect(message).toEqual(res)
      })

      it('should match struct with sessid', function () {
        const message = new Login('login', 'password', '123456789').request
        const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","method":"login","params":{"login":"login","passwd":"password","sessid":"123456789","loginParams":{},"userVariables":{}}}`)
        expect(message).toEqual(res)
      })
    })

    describe('Invite', function () {
      it('should match struct', function () {
        const message = new Invite({ sessid: '123456789', sdp: '<SDP>', dialogParams: { remoteSdp: '<SDP>', callerId: 'test' } }).request
        const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","method":"telnyx_rtc.invite","params":{"sessid":"123456789","sdp":"<SDP>","dialogParams":{"callerId":"test"}}}`)
        expect(message).toEqual(res)
      })
    })

    describe('Answer', function () {
      it('should match struct', function () {
        const message = new Answer({ sessid: '123456789', sdp: '<SDP>', dialogParams: { remoteSdp: '<SDP>', callerId: 'test' } }).request
        const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","method":"telnyx_rtc.answer","params":{"sessid":"123456789","sdp":"<SDP>","dialogParams":{"callerId":"test"}}}`)
        expect(message).toEqual(res)
      })
    })

    describe('Bye', function () {
      it('should match struct', function () {
        const message = new Bye({ sessid: '123456789', dialogParams: { remoteSdp: '<SDP>', callerId: 'test' } }).request
        const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","method":"telnyx_rtc.bye","params":{"sessid":"123456789","dialogParams":{"callerId":"test"}}}`)
        expect(message).toEqual(res)
      })
    })

    describe('Modify', function () {
      it('should match struct', function () {
        const message = new Modify({ sessid: '123456789', action: 'hold', dialogParams: { remoteSdp: '<SDP>', callerId: 'test' } }).request
        const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","method":"telnyx_rtc.modify","params":{"sessid":"123456789","action":"hold","dialogParams":{"callerId":"test"}}}`)
        expect(message).toEqual(res)
      })
    })

    describe('Info', function () {
      it('should match struct', function () {
        const message = new Info({ sessid: '123456789', dtmf: '0', dialogParams: { remoteSdp: '<SDP>', callerId: 'test' } }).request
        const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","method":"telnyx_rtc.info","params":{"sessid":"123456789","dtmf":"0","dialogParams":{"callerId":"test"}}}`)
        expect(message).toEqual(res)
      })
    })

  })

  describe('BladePing', () => {
    it('should match the struct', () => {
      const message = new Ping().request
      const res = JSON.parse(`{"jsonrpc":"2.0","id":"${message.id}","method":"blade.ping","params":{}}`)
      expect(message).toEqual(res)
    })
  })
})
