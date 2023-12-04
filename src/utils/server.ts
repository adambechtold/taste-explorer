import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { usersRouter } from "../users/users.router";

function createServer(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use("/api/users", usersRouter);

  return app;
}

export default createServer;
