import { BaseResult } from './BaseResult'
import { Answer } from '../components/Answer'

export class AnswerResult extends BaseResult {
  constructor(public component: Answer) {
    super(component)
  }
}
