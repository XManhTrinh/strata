import { Worker } from "bullmq";
import { redisConnection, queues } from "./config";
import { reportsProcessor } from "./queues/reports.processor";
import { notificationsProcessor } from "./queues/notifications.processor";
import { importsProcessor } from "./queues/imports.processor";
import { startHealthCheck, stopHealthCheck } from "./health";

const processors: Record<string, (job: any) => Promise<void>> = {
  reports: reportsProcessor,
  notifications: notificationsProcessor,
  imports: importsProcessor,
};

const workers: Worker[] = [];

async function start(): Promise<void> {
  console.log("Starting Strata worker service...");

  for (const queueConfig of queues) {
    const worker = new Worker(queueConfig.name, processors[queueConfig.name], {
      connection: redisConnection,
      concurrency: queueConfig.concurrency,
    });

    worker.on("completed", (job) => {
      console.log(`Job ${job.id} on queue '${queueConfig.name}' completed`);
    });

    worker.on("failed", (job, err) => {
      console.error(`Job ${job?.id} on queue '${queueConfig.name}' failed: ${err.message}`);

      // Notify admins when a job has exhausted all retries
      const attemptsMade = job?.attemptsMade ?? 0;
      const maxAttempts = queueConfig.defaultJobOptions.attempts ?? 3;

      if (attemptsMade >= maxAttempts) {
        console.warn(
          `[ADMIN NOTIFICATION] Job ${job?.id} on queue '${queueConfig.name}' failed after all ${maxAttempts} retries. ` +
          `Error: ${err.message}. Job data: ${JSON.stringify(job?.data ?? {})}`
        );
        // In production, this would call the API to create a Notification record
        // of type JOB_FAILED with URGENT priority for all admin users.
      }
    });

    workers.push(worker);
    console.log(`Worker started for queue '${queueConfig.name}' (concurrency: ${queueConfig.concurrency})`);
  }

  startHealthCheck();
}

async function shutdown(): Promise<void> {
  console.log("Shutting down workers...");

  await Promise.all(workers.map((worker) => worker.close()));
  await stopHealthCheck();

  console.log("All workers shut down gracefully.");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start().catch((err) => {
  console.error("Failed to start worker service:", err);
  process.exit(1);
});
