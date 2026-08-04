import { Job } from "bullmq";

interface NotificationJobData {
  notificationId: string;
  userId: string;
  type: string;
  enqueuedAt: string;
}

/**
 * Processes notification delivery jobs from the "notifications" queue.
 * Handles delivering notifications to users (e.g., email, push, in-app).
 */
export async function notificationsProcessor(job: Job): Promise<void> {
  const data: NotificationJobData =
    typeof job.data === "string" ? JSON.parse(job.data) : job.data;

  console.log(
    `[NotificationProcessor] Delivering notification — id: ${data.notificationId}, userId: ${data.userId}, type: ${data.type}`
  );

  await job.updateProgress(30);

  // Simulate notification delivery
  // In a real implementation, this would:
  // 1. Look up user's notification preferences
  // 2. Send via the appropriate channel (email, push, SMS)
  // 3. Update delivery status in the database
  await delay(100);

  await job.updateProgress(70);

  // Mark delivery as successful
  await delay(50);

  await job.updateProgress(100);
  console.log(
    `[NotificationProcessor] Notification delivered successfully — id: ${data.notificationId}, userId: ${data.userId}`
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
