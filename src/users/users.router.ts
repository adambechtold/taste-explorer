/**
 * Required External Modules and Imports
 */

import express, { Request, Response } from "express";
import * as UserService from "./users.service";
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

usersRouter.get("/test", async (req: Request, res: Response) => {
  try {
    const message = await UserService.testEndpoint();
    res.status(200).send(message);
  } catch (e: any) {
    console.error("Test Failed", e.message);
  }
});

// --- Get All Users ---
usersRouter.get("/", async (req: Request, res: Response) => {
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
usersRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    // if no id, then it's get all users

    if (isNaN(parseInt(req.params.id))) {
      res.status(400).send("Bad Request: ID must be a number");
    }

    const user: User = await UserService.getUserById(parseInt(req.params.id));

    res.status(200).send(user);
  } catch (e: any) {
    handleErrorResponse(e, res);
  }
});

// --- Create User by lastfm Username ---
usersRouter.post("/", async (req: Request, res: Response) => {
  try {
    const lastfmUsername = req.body.lastfmUsername;

    if (!lastfmUsername) {
      throw new TypedError("Missing lastfm Username", 400, "BAD_REQUEST");
    }

    const user: User = await UserService.createUserByLastfmUsername(
      lastfmUsername
    );

    res.status(200).send(user);
  } catch (e: any) {
    handleErrorResponse(e, res);
  }
});

// --- Delete User by ID ---
usersRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id); // TODO Handle bad input
    const deletedUser: User = await UserService.deleteUserById(userId);

    res.status(200).send(deletedUser);
  } catch (e: any) {
    console.log("Error: ", e);
    res.status(500).send(e.message);
  }
});

// --- Update User's Listen History ---
usersRouter.put("/:username/listens", async (req: Request, res: Response) => {
  try {
    const result = await UserService.updateListenHistory(req.params.username);

    res.status(200).send(result);
  } catch (e: any) {
    console.log("Error: ", e);
    res.status(500).send(e.message);
  }
});

// --- Get User's Listens ---
// usersRouter.get("/:username/listens", async (req: Request, res: Response) => {
//   try {
//     const listens = await MusicService.(req.params.username);

//     res.status(200).send(listens);
//   } catch (e: any) {
//     console.log("Error: ", e);
//     res.status(500).send(e.message);
//   }
// });
