import { Router } from "express";
import { z } from "zod";
import {
  isDriveConfigured,
  getDriveFilePreview,
  searchDriveFiles,
  uploadDocumentToDrive,
} from "../lib/googleDrive";

const driveRouter = Router();

const DriveUploadSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  studentName: z.string(),
  school: z.string().optional(),
  serviceType: z.string(),
  academicYear: z.string().optional(),
  agent: z.string().optional(),
  date: z.string().optional(),
  templateName: z.string().optional(),
  fields: z.record(z.string(), z.string()).optional(),
  notes: z.string().optional(),
});

driveRouter.post("/drive/upload", async (req, res) => {
  if (!isDriveConfigured()) {
    res
      .status(503)
      .json({
        error:
          "Google Drive is not configured. Connect your Google account first.",
      });
    return;
  }

  const parsed = DriveUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }

  try {
    const result = await uploadDocumentToDrive(parsed.data);
    res.json(result);
  } catch (err: any) {
    req.log.error({ err }, "Drive upload failed");
    const status = Number(err?.response?.status ?? err?.status);
    const code = Number.isFinite(status) && status >= 400 ? status : 502;
    res.status(code).json({ error: err?.message ?? "Drive upload failed" });
  }
});

driveRouter.get("/drive/search", async (req, res) => {
  if (!isDriveConfigured()) {
    res
      .status(503)
      .json({
        error:
          "Google Drive is not configured. Connect your Google account first.",
      });
    return;
  }

  const q = typeof req.query.q === "string" ? req.query.q : "";
  try {
    const results = await searchDriveFiles(q);
    res.json({ results });
  } catch (err: any) {
    req.log.error({ err }, "Drive search failed");
    const status = Number(err?.response?.status ?? err?.status);
    const code = Number.isFinite(status) && status >= 400 ? status : 502;
    res.status(code).json({ error: err?.message ?? "Drive search failed" });
  }
});

driveRouter.get("/drive/files/:fileId/preview", async (req, res) => {
  if (!isDriveConfigured()) {
    res
      .status(503)
      .json({
        error:
          "Google Drive is not configured. Connect your Google account first.",
      });
    return;
  }

  const fileId =
    typeof req.params.fileId === "string" ? req.params.fileId.trim() : "";
  if (!fileId) {
    res.status(400).json({ error: "Missing file ID" });
    return;
  }

  try {
    const preview = await getDriveFilePreview(fileId);
    res.setHeader("Cache-Control", "private, max-age=300");
    if (preview.mimeType) {
      res.type(preview.mimeType);
    }
    preview.stream.pipe(res);
  } catch (err: any) {
    req.log.error({ err, fileId }, "Drive preview failed");
    const status = Number(err?.response?.status ?? err?.status);
    const code = Number.isFinite(status) && status >= 400 ? status : 502;
    res.status(code).json({ error: err?.message ?? "Drive preview failed" });
  }
});

export default driveRouter;
