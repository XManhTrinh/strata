# Windmorph notes

Things Strata works around that belong in Windmorph. Strata doesn't change Windmorph; each entry
says what's wrong, where Strata works around it, and what to remove once Windmorph is fixed.

## Open

### Dialog content clips an outlined field's label

- **What:** `DialogContent` scrolls (`overflow-y: auto`) with no top padding. An outlined field
  (`DateField`, an outlined `TextField`) draws its label across its top edge, so as the first field
  in a dialog its label is cut off.
- **Fix in Windmorph:** give `DialogContent` about 8px of top padding (and take the same off the
  title's bottom spacing), or a `scroll-padding-top`, so content above the first field shows.
- **Strata's workaround:** `pt-2` on the `DialogContent` of `FormDialog`
  (`src/components/ui/form-dialog.tsx`) and of the other dialogs with fields (`new-role-dialog`,
  `approvals-list`, `erase-dialog`, `invite-dialog`, `ownership-dialogs`, `member-roles-dialog`,
  `role-units-dialog`, `unit-dialog`, `options-dialog`). Remove them once fixed.
- **Found:** 2026-11-02 (Change pay).

### No anchored popover surface

- **What:** there's no popover for a panel anchored to a button (a notifications list, an account
  card). Only `Menu`, `Select`'s option popover, tooltips, dialogs and sheets.
- **Fix in Windmorph:** a `Popover` (anchored to its trigger, placement like `Menu`, focus
  managed, light dismiss), full screen on compact windows.
- **Strata's workaround:** the notifications dropdown is a `Dialog` with a transparent scrim and
  its positioner pushed to the top end (`src/features/notifications/notification-bell.tsx`). It
  doesn't follow the bell if the header moves. Switch to `Popover` once there is one.
- **Found:** 2026-11-02.

### A connected button group always fills its container

- **What:** `ButtonGroup variant="connected"` is `w-full` with equal columns, which suits a group
  that is the row's only content but not one beside other controls (a calendar's view switcher).
- **Fix in Windmorph:** a prop (or the default) to size the group to its buttons.
- **Strata's workaround:** `className="w-auto"` on the view switcher in
  `src/features/time/components/time-off-page.tsx`. Remove once the prop exists.
- **Found:** 2026-11-02.

### No 48px avatar

- **What:** `Avatar` sizes are 24, 32, 40, 56, 72 and 96px; 48px (common for a header account
  button or a list's leading avatar) isn't one.
- **Fix in Windmorph:** consider an `lg` of 48px or an extra step.
- **Strata's workaround:** none; the header uses 40px (`md`).
- **Found:** 2026-11-02.

## Testing notes (not bugs)

- `Checkbox` draws its box over the native input, so Playwright's click on the input is
  intercepted; tests click the checkbox's label instead (`e2e/time-calendar.spec.ts`).
- A `DateField` shows its format ("MM/DD/YYYY") as supporting text unless `supportingText=""`;
  filters pass `""` so they line up with the fields beside them.

## Fixed

None yet.
