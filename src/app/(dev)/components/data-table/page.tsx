import { notFound } from "next/navigation";
import { DataTableDemo } from "@/features/spike/data-table-demo";

export default function DataTableDemoPage() {
  if (process.env.STRATA_DEV_PAGES !== "1") notFound();
  return <DataTableDemo />;
}
