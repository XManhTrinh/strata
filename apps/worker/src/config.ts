import { ConnectionOptions, JobsOptions } from "bullmq";

export const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redisConnection: ConnectionOptions = {
  host: new URL(REDIS_URL).hostname,
  port: Number(new URL(REDIS_URL).port) || 6379,
  password: new URL(REDIS_URL).password || undefined,
};

export interface QueueConfig {
  name: string;
  concurrency: number;
  defaultJobOptions: JobsOptions;
}

export const queues: QueueConfig[] = [
  {
    name: "reports",
    concurrency: 3,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000, // 1s, 4s, 16s
      },
    },
  },
  {
    name: "notifications",
    concurrency: 10,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 500, // 500ms, 2s, 8s
      },
    },
  },
  {
    name: "imports",
    concurrency: 2,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000, // 2s, 8s, 32s
      },
    },
  },
];
