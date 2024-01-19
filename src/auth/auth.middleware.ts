import { Request, Response, NextFunction } from "express";

export function checkApiToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-api-token"];

  const secretValue = process.env.API_SECRET;

  if (!secretValue) {
    console.error("Set a secret value to secure your API.");
    return res.status(500).json({
      error: "Internal server error",
    });
  } else {
    if (!token) {
      return res.status(401).json({
        error: "API token required",
      });
    }

    if (token !== secretValue) {
      return res.status(401).json({
        error: "Invalid API token",
      });
    }

    next();
  }
}
