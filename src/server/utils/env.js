import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().optional().default("gemini-2.5-pro"),
  OPENAI_RESPONSE_LOG_ENABLED: z.coerce.boolean().default(false),

  // Project scanning
  PROJECT_SCAN_AI_ENABLED: z.coerce.boolean().default(true),
});

export const env = EnvSchema.parse(process.env);
