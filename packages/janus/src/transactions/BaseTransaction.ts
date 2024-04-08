import { JanusResponse } from "../messages/response";
import { v4 as uuidV4 } from "uuid";
export abstract class BaseTransaction<T, R = unknown, E = Error> {
  public id: string;
  public promise: Promise<T>;
  private _request: R;

  protected _resolve!: (value: T | PromiseLike<T>) => void;
  protected _reject!: (reason?: E) => void;

  constructor(request: R) {
    this.id = uuidV4();
    this._request = request;
    this.promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }
  public abstract onMessage(msg: JanusResponse): void;

  get request(): string {
    return JSON.stringify({
      transaction: this.id,
      ...this._request,
    });
  }
}
