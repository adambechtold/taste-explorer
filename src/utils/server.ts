import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { indexRouter } from "../routes/index.router";
import { usersRouter } from "../users/users.router";
import { musicRouter } from "../music/music.router";
import { authRouter } from "../auth/auth.router";

function createServer(): Express {
  const app = express();

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "../views"));
  app.use(express.static(path.join(__dirname, "../public")));

  /*
   * Consider adding this options
   * app.use(express.urlencoded({ extended: true })); // handle URL-encoded data (extended: true allows for nested objects)
   * https://www.youtube.com/watch?v=eg244TvZHyU
   **/

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use("/", indexRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/music", musicRouter);
  app.use("/auth", authRouter);

  return app;
}

export default createServer;

function listAllRoutes(app: express.Application) {
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      // routes registered directly on the app
      console.log(middleware.route.path, middleware.route.methods);
    } else if (middleware.name === "router") {
      // router middleware
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          console.log(handler.route.path, handler.route.methods);
        }
      });
    }
  });
}
