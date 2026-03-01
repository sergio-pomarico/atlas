/*
 * Custom exception class for Result-related errors.
 */
class ResultException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResultException";
    Error.captureStackTrace(this, ResultException);
  }
}

/*
 * returns a Result object that encapsulates either a success value of type T or an error of type E.
 * @template T - The type of the success value.
 * @template E - The type of the error value.
 */
export class Result<T, E> {
  readonly isSuccess: boolean;
  private readonly error?: E;
  private readonly data?: T;

  private constructor(success: boolean, error?: E, data?: T) {
    this.isSuccess = success;
    this.error = error;
    this.data = data;
  }

  static success<T, E>(data: T): Result<T, E> {
    return new Result<T, E>(true, undefined, data);
  }

  static fail<T, E>(error: E): Result<T, E> {
    return new Result<T, E>(false, error);
  }

  getData(): T {
    if (!this.isSuccess) {
      throw new ResultException("Cannot get data from an error result");
    }
    return this.data as T;
  }

  getError(): E {
    if (this.isSuccess) {
      throw new ResultException("Cannot get error from a success result");
    }
    return this.error as E;
  }
}
