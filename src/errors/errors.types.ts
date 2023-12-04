export type ErrorType = "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR";

export class TypedError extends Error {
  status: number;
  type: ErrorType;

  constructor(message: string, status: number, type: ErrorType) {
    super(message);
    this.status = status;
    this.type = type;
  }
}
