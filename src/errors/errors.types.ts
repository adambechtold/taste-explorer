export class TypedError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }

  static create(message: string, status: number) {
    switch (status) {
      case 404:
        return new NotFoundError(message);
      case 401:
        return new NotAuthorizedError(message);
      case 429:
        return new TooManyRequestsError(message);
      default:
        return new TypedError(message, status);
    }
  }
}

export class NotFoundError extends TypedError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class LastfmListenNotFoundError extends NotFoundError {
  constructor(message: string) {
    super(message);
  }
}

export class ListenNotFoundError extends NotFoundError {
  constructor(message: string) {
    super(message);
  }
}

export class TrackNotFoundError extends NotFoundError {
  constructor(message: string) {
    super(message);
  }
}

export class NotAuthorizedError extends TypedError {
  constructor(message: string) {
    super(message, 401);
  }
}

export class TooManyRequestsError extends TypedError {
  retryAfter?: number;

  constructor(message: string, retryAfter: number | undefined = undefined) {
    super(message, 429);
    this.retryAfter = retryAfter;
  }
}
