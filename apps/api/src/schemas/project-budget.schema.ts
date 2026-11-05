import { z } from 'zod';

const TaskAllocationSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  allocatedHours: z.number().min(0, 'Hours cannot be negative'),
  // 🟢 FIX: Allowed new granular assignment fields so Zod doesn't strip them silently
  sessions: z.number().optional(),
  hoursPerSession: z.number().optional(),
  assignedUsers: z.array(z.string()).optional(),
  assignedUsersString: z.string().optional(),
});

const MemberAllocationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  // Ab members ke paas individual task nahi hai, wo bas project level par access lenge
  allocatedHours: z.number().min(0, 'Hours cannot be negative').optional().default(0),
});

export const allocateBudgetSchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    totalAllocatedHours: z.number().min(0, 'Total hours cannot be negative'),
    tasks: z.array(TaskAllocationSchema),
    members: z.array(MemberAllocationSchema),
    // 🟢 FIX: Allowed root-level granular assignments fallback
    granularAssignments: z.array(
      z.object({
        taskId: z.string(),
        users: z.array(z.string()),
      })
    ).optional(),
  }),
});

export type AllocateBudgetInput = z.infer<typeof allocateBudgetSchema>['body'];
