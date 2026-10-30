import { notFound } from "next/navigation";
import { DataTableDemo } from "@/features/spike/data-table-demo";

/** `?count=` sets the rows (up to the 5,000 a client-mode table holds), for the benchmark. */
export default async function DataTableDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ count?: string }>;
}) {
  if (process.env.STRATA_DEV_PAGES !== "1") notFound();
  const count = Number.parseInt((await searchParams).count ?? "", 10);
  return (
    <DataTableDemo count={Number.isFinite(count) ? Math.min(Math.max(count, 1), 5000) : 300} />
  );
}
