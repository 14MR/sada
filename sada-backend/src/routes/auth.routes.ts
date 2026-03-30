import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middleware/validation";
import { signinSchema } from "../validators/auth.validator";

const router = Router();

router.post("/signin", validate(signinSchema), AuthController.signIn);

export default router;
