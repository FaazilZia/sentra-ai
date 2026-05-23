import { z } from 'zod';

export const createAISystemSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    model_name: z.string().min(1, "Model name is required"),
    model_version: z.string().min(1, "Model version is required"),
    vendor: z.string().min(1, "Vendor is required"),
    use_case: z.string().min(1, "Use case is required"),
    risk_tier: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    owner_user_id: z.string().optional(),
    status: z.enum(['ACTIVE', 'DEPRECATED', 'UNDER_REVIEW']).optional(),
  })
});

export const updateAISystemSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    model_name: z.string().min(1).optional(),
    model_version: z.string().min(1).optional(),
    vendor: z.string().min(1).optional(),
    use_case: z.string().min(1).optional(),
    risk_tier: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    owner_user_id: z.string().optional(),
    status: z.enum(['ACTIVE', 'DEPRECATED', 'UNDER_REVIEW']).optional(),
  })
});
