import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(7331),
  CONFIG_REPO_PATH: z.string().min(1).default(process.cwd()),
  DCC_AUTH_TOKEN: z.string().optional().default(""),

  BITBUCKET_BASE_URL: z.string().url().default("https://bitbucket.example.local"),
  BITBUCKET_USERNAME: z.string().optional().default(""),
  BITBUCKET_PASSWORD: z.string().optional().default(""),
  DEFAULT_BASE_BRANCH: z.string().default("main"),

  // Gemini AI Studio
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().optional().default("gemini-2.5-flash"),

  // AI call logging
  AI_LOG_ENABLED: z.coerce.boolean().default(true),
  AI_LOG_REPLY_PREVIEW_CHARS: z.coerce.number().min(0).max(5000).default(100),

  // Optional legacy shim vars (kept for future)
  OPENAI_SHIM_BASE_URL: z.string().optional().default(""),
  OPENAI_SHIM_API_KEY: z.string().optional().default("")
});

export const env = EnvSchema.parse(process.env);
