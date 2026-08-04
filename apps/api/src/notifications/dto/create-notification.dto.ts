import { z } from 'zod';

export const NotificationTypeEnum = z.enum([
  'LEAVE_REQUEST',
  'LEAVE_APPROVED',
  'LEAVE_REJECTED',
  'REPORT_READY',
  'SYSTEM_ALERT',
  'JOB_FAILED',
]);

export const NotificationPriorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

export const CreateNotificationDtoSchema = z
  .object({
    userId: z.string().min(1, 'userId is required'),
    message: z.string().min(1, 'message is required'),
    type: NotificationTypeEnum,
    priority: NotificationPriorityEnum.optional().default('NORMAL'),
  })
  .strict();

export type CreateNotificationDto = z.infer<typeof CreateNotificationDtoSchema>;
