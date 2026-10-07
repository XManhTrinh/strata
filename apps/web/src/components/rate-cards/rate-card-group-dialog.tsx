"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Button,
} from "@vkieu/mui";
import { Select } from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { ColorPicker } from "@/components/ui/color-picker";
import type { RateCardGroup, RateCardSet, UpsertRateCardGroupInput } from "@/services";

const DEFAULT_COLOR = "#3B82F6";
const NO_SET = "__none__";

export interface RateCardGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing group to rename, or null to create a new one. */
  group: RateCardGroup | null;
  /** Tabs the group can belong to. */
  sets: RateCardSet[];
  /** Preselect this tab when creating a new group (e.g. "+ group" within a tab). */
  defaultSetId?: string | null;
  onSubmit: (input: UpsertRateCardGroupInput) => void;
  isSubmitting?: boolean;
}

export function RateCardGroupDialog({
  open,
  onOpenChange,
  group,
  sets,
  defaultSetId,
  onSubmit,
  isSubmitting,
}: RateCardGroupDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [setId, setSetId] = useState<string>(NO_SET);
  const [error, setError] = useState<string | null>(null);

  const setOptions = useMemo(
    () => [
      { value: NO_SET, label: "No tab" },
      ...sets.map((s) => ({ value: s.id, label: s.name })),
    ],
    [sets],
  );

  useEffect(() => {
    if (!open) return;
    setName(group?.name ?? "");
    setDescription(group?.description ?? "");
    setColor(group?.color ?? DEFAULT_COLOR);
    setSetId(group?.setId ?? defaultSetId ?? NO_SET);
    setError(null);
  }, [open, group, defaultSetId]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      setId: setId === NO_SET ? null : setId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle>{group ? "Rename group" : "New group"}</DialogTitle>
      <DialogContent>
        <p className="mb-4">Groups organize rate cards (e.g. &ldquo;Division A&rdquo;). They don&apos;t affect matching.</p>
        <div className="space-y-4">
          <TextField
            variant="outlined"
            label="Group name"
            value={name}
            onChange={(value) => setName(value)}
            placeholder="e.g. Division A, Special Employees"
          />
          <TextField
            variant="outlined"
            label="Description (optional)"
            value={description}
            onChange={(value) => setDescription(value)}
          />
          <Select
            variant="outlined"
            label="Tab"
            value={setId}
            onValueChange={setSetId}
            options={setOptions}
            className="w-full"
          />
          <ColorPicker value={color} onChange={setColor} label="Color" />
          {error && (
            <Typography variant="body-small" color="error">
              {error}
            </Typography>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : group ? "Save" : "Create group"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
