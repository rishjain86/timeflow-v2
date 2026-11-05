import { z } from 'zod';

export const createServiceCodeSchema = z.object({
body: z.object({
code: z.string().min(1, 'Service code is required'),
description: z.string().optional(),
defaultRate: z.number().min(0, 'Rate must be a positive number'),
isActive: z.boolean().optional(),
}),
});

export const updateServiceCodeSchema = z.object({
params: z.object({
id: z.string().uuid('Invalid Service Code ID'),
}),
body: z.object({
code: z.string().min(1).optional(),
description: z.string().optional(),
defaultRate: z.number().min(0).optional(),
isActive: z.boolean().optional(),
}),
});

export const getServiceCodesQuerySchema = z.object({
query: z.object({
page: z.string().regex(/^\d+$/).transform(Number).default('1'),
limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
isActive: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
search: z.string().optional(), // For searching by code or description
}),
});

export const serviceCodeIdParamSchema = z.object({
params: z.object({
id: z.string().uuid('Invalid Service Code ID'),
}),
});
