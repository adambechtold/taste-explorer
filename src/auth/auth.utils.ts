import { Request } from "express";
import { UserWithId } from "../users/users.types";

export function getCurrentUser(req: Request): UserWithId | null {
  return { id: 1 };
}
