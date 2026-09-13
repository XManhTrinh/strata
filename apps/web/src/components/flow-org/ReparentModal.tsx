"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Search,
  List,
  ListItem,
  Icon,
  Typography,
} from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
import { Person } from "@/lib/org-tree/types";
import { Avatar } from "@/components/ui/avatar";

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
      <Dialog open onOpenChange={(open) => !open && onCancel()}>
        <DialogContent icon="swap_horiz">
          <DialogHeader centered>
            <DialogTitle>
              Reassign {directReportCount} {directReportCount === 1 ? "report" : "reports"}
            </DialogTitle>
            <DialogDescription>
              Choose who should manage {personName}&apos;s direct reports.
            </DialogDescription>
          </DialogHeader>

          <Search
            value={search}
            onValueChange={setSearch}
            placeholder="Search by name or title..."
            className="w-full"
          />

          <div className="max-h-64 overflow-y-auto -mx-6">
            {filteredPersons.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Icon name="search_off" size={24} className="text-surface-variant-foreground/40 mb-2" />
                <Typography variant="body-medium" color="surface-variant-foreground">
                  No matches
                </Typography>
              </div>
            ) : (
              <List className="py-0">
                {filteredPersons.map((p) => (
                  <ListItem
                    key={p.id}
                    interactive
                    onClick={() => onReassignReports(p.id)}
                    leading={<Avatar name={p.fullName} size="s" />}
                    lines={2}
                    supporting={p.title}
                  >
                    {p.fullName}
                  </ListItem>
                ))}
              </List>
            )}
          </div>

          <DialogFooter>
            <Button variant="text" onClick={() => setShowPicker(false)}>
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Main choice view ───────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent icon="drag_indicator">
        <DialogHeader centered>
          <DialogTitle>Move {personName}</DialogTitle>
          <DialogDescription>
            {personName} has{" "}
            <strong>{directReportCount}</strong>{" "}
            direct {directReportCount === 1 ? "report" : "reports"}.
            What should happen to them?
          </DialogDescription>
        </DialogHeader>

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

        <DialogFooter>
          <Button variant="text" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
