"use client";
import type React from "react";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  SearchBar,
  List,
  ListItem,
  Button,
} from "@vkieu/mui";
import { Icon } from "@/components/ui/icon";
import { Typography } from "@/components/ui/typography";
import { Person } from "@/lib/org-tree/types";
import { Avatar } from "@/components/ui/avatar";

// Legacy compatibility type for interactive ListItem
// Legacy compatibility - TypeScript cast for interactive list items
const ListItemWithClick = ListItem as unknown as (props: React.ComponentProps<typeof ListItem> & { onClick?: () => void; selected?: boolean; }) => React.ReactElement;


// ─── Props ────────────────────────────────────────────────────────────────────

interface ReparentModalProps {
  personName: string;
  directReportCount: number;
  targetIsUnallocated: boolean;
  persons: Person[];
  draggedId: string;
  onMoveWithReports: () => void;
  onLeaveReports: () => void;
  onReassignReports: (newParentId: string) => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReparentModal({
  personName,
  directReportCount,
  targetIsUnallocated,
  persons,
  draggedId,
  onMoveWithReports,
  onLeaveReports,
  onReassignReports,
  onCancel,
}: ReparentModalProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");

  const filteredPersons = useMemo(() => {
    const q = search.trim().toLowerCase();
    return persons.filter(
      (p) =>
        p.id !== draggedId &&
        (q === "" ||
          p.fullName.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q)),
    );
  }, [persons, draggedId, search]);

  // ── Person picker view ─────────────────────────────────────────────────
  if (showPicker) {
    return (
      <Dialog open onOpenChange={(open) => !open && onCancel()} icon={<Icon name="swap_horiz" />}>
        <DialogTitle>
          Reassign {directReportCount} {directReportCount === 1 ? "report" : "reports"}
        </DialogTitle>
        <DialogContent>
          <p className="mb-4">Choose who should manage {personName}&apos;s direct reports.</p>
          <SearchBar
          aria-label="Search"
            value={search}
            onChange={setSearch}
            placeholder="Search by name or title..."
            className="w-full"
          />
          <div className="max-h-64 overflow-y-auto mt-2">
            {filteredPersons.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Icon name="search_off" size={24} className="text-on-surface-variant/40 mb-2" />
                <Typography variant="body-medium" color="surface-variant-foreground">
                  No matches
                </Typography>
              </div>
            ) : (
              <List aria-label="List" className="py-0">
                {filteredPersons.map((p) => (
                  <ListItemWithClick
                    key={p.id}
                    onClick={() => onReassignReports(p.id)}
                    leading={<Avatar name={p.fullName} size="s" />}
                    supportingText={p.title}
                  >
                    {p.fullName}
                  </ListItemWithClick>
                ))}
              </List>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setShowPicker(false)}>
            Back
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ── Main choice view ───────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()} icon={<Icon name="drag_indicator" />}>
      <DialogTitle>Move {personName}</DialogTitle>
      <DialogContent>
        <p className="mb-4">
          {personName} has{" "}
          <strong>{directReportCount}</strong>{" "}
          direct {directReportCount === 1 ? "report" : "reports"}.
          What should happen to them?
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="filled" onClick={onMoveWithReports} className="w-full justify-start gap-3">
            <Icon name="group" size={20} />
            Move together with reports
          </Button>
          <Button variant="tonal" onClick={onLeaveReports} className="w-full justify-start gap-3">
            <Icon name="person_remove" size={20} />
            Leave reports under current parent
          </Button>
          {targetIsUnallocated && (
            <Button variant="tonal" onClick={() => setShowPicker(true)} className="w-full justify-start gap-3">
              <Icon name="swap_horiz" size={20} />
              Reassign reports to someone else
            </Button>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onCancel}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
