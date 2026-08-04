"use client";

import { useState, useCallback, useEffect } from "react";

interface ReparentOperation {
  personId: string;
  previousParentId: string | null;
  newParentId: string | null;
}

const MAX_STACK_SIZE = 20;

interface UseUndoRedoOptions {
  reparent: (
    draggedId: string,
    newParentId: string | null,
    moveWithChildren?: boolean
  ) => Promise<void>;
}

export function useUndoRedo({ reparent }: UseUndoRedoOptions) {
  const [undoStack, setUndoStack] = useState<ReparentOperation[]>([]);
  const [redoStack, setRedoStack] = useState<ReparentOperation[]>([]);

  const pushOperation = useCallback((op: ReparentOperation) => {
    setUndoStack((prev) => {
      const next = [...prev, op];
      if (next.length > MAX_STACK_SIZE) next.shift();
      return next;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback(async () => {
    const op = undoStack[undoStack.length - 1];
    if (!op) return;
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => {
      const next = [...prev, op];
      if (next.length > MAX_STACK_SIZE) next.shift();
      return next;
    });
    await reparent(op.personId, op.previousParentId, true);
  }, [undoStack, reparent]);

  const redo = useCallback(async () => {
    const op = redoStack[redoStack.length - 1];
    if (!op) return;
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => {
      const next = [...prev, op];
      if (next.length > MAX_STACK_SIZE) next.shift();
      return next;
    });
    await reparent(op.personId, op.newParentId, true);
  }, [redoStack, reparent]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z") {
        e.preventDefault();
        void redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        void undo();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return { undo, redo, canUndo, canRedo, pushOperation };
}
