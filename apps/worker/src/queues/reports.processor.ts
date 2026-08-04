import { Job } from "bullmq";

interface ReportJobData {
  reportId: string;
  type: "headcount" | "capacity" | "budget" | "leave";
  requestedBy: string;
  filters?: Record<string, unknown>;
  enqueuedAt: string;
}

/**
 * Processes report generation jobs from the "reports" queue.
 * Supports headcount, capacity, budget, and leave report types.
 */
export async function reportsProcessor(job: Job): Promise<void> {
  const data: ReportJobData =
    typeof job.data === "string" ? JSON.parse(job.data) : job.data;

  console.log(
    `[ReportProcessor] Starting report generation — id: ${data.reportId}, type: ${data.type}, requestedBy: ${data.requestedBy}`
  );

  await job.updateProgress(10);

  // Simulate processing based on report type
  switch (data.type) {
    case "headcount":
      await generateHeadcountReport(job, data);
      break;
    case "capacity":
      await generateCapacityReport(job, data);
      break;
    case "budget":
      await generateBudgetReport(job, data);
      break;
    case "leave":
      await generateLeaveReport(job, data);
      break;
    default:
      throw new Error(`Unknown report type: ${data.type}`);
  }

  await job.updateProgress(100);
  console.log(
    `[ReportProcessor] Report generation completed — id: ${data.reportId}, type: ${data.type}`
  );
}

async function generateHeadcountReport(
  job: Job,
  data: ReportJobData
): Promise<void> {
  console.log(
    `[ReportProcessor] Generating headcount report for: ${data.reportId}`
  );
  await job.updateProgress(30);

  // Simulate processing delay
  await delay(200);
  await job.updateProgress(60);

  // In a real implementation, this would query the database for employee counts
  // grouped by department, status, etc.
  await delay(100);
  await job.updateProgress(90);

  console.log(
    `[ReportProcessor] Headcount report generated successfully: ${data.reportId}`
  );
}

async function generateCapacityReport(
  job: Job,
  data: ReportJobData
): Promise<void> {
  console.log(
    `[ReportProcessor] Generating capacity report for: ${data.reportId}`
  );
  await job.updateProgress(30);

  // Simulate processing delay
  await delay(200);
  await job.updateProgress(60);

  // In a real implementation, this would aggregate capacity allocations per squad/employee
  await delay(100);
  await job.updateProgress(90);

  console.log(
    `[ReportProcessor] Capacity report generated successfully: ${data.reportId}`
  );
}

async function generateBudgetReport(
  job: Job,
  data: ReportJobData
): Promise<void> {
  console.log(
    `[ReportProcessor] Generating budget report for: ${data.reportId}`
  );
  await job.updateProgress(30);

  // Simulate processing delay
  await delay(200);
  await job.updateProgress(60);

  // In a real implementation, this would calculate budget vs actuals per department
  await delay(100);
  await job.updateProgress(90);

  console.log(
    `[ReportProcessor] Budget report generated successfully: ${data.reportId}`
  );
}

async function generateLeaveReport(
  job: Job,
  data: ReportJobData
): Promise<void> {
  console.log(
    `[ReportProcessor] Generating leave report for: ${data.reportId}`
  );
  await job.updateProgress(30);

  // Simulate processing delay
  await delay(200);
  await job.updateProgress(60);

  // In a real implementation, this would aggregate leave requests by type, status, employee
  await delay(100);
  await job.updateProgress(90);

  console.log(
    `[ReportProcessor] Leave report generated successfully: ${data.reportId}`
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
