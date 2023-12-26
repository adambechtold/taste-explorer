export class TypedError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }

  static create(message: string, status: number) {
    if (status === 404) {
      return new NotFoundError(message);
    }

    if (status === 429) {
      return new TooManyRequestsError(message);
    }

    return new TypedError(message, status);
  }
}

export class NotFoundError extends TypedError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class TooManyRequestsError extends TypedError {
  retryAfter?: number;

  constructor(message: string, retryAfter: number | undefined = undefined) {
    super(message, 429);
    this.retryAfter = retryAfter;
  }
}
