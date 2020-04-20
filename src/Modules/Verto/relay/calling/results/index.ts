export * from './HangupResult'
export * from './RecordResult'
export * from './AnswerResult'
export * from './PlayResult'
export * from './PromptResult'
export * from './ConnectResult'
export * from './DialResult'
export * from './FaxResult'
export * from './DetectResult'
export * from './TapResult'
export * from './SendDigitsResult'
export * from './DisconnectResult'

export class StopResult {
  public code: string
  public message: string
  public successful: boolean

  constructor(public result: { code: string, message: string }) {
    this.code = result.code
    this.message = result.message
    this.successful = result.code === '200'
  }
}

export class PlayPauseResult {
  constructor(public successful: boolean) { }
}

export class PlayResumeResult {
  constructor(public successful: boolean) { }
}

export class PlayVolumeResult {
  constructor(public successful: boolean) { }
}

export class PromptVolumeResult {
  constructor(public successful: boolean) { }
}
