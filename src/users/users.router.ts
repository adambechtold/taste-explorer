/**
 * Required External Modules and Imports
 */

import express, { Request, Response } from "express";
import * as UserService from "./users.service";
import { checkApiToken } from "../auth/auth.middleware";

import { User } from "./users.types";

import { TypedError } from "../errors/errors.types";
import { handleErrorResponse } from "../utils/response.utils";

/**
 * Router Definition
 */

export const usersRouter = express.Router();

/**
 * Controller Definitions
 */

usersRouter.get("/test", checkApiToken, async (req: Request, res: Response) => {
  try {
    const message = await UserService.testEndpoint();
    res.status(200).send(message);
  } catch (e: any) {
    console.error("Test Failed", e.message);
  }
});

// --- Get All Users ---
usersRouter.get("/", checkApiToken, async (req: Request, res: Response) => {
  try {
    const users: User[] = await UserService.getAllUsers();
    const response = {
      count: users.length,
      users: users,
    };

    res.status(200).send(response);
  } catch (e: any) {
    handleErrorResponse(e, res);
  }
});

// --- Get User By ID ---
usersRouter.get("/:id", checkApiToken, async (req: Request, res: Response) => {
  try {
    // if no id, then it's get all users

    // check if id is a number
    if (isNaN(parseInt(req.params.id))) {
      throw new TypedError("ID must be a number", 400);
    }

    const user: User = await UserService.getUserById(parseInt(req.params.id));

    res.status(200).send(user);
  } catch (e: any) {
    handleErrorResponse(e, res);
  }
});

// --- Create User by lastfm Username ---
usersRouter.post("/", checkApiToken, async (req: Request, res: Response) => {
  try {
    const lastfmUsername = req.body.lastfmUsername;

    if (!lastfmUsername) {
      const message = "Missing lastfmUsername";
      throw new TypedError(message, 400);
    }

    const user: User = await UserService.createUserByLastfmUsername(
      lastfmUsername
    );

    res.status(200).send(user);
  } catch (e: any) {
    handleErrorResponse(e, res);
  }
});

// --- Update User's Listen History ---
usersRouter.post(
  "/:id/listens",
  checkApiToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.params.id) {
        throw new TypedError("Missing username", 400);
      }
      if (isNaN(parseInt(req.params.id))) {
        throw new TypedError("ID must be a number", 400);
      }

      const result = await UserService.triggerUpdateListenHistoryByUserId(
        parseInt(req.params.id)
      );

      res.status(200).send(result);
    } catch (e: any) {
      handleErrorResponse(e, res);
    }
  }
);
