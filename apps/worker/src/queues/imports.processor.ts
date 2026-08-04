import { Job } from "bullmq";

interface ImportJobData {
  importId: string;
  entityType: string;
  fileName?: string;
  recordCount?: number;
  requestedBy: string;
  enqueuedAt: string;
}

/**
 * Processes bulk data import jobs from the "imports" queue.
 * Handles importing large datasets for employees, departments, etc.
 */
export async function importsProcessor(job: Job): Promise<void> {
  const data: ImportJobData =
    typeof job.data === "string" ? JSON.parse(job.data) : job.data;

  console.log(
    `[ImportProcessor] Starting bulk import — id: ${data.importId}, entityType: ${data.entityType}, records: ${data.recordCount ?? "unknown"}`
  );

  await job.updateProgress(10);

  // Simulate chunked processing of import records
  const totalRecords = data.recordCount || 100;
  const chunkSize = 50;
  const chunks = Math.ceil(totalRecords / chunkSize);

  for (let i = 0; i < chunks; i++) {
    const processed = Math.min((i + 1) * chunkSize, totalRecords);
    const progress = Math.round((processed / totalRecords) * 90) + 10;

    console.log(
      `[ImportProcessor] Processing chunk ${i + 1}/${chunks} — ${processed}/${totalRecords} records`
    );

    // Simulate chunk processing delay
    await delay(150);
    await job.updateProgress(Math.min(progress, 100));
  }

  console.log(
    `[ImportProcessor] Bulk import completed — id: ${data.importId}, entityType: ${data.entityType}, totalRecords: ${totalRecords}`
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
