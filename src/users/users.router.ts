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
    // TODO: make this type more clear
    console.log("Error: ", e);
    res.status(500).send(e.message);
  }
});

// --- Get User By Username ---
usersRouter.get("/:username", async (req: Request, res: Response) => {
  try {
    const user: User = await UserService.getUserByUsername(req.params.username);

    res.status(200).send(user);
  } catch (e: any) {
    console.log("Error: ", e);
    res.status(500).send(e.message);
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
