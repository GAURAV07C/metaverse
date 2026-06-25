import { z } from 'zod';

export const SignupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  type: z.enum(['admin', 'user']).default('user'),
});

export const SigninSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const SpaceSchema = z.object({
  name: z.string().min(1, 'Space name is required'),
  dimensions: z
    .string()
    .regex(/^[0-9]+x[0-9]+$/, 'Dimensions must be in the format WxH (e.g. 100x200)'),
  mapId: z.string().optional(),
});

// Helper to extract the first zod error message safely across Zod v3 and v4
export function getZodMessage(err: z.ZodError): string {
  const issues = err.issues ?? (err as any).errors;
  return issues?.[0]?.message ?? 'Validation failed';
}
