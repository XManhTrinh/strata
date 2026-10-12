"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Button,
} from "@vkieu/windmorph";
import { ColorPicker } from "@/components/ui/color-picker";
import type { RateCardSet, UpsertRateCardSetInput } from "@/services";

const DEFAULT_COLOR = "#6750A4";

export interface RateCardSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing set to rename, or null to create a new one. */
  set: RateCardSet | null;
  onSubmit: (input: UpsertRateCardSetInput) => void;
  isSubmitting?: boolean;
}

export function RateCardSetDialog({
  open,
  onOpenChange,
  set,
  onSubmit,
  isSubmitting,
}: RateCardSetDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(set?.name ?? "");
    setDescription(set?.description ?? "");
    setColor(set?.color ?? DEFAULT_COLOR);
    setError(null);
  }, [open, set]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle>{set ? "Rename tab" : "New tab"}</DialogTitle>
      <DialogContent>
        <p className="mb-4">Tabs are the top level (e.g. &ldquo;Digital&rdquo;). Each tab holds groups, and groups hold rate cards. Tabs don&apos;t affect matching.</p>
        <div className="space-y-4">
          <TextField
            variant="outlined"
            label="Tab name"
            className="w-full"
            value={name}
            onChange={(value) => setName(value)}
            placeholder="e.g. Digital, Infrastructure"
          />
          <TextField
            variant="outlined"
            label="Description (optional)"
            className="w-full"
            value={description}
            onChange={(value) => setDescription(value)}
          />
          <ColorPicker value={color} onChange={setColor} label="Color" />
          {error && (
            <p className="text-body-small text-error">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : set ? "Save" : "Create tab"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
