import { Router } from "express";
import { z } from "zod";
import { getFirebaseAdminAuth } from "../lib/firebaseAdmin";

const authRouter = Router();

const SetPasswordSchema = z.object({
  password: z.string().min(6),
});

authRouter.post("/auth/users/:uid/password", async (req, res) => {
  const uid = typeof req.params.uid === "string" ? req.params.uid.trim() : "";
  if (!uid) {
    res.status(400).json({ error: "Missing user UID" });
    return;
  }

  const parsed = SetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }

  try {
    const auth = getFirebaseAdminAuth();
    const user = await auth.updateUser(uid, { password: parsed.data.password });
    res.json({
      uid: user.uid,
      email: user.email ?? "",
      updated: true,
    });
  } catch (error: any) {
    const code = String(error?.code ?? "");
    if (code === "auth/user-not-found") {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (code === "auth/invalid-password") {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }

    req.log.error({ error, uid }, "Failed to update user password");
    res.status(502).json({ error: error?.message ?? "Failed to update user password" });
  }
});

authRouter.delete("/auth/users/:uid", async (req, res) => {
  const uid = typeof req.params.uid === "string" ? req.params.uid.trim() : "";
  if (!uid) {
    res.status(400).json({ error: "Missing user UID" });
    return;
  }

  try {
    const auth = getFirebaseAdminAuth();
    await auth.deleteUser(uid);
    res.json({ uid, deleted: true });
  } catch (error: any) {
    const code = String(error?.code ?? "");
    if (code === "auth/user-not-found") {
      res.status(404).json({ error: "User not found" });
      return;
    }

    req.log.error({ error, uid }, "Failed to delete user");
    res.status(502).json({ error: error?.message ?? "Failed to delete user" });
  }
});

export default authRouter;
