import { Request, Response, NextFunction } from "express";
import { AppError } from "@jobpilot/shared";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle generic unexpected errors
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        process.env["NODE_ENV"] === "production"
          ? "An unexpected error occurred"
          : err.message,
    },
  });
}
