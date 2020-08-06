// @ts-ignore
import InCallManager from 'react-native-incall-manager'
import BaseCall from './BaseCall'
import { State } from './constants'
import { streamIsValid } from '../util/webrtc'

export default class Call extends BaseCall {

  switchCamera() {
    const { localStream } = this.options
    if (streamIsValid(localStream)) {
      // @ts-ignore
      localStream.getVideoTracks().forEach(t => t._switchCamera())
    }
  }

  setSpeakerPhone(flag: boolean) {
    InCallManager.setForceSpeakerphoneOn(flag)
  }

  setState(state: State) {
    switch (state) {
      case State.Active:
        InCallManager.start({
          media: Boolean(this.options.video) ? 'video' : 'audio'
        })
        break
      case State.Destroy:
        InCallManager.stop()
        break
    }

    super.setState(state)
  }
}
