import BrowserSession from '../../BrowserSession'
import { MCULayoutEventHandler } from '../../webrtc/LayoutHandler'
import Call from '../../webrtc/Call'

export default (klass: any) => {
  const CALL_PARAMS = { id: 'c1d19df5-5cdf-439a-9678-079549a43f40', destinationNumber: 'x3599', remoteCallerName: 'Js Client Test', remoteCallerNumber: '1234', callerName: 'Jest Client', callerNumber: '5678' }
  describe('MCULayoutEventHandler', () => {
    let instance: BrowserSession
    let call: Call
    const onNotification = jest.fn()

    beforeEach(() => {
      instance = new klass({ host: 'example.signalwire.com', login: 'login', password: 'password', project: 'project', token: 'token' })
      call = new Call(instance, CALL_PARAMS)
      onNotification.mockClear()
      instance.off('signalwire.notification')
      instance.on('signalwire.notification', onNotification)
    })

    describe('with 1-3 participants', () => {
      it('should handle layout-info for 1 people', () => {
        const eventData = JSON.parse(`{"contentType":"layout-info","canvasType":"mcu-personal-canvas","callID":"${CALL_PARAMS.id}","canvasInfo":{"canvasID":-1,"totalLayers":1,"layersUsed":0,"layoutFloorID":0,"layoutName":"1x1","canvasLayouts":[{"x":0,"y":0,"scale":360,"hscale":360,"scale":360,"zoom":0,"border":0,"floor":1,"overlap":0,"screenWidth":1920,"screenHeight":1080,"xPOS":0,"yPOS":0,"resID":"","audioPOS":"","memberID":105}],"scale":360}}`)
        MCULayoutEventHandler(instance, eventData)
        const canvasInfo = JSON.parse(`{"canvasId":-1,"totalLayers":1,"layersUsed":0,"layoutFloorId":0,"layoutName":"1x1","canvasLayouts":[{"x":0,"y":0,"scale":360,"hscale":360,"scale":360,"zoom":0,"border":0,"floor":1,"overlap":0,"screenWidth":1920,"screenHeight":1080,"xPos":0,"yPos":0,"resId":"","audioPos":"","participantId":105}],"scale":360}`)
        expect(onNotification).toHaveBeenLastCalledWith({ type: 'conferenceUpdate', action: 'layoutInfo', call, canvasInfo, currentLayerIdx: -1 })
      })

      it('should handle layout-info with 2 people', () => {
        const eventData = JSON.parse(`{"contentType":"layout-info","canvasType":"mcu-personal-canvas","callID":"${CALL_PARAMS.id}","canvasInfo":{"canvasID":-1,"totalLayers":2,"layersUsed":0,"layoutFloorID":-1,"layoutName":"2x1","canvasLayouts":[{"x":0,"y":90,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPOS":0,"yPOS":270,"resID":"","audioPOS":"","memberID":117},{"x":180,"y":90,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPOS":960,"yPOS":270,"resID":"","audioPOS":"","memberID":116}],"scale":360}}`)
        MCULayoutEventHandler(instance, eventData)
        const canvasInfo = JSON.parse('{"canvasId":-1,"totalLayers":2,"layersUsed":0,"layoutFloorId":-1,"layoutName":"2x1","canvasLayouts":[{"x":0,"y":90,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPos":0,"yPos":270,"resId":"","audioPos":"","participantId":117},{"x":180,"y":90,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPos":960,"yPos":270,"resId":"","audioPos":"","participantId":116}],"scale":360}')
        expect(onNotification).toHaveBeenLastCalledWith({ type: 'conferenceUpdate', action: 'layoutInfo', call, canvasInfo, currentLayerIdx: -1 })
      })
    })

    describe('with 4+ participants', () => {
      it('should handle layout-info with 4 participants', () => {
        const msg = JSON.parse(`{"contentType":"layout-info","canvasType":"mcu-canvas","canvasInfo":{"canvasID":0,"totalLayers":4,"layersUsed":0,"layoutFloorID":-1,"layoutName":"2x2","canvasLayouts":[{"x":0,"y":0,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPOS":0,"yPOS":0,"resID":"","audioPOS":"","memberID":0},{"x":180,"y":0,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPOS":960,"yPOS":0,"resID":"","audioPOS":"","memberID":0},{"x":0,"y":180,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPOS":0,"yPOS":540,"resID":"","audioPOS":"","memberID":0},{"x":180,"y":180,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPOS":960,"yPOS":540,"resID":"","audioPOS":"","memberID":0}],"scale":360}}`)
        msg.callID = CALL_PARAMS.id
        MCULayoutEventHandler(instance, msg)
        const canvasInfo = JSON.parse('{"canvasId":0,"totalLayers":4,"layersUsed":0,"layoutFloorId":-1,"layoutName":"2x2","canvasLayouts":[{"x":0,"y":0,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPos":0,"yPos":0,"resId":"","audioPos":"","participantId":0},{"x":180,"y":0,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPos":960,"yPos":0,"resId":"","audioPos":"","participantId":0},{"x":0,"y":180,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPos":0,"yPos":540,"resId":"","audioPos":"","participantId":0},{"x":180,"y":180,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPos":960,"yPos":540,"resId":"","audioPos":"","participantId":0}],"scale":360}')
        expect(onNotification).toHaveBeenLastCalledWith({ type: 'conferenceUpdate', action: 'layoutInfo', call, canvasInfo, currentLayerIdx: -1 })
      })

      it('should handle layer-info with 4 participants', () => {
        const msg = JSON.parse(`{"contentType":"layer-info","currentLayerIdx":3,"canvasType":"mcu-canvas","callID":"${CALL_PARAMS.id}","canvasInfo":{"canvasID":0,"totalLayers":4,"layersUsed":4,"layoutFloorID":-1,"layoutName":"2x2","canvasLayouts":[{"x":0,"y":0,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPOS":0,"yPOS":0,"resID":"","audioPOS":"","memberID":121},{"x":180,"y":0,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPOS":960,"yPOS":0,"resID":"","audioPOS":"","memberID":117},{"x":0,"y":180,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPOS":0,"yPOS":540,"resID":"","audioPOS":"","memberID":116},{"x":180,"y":180,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPOS":960,"yPOS":540,"resID":"","audioPOS":"","memberID":105}],"scale":360}}`)
        MCULayoutEventHandler(instance, msg)
        const canvasInfo = JSON.parse('{"canvasId":0,"totalLayers":4,"layersUsed":4,"layoutFloorId":-1,"layoutName":"2x2","canvasLayouts":[{"x":0,"y":0,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPos":0,"yPos":0,"resId":"","audioPos":"","participantId":121},{"x":180,"y":0,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPos":960,"yPos":0,"resId":"","audioPos":"","participantId":117},{"x":0,"y":180,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPos":0,"yPos":540,"resId":"","audioPos":"","participantId":116},{"x":180,"y":180,"scale":180,"hscale":180,"scale":180,"zoom":0,"border":0,"floor":0,"overlap":0,"screenWidth":960,"screenHeight":540,"xPos":960,"yPos":540,"resId":"","audioPos":"","participantId":105}],"scale":360}')
        expect(onNotification).toHaveBeenLastCalledWith({ type: 'conferenceUpdate', action: 'layerInfo', call, canvasInfo, currentLayerIdx: 3 })
      })
    })
  })
}
