export class ResponseUtil {
  static success<T>(data: T, message = 'Success') {
    return {
      success: true,
      message,
      data,
    };
  }

  static message(message: string) {
    return {
      success: true,
      message,
    };
  }
}
