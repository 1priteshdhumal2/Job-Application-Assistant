import { Router, Request, Response } from "express";
import { HealthCheckResponse } from "@jobpilot/types";

export const healthRouter = Router();

healthRouter.get(
  "/health",
  (_req: Request, res: Response<HealthCheckResponse>) => {
    res.status(200).json({
      status: "ok",
      service: "jobpilot-api",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  },
);
