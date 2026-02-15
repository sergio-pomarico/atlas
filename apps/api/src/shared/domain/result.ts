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
  private readonly _success: boolean;
  private readonly _error?: E;
  private readonly _data?: T;

  private constructor(success: boolean, error?: E, data?: T) {
    this._success = success;
    this._error = error;
    this._data = data;
  }

  static success<T, E>(data: T): Result<T, E> {
    return new Result<T, E>(true, undefined, data);
  }

  static err<T, E>(error: E): Result<T, E> {
    return new Result<T, E>(false, error);
  }

  get data(): T {
    if (!this._success) {
      throw new ResultException("Cannot get data from an error result");
    }
    return this._data as T;
  }

  get error(): E {
    if (this._success) {
      throw new ResultException("Cannot get error from a success result");
    }
    return this._error as E;
  }
}
