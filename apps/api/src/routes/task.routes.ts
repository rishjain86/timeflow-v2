import { Router } from 'express';
import { z } from 'zod';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getOrganizationTaskNames,
  assignTasksToProject,
  deleteOrganizationTaskByName
} from '../controllers/task.controller';
import {
  createTaskSchema,
  getTasksQuerySchema,
  assignTasksSchema,
  updateTaskSchema // 🟢 FIX: Make sure this is imported
} from '../schemas/task.schema';
import { requireAuth } from '../middleware/auth'; 
import { validate } from '../middleware/validate';

const router = Router();

const idParamSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

router.use(requireAuth);

router.get('/organization-tasks', getOrganizationTaskNames);
router.delete('/organization-tasks/:name', deleteOrganizationTaskByName);

router.post('/assign', validate(assignTasksSchema), assignTasksToProject);

router.post(
  '/',
  validate(createTaskSchema),
  createTask
);

router.get(
  '/',
  validate(getTasksQuerySchema),
  getTasks
);

router.get(
  '/:id',
  validate(idParamSchema),
  getTaskById
);

// 🟢 FIX: Changed back to updateTaskSchema so req.body doesn't get deleted!
router.put(
  '/:id',
  validate(updateTaskSchema),
  updateTask
);

router.patch(
  '/:id',
  validate(updateTaskSchema),
  updateTask
);

router.delete(
  '/:id',
  validate(idParamSchema),
  deleteTask
);

export default router;
