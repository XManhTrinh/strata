"use client";

import { useState } from "react";
import { DataTable, SearchInput, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";

interface Person {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  [key: string]: unknown;
}

const mockPeople: Person[] = [
  { id: "1", fullName: "Sarah Chen", email: "sarah.chen@strata.io", phone: "+1 555-0101", dateOfBirth: "1990-03-15" },
  { id: "2", fullName: "Marcus Johnson", email: "marcus.j@strata.io", phone: "+1 555-0102", dateOfBirth: "1985-07-22" },
  { id: "3", fullName: "Emily Rodriguez", email: "emily.r@strata.io", phone: "+1 555-0103", dateOfBirth: "1992-11-08" },
  { id: "4", fullName: "David Park", email: "david.p@strata.io", phone: "+1 555-0104", dateOfBirth: "1988-01-30" },
  { id: "5", fullName: "Aisha Patel", email: "aisha.p@strata.io", phone: "+1 555-0105", dateOfBirth: "1995-06-12" },
  { id: "6", fullName: "James Wilson", email: "james.w@strata.io", phone: "+1 555-0106", dateOfBirth: "1987-09-25" },
  { id: "7", fullName: "Lin Zhang", email: "lin.z@strata.io", phone: "+1 555-0107", dateOfBirth: "1993-04-18" },
  { id: "8", fullName: "Olivia Thompson", email: "olivia.t@strata.io", phone: "+1 555-0108", dateOfBirth: "1991-12-03" },
];

const columns: Column<Person>[] = [
  { key: "fullName", header: "Name", sortable: true },
  { key: "email", header: "Email", sortable: true },
  { key: "phone", header: "Phone" },
];

export default function PeoplePage() {
  const [search, setSearch] = useState("");

  const filteredPeople = mockPeople.filter(
    (p) =>
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <AppBar className="justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">People</h1>
          <p className="text-xs text-muted-foreground">
            Manage people records across your organization.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Add Person
        </button>
      </AppBar>

      <div className="max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search people..."
        />
      </div>

      <DataTable<Person>
        columns={columns}
        data={filteredPeople}
        pageSize={10}
        emptyMessage="No people found"
      />
    </div>
  );
}
