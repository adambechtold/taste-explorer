import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { usersRouter } from "../users/users.router";
import { musicRouter } from "../music/music.router";

function createServer(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use("/api/users", usersRouter);
  app.use("/api/music", musicRouter);

  return app;
}

export default createServer;
