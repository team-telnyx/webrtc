export default class Blocker {

  public promise: Promise<any>
  public resolve: Function

  constructor(public eventType: string, public controlId: string) {

    this.promise = new Promise(resolve => {
      this.resolve = resolve
    })
  }
}
