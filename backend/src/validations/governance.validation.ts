import { z } from 'zod';

export const createRiskAssessmentSchema = z.object({
  body: z.object({
    ai_system_id: z.string().uuid("Invalid AI System ID")
  })
});

export const submitRiskAssessmentSchema = z.object({
  body: z.object({
    answers: z.array(z.object({
      question_key: z.string().min(1),
      answer: z.string().min(1),
      score: z.number().min(0).max(100)
    })).min(1, "Answers are required")
  })
});

export const createImpactAssessmentSchema = z.object({
  body: z.object({
    ai_system_id: z.string().uuid("Invalid AI System ID"),
    type: z.enum(['DPIA', 'AIA']),
    form_data: z.record(z.string(), z.any()),
    submitted_by: z.string().optional()
  })
});

export const updateImpactAssessmentSchema = z.object({
  body: z.object({
    status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED']).optional(),
    form_data: z.record(z.string(), z.any()).optional(),
    reviewed_by: z.string().optional()
  })
});

export const createControlSchema = z.object({
  body: z.object({
    framework: z.string().min(1),
    control_id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    category: z.string().min(1)
  })
});

export const updateControlImplementationSchema = z.object({
  body: z.object({
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'NOT_APPLICABLE']),
    evidence: z.array(z.record(z.string(), z.any())).optional(),
    notes: z.string().optional(),
    owner_user_id: z.string().optional(),
    due_date: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined)
  })
});

export const createVendorAiToolSchema = z.object({
  body: z.object({
    vendor_name: z.string().min(1, "Vendor name is required"),
    tool_name: z.string().min(1, "Tool name is required"),
    tool_category: z.string().min(1, "Tool category is required"),
    data_shared: z.record(z.string(), z.any()),
    risk_level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
  })
});

export const reviewVendorAiToolSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'FLAGGED'])
  })
});

export const updateModelCardSchema = z.object({
  body: z.object({
    intended_use: z.string().min(1),
    out_of_scope_use: z.string().min(1),
    training_data_description: z.string().min(1),
    known_limitations: z.string().min(1),
    bias_considerations: z.string().min(1),
    performance_metrics: z.record(z.string(), z.any()),
    last_updated_by: z.string().optional(),
    version: z.string().optional()
  })
});

export const updateObligationSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'IN_PROGRESS', 'MET', 'NOT_APPLICABLE']).optional(),
    owner_user_id: z.string().optional(),
    deadline: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
    linked_control_id: z.string().optional()
  })
});
