import express, { Express } from "express";
import session from "express-session";
import cors from "cors";
import helmet from "helmet";
import path from "path";

import { indexRouter } from "../routes/index.router";
import { usersRouter } from "../users/users.router";
import { musicRouter } from "../music/music.router";
import { authRouter } from "../auth/auth.router";
import { playerRouter } from "../routes/player.routes";

declare module "express-session" {
  interface SessionData {
    tasteComparison: {
      user1?: string;
      user2?: string;
    };
  }
}

function createServer(): Express {
  const app = express();

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("No session secret provided");
  }

  app.use(
    session({
      // TODO: Change this to a real secret key
      secret: sessionSecret, // This is a secret key to sign the session ID cookie
      resave: false, // This option forces the session to be saved back to the session store
      saveUninitialized: true, // This option forces a session that is "uninitialized" to be saved to the store
      cookie: { secure: process.env.NODE_ENV === "production" }, // Set secure to true if serving over HTTPS
    })
  );

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "../views"));
  app.use(express.static(path.join(__dirname, "../public")));

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "https://unpkg.com",
            "https://sdk.scdn.co",
            "https://kit.fontawesome.com",
          ],
          imgSrc: ["'self'", "https://i.scdn.co", "https://media.giphy.com"],
          frameSrc: ["'self'", "https://sdk.scdn.co"],
          connectSrc: ["'self'", "https://ka-f.fontawesome.com"],
        },
      },
    })
  );
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/", indexRouter);
  app.use("/player", playerRouter);
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
