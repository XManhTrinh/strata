import { z } from "zod";

export const NotificationTypeEnum = z.enum([
  "LEAVE_REQUEST",
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",
  "REPORT_READY",
  "SYSTEM_ALERT",
  "JOB_FAILED",
]);

export const NotificationPriorityEnum = z.enum([
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
]);

export const NotificationSchema = z
  .object({
    id: z.string().cuid(),
    userId: z.string().cuid(),
    message: z.string().min(1),
    type: NotificationTypeEnum,
    priority: NotificationPriorityEnum,
    isRead: z.boolean(),
    createdAt: z.string().datetime(),
    readAt: z.string().datetime().nullable(),
  })
  .strict();

export const CreateNotificationSchema = z
  .object({
    userId: z.string().cuid(),
    message: z.string().min(1),
    type: NotificationTypeEnum,
    priority: NotificationPriorityEnum.optional(),
    isRead: z.boolean().optional(),
    readAt: z.string().datetime().nullable().optional(),
  })
  .strict();

export const UpdateNotificationSchema =
  CreateNotificationSchema.partial().strict();

export type Notification = z.infer<typeof NotificationSchema>;
export type CreateNotification = z.infer<typeof CreateNotificationSchema>;
export type UpdateNotification = z.infer<typeof UpdateNotificationSchema>;
