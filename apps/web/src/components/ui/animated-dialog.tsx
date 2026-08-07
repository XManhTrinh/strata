/**
 * AnimatedDialog is now just a re-export of Dialog.
 * Kept as an alias so existing imports don't break.
 */
export {
  Dialog as AnimatedDialog,
  DialogPortal as AnimatedDialogPortal,
  DialogOverlay as AnimatedDialogOverlay,
  DialogClose as AnimatedDialogClose,
  DialogTrigger as AnimatedDialogTrigger,
  DialogContent as AnimatedDialogContent,
  DialogHeader as AnimatedDialogHeader,
  DialogFooter as AnimatedDialogFooter,
  DialogTitle as AnimatedDialogTitle,
  DialogDescription as AnimatedDialogDescription,
} from "./dialog";
