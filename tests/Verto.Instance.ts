import behaveLikeBaseSession from './behaveLike/BaseSession.spec'
import behaveLikeSetup from './behaveLike/Setup.spec'
import { BladeDisconnect } from './behaveLike/BladeMessages.spec'
import TelnyxRTC from '../src/TelnyxRTC'

describe('TelnyxRTC Web', () => {
  const instance = new TelnyxRTC({
    login: 'username',
    password: 'password'
  })
  behaveLikeBaseSession.call(this, instance)
  behaveLikeSetup.call(this, instance)
  BladeDisconnect.call(this, instance)
})