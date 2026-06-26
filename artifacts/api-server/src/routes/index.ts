import { Router, type IRouter } from "express";
import healthRouter from "./health";
import driveRouter from "./drive";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(driveRouter);
router.use(authRouter);

export default router;
