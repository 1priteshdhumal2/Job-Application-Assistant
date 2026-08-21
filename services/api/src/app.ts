import express, { Express } from "express";
import { healthRouter } from "./routes/health.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  // Mount foundational routes
  app.use("/", healthRouter);

  // 404 Handler for undefined routes
  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "The requested resource does not exist",
      },
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
