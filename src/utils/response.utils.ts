import { TypedError } from "../errors/errors.types";
import { Response } from "express";

export function handleErrorResponse(error: any, res: Response) {
  if (error instanceof TypedError) {
    res.status(error.status).send(error.message);
  } else {
    console.error("Error: ", error);
    res.status(500).send(error.message);
  }
}
