import express, { Request, Response } from "express";

export const indexRouter = express.Router();

indexRouter.get("/", (req: Request, res: Response) => {
  res.render("index", {
    title: "Music Taste Explorer",
    spotify: { isAuthorized: false },
  });
});
