/**
 * Required External Modules and Imports
 */

import express, { Request, Response } from "express";
import * as UserService from "./users.service";
import { User } from "./users.types";

/**
 * Router Definition
 */

export const usersRouter = express.Router();

/**
 * Controller Definitions
 */

usersRouter.get("/test", async (req: Request, res: Response) => {
  try {
    const message = await UserService.testEndpoint();
    res.status(200).send(message);
  } catch (e: any) {
    console.error("Test Failed", e.message);
  }
});

usersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const users: User[] = await UserService.getAllUsers();

    res.status(200).send(users);
  } catch (e: any) {
    // TODO: make this type more clear
    console.log("ERROR!!", e);
    res.status(500).send(e.message);
  }
});
