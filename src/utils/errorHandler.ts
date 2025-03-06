class ErrorHandler extends Error {
  constructor(message,statusCode,data) {
    super();
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}

export default ErrorHandler;