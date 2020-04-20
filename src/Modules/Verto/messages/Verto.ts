import BaseRequest from './verto/BaseRequest'
import { Login } from './verto/Login'
import { Result } from './verto/Result'
import { VertoMethod } from '../webrtc/constants'

class Invite extends BaseRequest {
  toString() {
    return VertoMethod.Invite
  }
}
class Answer extends BaseRequest {
  toString() {
    return VertoMethod.Answer
  }
}
class Attach extends BaseRequest {
  toString() {
    return VertoMethod.Attach
  }
}
class Bye extends BaseRequest {
  toString() {
    return VertoMethod.Bye
  }
}
class Modify extends BaseRequest {
  toString() {
    return VertoMethod.Modify
  }
}
class Info extends BaseRequest {
  toString() {
    return VertoMethod.Info
  }
}
class Broadcast extends BaseRequest {
  toString() {
    return VertoMethod.Broadcast
  }
}
class Subscribe extends BaseRequest {
  toString() {
    return VertoMethod.Subscribe
  }
}
class Unsubscribe extends BaseRequest {
  toString() {
    return VertoMethod.Unsubscribe
  }
}

export {
  Login,
  Invite,
  Answer,
  Attach,
  Bye,
  Modify,
  Info,
  Broadcast,
  Subscribe,
  Unsubscribe,
  Result
}
