import { Router } from 'express';
import { ingestTelemetry } from '../controllers/telemetry.controller';
import { deviceAuth } from '../middleware/deviceAuth';

export const telemetryRouter = Router();

telemetryRouter.post('/', deviceAuth, ingestTelemetry);

