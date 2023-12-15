import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { usersRouter } from "../users/users.router";
import { musicRouter } from "../music/music.router";
import { authRouter } from "../auth/auth.router";

function createServer(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use("/api/users", usersRouter);
  app.use("/api/music", musicRouter);
  app.use("/auth", authRouter);

  // serve static files from the 'public' folder
  app.use(express.static(path.join(__dirname, "../../public")));

  return app;
}

export default createServer;
