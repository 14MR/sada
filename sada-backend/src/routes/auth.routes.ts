import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validation";
import { SignInDto } from "../dto/auth.dto";

const router = Router();

router.post("/signin", validateBody(SignInDto), AuthController.signIn);

export default router;
