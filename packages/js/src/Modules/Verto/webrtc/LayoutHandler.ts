import BrowserSession from '../BrowserSession'
import { NOTIFICATION_TYPE, ConferenceAction } from './constants'
import { SwEvent } from '../util/constants'
import { trigger } from '../services/Handler'
import { safeParseJson } from '../util/helpers'
import { IWebRTCCall } from './interfaces'

const MCULayoutEventHandler = (session: BrowserSession, eventData: any) => {
  const { contentType, canvasType, callID, canvasInfo = null, currentLayerIdx = -1 } = eventData
  if (canvasInfo && canvasType !== 'mcu-personal-canvas') {
    delete canvasInfo.memberID
  }

  const data: { type: string, call: IWebRTCCall, canvasInfo: any, currentLayerIdx: number } = {
    type: NOTIFICATION_TYPE.conferenceUpdate,
    call: session.calls[callID],
    canvasInfo: _clearCanvasInfo(canvasInfo),
    currentLayerIdx
  }
  switch (contentType) {
    case 'layer-info': {
      const notification = { action: ConferenceAction.LayerInfo, ...data }
      trigger(SwEvent.Notification, notification, session.uuid)
      break
    }
    case 'layout-info': {
      const notification = { action: ConferenceAction.LayoutInfo, ...data }
      trigger(SwEvent.Notification, notification, session.uuid)
      break
    }
  }
}

const _clearCanvasInfo = (canvasInfo: any) => {
  const tmp = JSON.stringify(canvasInfo)
    .replace(/memberID/g, 'participantId')
    .replace(/ID"/g, 'Id"')
    .replace(/POS"/g, 'Pos"')
  return safeParseJson(tmp)
}

export {
  MCULayoutEventHandler
}
