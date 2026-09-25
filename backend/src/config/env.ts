import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();
dotenv.config({ path: '../.env' });

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  SIMULATION_ENABLED: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  CORS_ORIGIN: z.string().optional(),
  NOTIFICATION_PROVIDER: z.enum(['mock', 'twilio']).default('mock'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
  ALERT_WHATSAPP_TO: z.string().optional()
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && (value.JWT_SECRET.length < 32 || value.JWT_SECRET === 'change-me-in-local-env')) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_SECRET'], message: 'JWT_SECRET must be a secure value of at least 32 characters in production' });
  }
});

export const env = envSchema.parse(process.env);
