import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getDriveConfigState } from "../lib/googleDrive";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/drive/health", (_req, res) => {
  res.json({
    status: "ok",
    ...getDriveConfigState(),
  });
});

export default router;
