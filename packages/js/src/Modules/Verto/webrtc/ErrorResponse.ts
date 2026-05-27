class ErrorResponse {
  private code?: string;

  private message: string;

  constructor(message: string, code?: string) {
    this.code = code;
    this.message = message;
  }
}
export { ErrorResponse };
