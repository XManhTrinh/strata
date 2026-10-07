# Implementation Plan — MUI v2 Regression Fixes

> Authoritative reference for all four bugs found after @vkieu/mui v2 migration.
> All paths are relative to `apps/web/src/`.

---

## Bug 1 — TextField `className="w-full"` (17 files)

The new `TextField` root is `inline-flex w-[280px] max-w-full`.
Add `className="w-full"` to **every** `<TextField>` that doesn't already have it.
Where a `className` already exists, use `cn()` to merge.

### `app/(auth)/login/page.tsx`
- L117 email TextField → add `className="w-full"`
- L133 password TextField → add `className="w-full"`

### `app/(auth)/register/page.tsx`
- L171 fullName TextField → add `className="w-full"`
- L183 companyName TextField → add `className="w-full"`
- L195 email TextField → add `className="w-full"`
- L207 password TextField → add `className="w-full"`
- L224 confirmPassword TextField → add `className="w-full"`

### `app/(dashboard)/admin/settings/page.tsx`
- L263 Company Name TextField → add `className="w-full"`
- L270 Workspace Slug TextField → add `className="w-full"`
- L331 Currency TextField → add `className="w-full"`
- L509 Reset confirmation TextField → add `className="w-full"`

### `app/(dashboard)/admin/org-structure/page.tsx`
- L293 Name TextField (inside dialog `space-y-4`) → add `className="w-full"`

### `app/(dashboard)/admin/org-unit-types/page.tsx`
- L312 Name TextField → add `className="w-full"`
- L322 Description TextField → add `className="w-full"`

### `app/(dashboard)/admin/positions/page.tsx`
- L370 Name TextField → add `className="w-full"`
- L380 Description TextField → add `className="w-full"`
- L477 Label TextField (inside `grid-cols-2`) → add `className="w-full"` (fills grid cell)
- L487 Display Name TextField (inside `grid-cols-2`) → add `className="w-full"`
- L496 Rank TextField (inside `grid-cols-2`) → add `className="w-full"`

### `app/(dashboard)/admin/roles/page.tsx`
- L214 Role Name TextField → add `className="w-full"`
- L215 Description TextField → add `className="w-full"`

### `app/(dashboard)/people/page.tsx`
All TextFields in add/edit member dialogs and Save View dialog:
- L795 Full Name (add form)
- L796 Email (add form)
- L804 Phone (add form)
- L805 Address (add form)
- L806 Date of Birth (add form)
- L823 Full Name (edit form)
- L824 Email (edit form)
- L825 Phone (edit form)
- L826 Address (edit form)
- L827 Date of Birth (edit form)
- L834 dynamic metadata TextField (inside `.map()` — add `className="w-full"`)
- L882 View Name TextField
→ Add `className="w-full"` to all of these.

### `features/calendar/components/EventForm.tsx`
- L126 Title TextField → add `className="w-full"`
- L157 Start Date TextField (inside `grid-cols-2`) → add `className="w-full"`
- L164 End Date TextField (inside `grid-cols-2`) → add `className="w-full"`
- L175 Start Time TextField (inside `grid-cols-2`) → add `className="w-full"`
- L182 End Time TextField (inside `grid-cols-2`) → add `className="w-full"`

### `features/calendar/components/LeaveRequestForm.tsx`
- L182 Start Date TextField (inside `grid-cols-2`) → add `className="w-full"`
- L189 End Date TextField (inside `grid-cols-2`) → add `className="w-full"`
- L205 Notes TextField → add `className="w-full"`

### `components/rate-cards/rate-card-dialog.tsx`
- L216 Rate card name TextField → add `className="w-full"`
- L352 Day rate TextField (inside `grid-cols-[40px_1fr_1fr_120px]`) → add `className="w-full"`
- L359 Working days TextField (inside same grid) → add `className="w-full"`

### `components/rate-cards/rate-card-set-dialog.tsx`
- L65 Tab name TextField → add `className="w-full"`
- L72 Description TextField → add `className="w-full"`

### `components/rate-cards/rate-card-group-dialog.tsx`
- L84 Group name TextField → add `className="w-full"`
- L91 Description TextField → add `className="w-full"`

### `components/ui/combo-box.tsx`
- L150 input TextField → add `className="w-full"`

### `components/ui/color-picker.tsx`
- L165 hex input TextField → add `className="w-full"`
  (Note: it already has `leadingIcon` prop — use `cn("w-full", className)` if needed, or just add `className="w-full"` alongside existing props)

### `components/ui/icon-picker.tsx`
- L231 search TextField → add `className="w-full"`

### `components/assistant/assistant-panel.tsx`
- L188 message input TextField → add `className="w-full"`

---

## Bug 2 — Icon inside Button children (13 files)

Move `<Icon>` out of `Button` children into `leadingIcon` or `trailingIcon` prop.
Drop `size={…}` from icons inside those slots.
Icon-only Buttons (no text at all) → convert to `<IconButton icon={<Icon name="…" />} …/>`.

### `app/(dashboard)/admin/settings/page.tsx`
- L486: `<Button … disabled><Icon name="delete_forever" size={18} />Delete</Button>`
  → add `leadingIcon={<Icon name="delete_forever" />}`, children = `"Delete"`, remove `<Icon>` from children

### `app/(dashboard)/dashboard/page.tsx`
- L179–183: Retry button
  → add `leadingIcon={<Icon name="refresh" />}`, children = `"Retry"`, remove inline Icon
- L304 Add Member: remove `<Icon name="person_add" size={20} />` from children, add `leadingIcon={<Icon name="person_add" />}`, remove `gap-3` from className
- L308 View Org Chart: same pattern with `account_tree`
- L312 Submit Leave: same pattern with `event_available`
- L316 Generate Report: same pattern with `description`
- L323 New Request: same pattern with `add` (variant="filled")

### `app/(dashboard)/admin/org-structure/page.tsx`
- L224 EmptyState "Create Unit": → `leadingIcon={<Icon name="add" />}`, children = `"Create Unit"`
- L486 Header "Create Unit": same fix

### `app/(dashboard)/admin/org-unit-types/page.tsx`
- L118 EmptyState "Create Type": → `leadingIcon={<Icon name="add" />}`, children = `"Create Type"`
- L515 Header "Create Type": → `leadingIcon={<Icon name="add" />}`, children = `"Create Type"` (keep `className="shrink-0"`)

### `app/(dashboard)/admin/positions/page.tsx`
- L151 EmptyState "Create Position": → `leadingIcon={<Icon name="add" />}`, children = `"Create Position"`
- L703 "Add Level": → `leadingIcon={<Icon name="trending_up" />}`, children = `"Add Level"`
- L707 "Create Position": → `leadingIcon={<Icon name="add" />}`, children = `"Create Position"`

### `app/(dashboard)/admin/roles/page.tsx`
- L115 "Add Admin": → `leadingIcon={<Icon name="shield_person" />}`, children = `{isAddingAdmin ? "Adding…" : "Add Admin"}`
- L120 "Create Role": → `leadingIcon={<Icon name="add" />}`, children = `"Create Role"`
- L189 EmptyState "Create your first role": → `leadingIcon={<Icon name="add" />}`, children = `"Create your first role"`
- L687 "Save": → `leadingIcon={<Icon name="save" />}`, children = `{bulkPermissionMutation.isPending ? "Saving..." : "Save"}`
- L695 "Duplicate": → `leadingIcon={<Icon name="content_copy" />}`, children = `"Duplicate"`
- L702 "Delete": → `leadingIcon={<Icon name="delete" />}`, children = `"Delete"`

### `app/(dashboard)/admin/features/page.tsx`
- L184 Details/Hide button: icon is AFTER text → use `trailingIcon={<Icon name={isExpanded ? "expand_less" : "expand_more"} />}`, children = `{isExpanded ? "Hide" : "Details"}`, remove `gap-1` from className

### `app/(dashboard)/people/page.tsx`
- L527 Export: → `leadingIcon={<Icon name="download" />}`, children = `"Export"`
- L532 Delete All: → `leadingIcon={<Icon name="delete_sweep" />}`, children = `"Delete All"`
- L535 Add Member: → `leadingIcon={<Icon name="person_add" />}`, children = `"Add Member"`
- L570–572 Delete View (icon-only, inside TooltipTrigger):
  → `<IconButton variant="standard" size="xs" className="text-error" icon={<Icon name="delete" />} onClick={() => handleDeleteView(selectedViewId)} aria-label="Delete view" />`
  (remove `Button` from import if no longer used)
- L578 Save View: → `leadingIcon={<Icon name="save" />}`, children = `"Save View"`
- L587 Columns: → `leadingIcon={<Icon name="view_column" />}`, children = `"Columns"`
- L671 Import in Settings (inside Link): → `leadingIcon={<Icon name="upload" />}`, children = `"Import in Settings"`
- L675 Add Member (empty state): → `leadingIcon={<Icon name="person_add" />}`, children = `"Add Member"`
- L691 Assign Role (batch): → `leadingIcon={<Icon name="shield" />}`, children = `"Assign Role"`
- L726 table row edit (icon-only): → `<IconButton variant="standard" size="xs" icon={<Icon name="edit" />} onClick={() => openEdit(person)} aria-label={...} />`
- L729 table row delete (icon-only): → `<IconButton variant="standard" size="xs" className="text-error hover:text-error" icon={<Icon name="delete" />} onClick={() => setDeleteId(person.id)} aria-label={...} />`
- L755 mobile edit (icon-only): → IconButton same as L726
- L758 mobile delete (icon-only): → IconButton same as L729
- L774 Previous (icon leading): → `leadingIcon={<Icon name="chevron_left" />}`, children = `"Previous"`
- L777 Next (icon trailing): → `trailingIcon={<Icon name="chevron_right" />}`, children = `"Next"`
- Import: add `IconButton` to `@vkieu/mui` import

### `app/(dashboard)/finance/rate-cards/page.tsx`
- L545 "Card" (group add): → `leadingIcon={<Icon name="add" />}`, children = `"Card"`
- L568 "Apply" (group apply): → `leadingIcon={<Icon name="playlist_add_check" />}`, children = `"Apply"`
- L631 Quick Demo Digital: → `leadingIcon={<Icon name="bolt" />}`, children = `{seedDemo.isPending ? "Adding…" : "Quick Demo Digital"}`
- L635 Quick Demo Consumer: → `leadingIcon={<Icon name="bolt" />}`, children = `{seedDemoConsumer.isPending ? "Adding…" : "Quick Demo Consumer"}`
- L639 New tab (header): → `leadingIcon={<Icon name="add" />}`, children = `"New tab"`
- L643 New rate card (header): → `leadingIcon={<Icon name="add" />}`, children = `"New rate card"`
- L665 Apply to matching members (toolbar): → `leadingIcon={<Icon name="playlist_add_check" />}`, children = `{applyCards.isPending ? "Applying…" : "Apply to matching members"}`
- L691 New tab (empty): → `leadingIcon={<Icon name="add" />}`, children = `"New tab"`
- L695 New rate card (empty): → `leadingIcon={<Icon name="add" />}`, children = `"New rate card"`
- L730 "Group" (tab): → `leadingIcon={<Icon name="create_new_folder" />}`, children = `"Group"`

### `features/calendar/CalendarView.tsx`
- L233 "New Event": → `leadingIcon={<Icon name="event" />}`, children = `"New Event"`
- L237 "Request Leave": → `leadingIcon={<Icon name="event_available" />}`, children = `"Request Leave"`

### `components/import/csv-import-dialog.tsx`
- L364 trigger "Import CSV": → `leadingIcon={<Icon name="upload" />}`, children = `"Import CSV"`
- L440 "Review Import": → `leadingIcon={<Icon name="arrow_forward" />}`, children = `"Review Import"`
- L447 "Back": → `leadingIcon={<Icon name="arrow_back" />}`, children = `"Back"`
- L450 "Import N Records": → `leadingIcon={<Icon name="upload" />}`, children = `{...Import ${importPreview?.rows.length ?? 0} Records}`

### `components/assistant/assistant-panel.tsx`
- L198–203 send icon-only Button: → `<IconButton icon={<Icon name="send" />} type="button" onClick={send} disabled={chat.isPending || !input.trim()} aria-label="Send message" />`
  - `IconButton` is already imported — remove `Button` from import since it's no longer used

---

## Bug 3 — Nested scroll inside DialogContent (2 files)

`DialogContent` already has `overflow-y-auto`. Remove `max-h-*` and `overflow-y-auto` from
the immediate child wrapper divs inside `<DialogContent>`. Keep all other classes.

### `components/rate-cards/rate-card-dialog.tsx`
- L215: `<div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">`
  → `<div className="space-y-5 pr-1">`

### `components/import/csv-import-dialog.tsx`
- L519: `<div data-mapping-scroll className="px-6 space-y-4 max-h-[55vh] overflow-y-auto">`
  → `<div data-mapping-scroll className="px-6 space-y-4">`
- L805: `<div className="px-6 space-y-4 max-h-[60vh] overflow-y-auto relative">`
  → `<div className="px-6 space-y-4 relative">`

---

## Bug 4 — FilterChip → AssistChip (14 files)

Decision rule applied per chip usage:
- **AssistChip**: pure display label/badge with no `onSelectedChange`, no filter logic.
- **Keep FilterChip**: interactive toggle controlling visible state — wire properly with `selected` + `onSelectedChange`.

### `app/(dashboard)/admin/settings/page.tsx`
- L294: `<FilterChip className="font-mono text-[11px]">{company?.id}</FilterChip>` — workspace ID display
  → **AssistChip**, keep className
- L377–381: five FilterChips (Members, Org Structure, Positions, Grades, Roles with leadingIcon)
  → **AssistChip** for all five, keep `leadingIcon` on each
- Import: add `AssistChip` to `@vkieu/mui` import; remove `FilterChip` (no remaining usages)

### `app/(dashboard)/admin/org-structure/page.tsx`
- L504: `<FilterChip defaultSelected className="shrink-0">{unitCount} … units</FilterChip>` — count badge
  → **AssistChip**, remove `defaultSelected`
- Import: swap `FilterChip` → `AssistChip`

### `app/(dashboard)/admin/features/page.tsx`
- L181: `<FilterChip defaultSelected={feature.enabled}>{feature.permissionsCount} permission{…}</FilterChip>` — info count
  → **AssistChip**, remove `defaultSelected`
- L322: `<FilterChip defaultSelected className="shrink-0">{enabledCount} enabled</FilterChip>` — count badge
  → **AssistChip**, remove `defaultSelected`
- Import: swap `FilterChip` → `AssistChip`

### `app/(dashboard)/admin/roles/page.tsx`
- L645: `<FilterChip defaultSelected className="text-[11px] h-6 px-2">System</FilterChip>` — badge
  → **AssistChip**, remove `defaultSelected`, keep className
- L674: `<FilterChip defaultSelected className="shrink-0">System</FilterChip>` — badge
  → **AssistChip**, remove `defaultSelected`
- L685: `<FilterChip defaultSelected className="shrink-0">{changeCount} unsaved</FilterChip>` — count indicator
  → **AssistChip**, remove `defaultSelected`
- Import: add `AssistChip` to `@vkieu/mui` import; remove `FilterChip`

### `app/(dashboard)/admin/org-unit-types/page.tsx`
- L195: `<FilterChip defaultSelected={!row.archived}>{row.archived ? "Archived" : "Active"}</FilterChip>` — status label
  → **AssistChip**, remove `defaultSelected`
- L254: same pattern in mobile TypeCard → **AssistChip**, remove `defaultSelected`
- L532: `<FilterChip defaultSelected className="shrink-0">{activeCount} active</FilterChip>` — count badge
  → **AssistChip**, remove `defaultSelected`
- Import: swap `FilterChip` → `AssistChip`

### `app/(dashboard)/admin/positions/page.tsx`
- L236: `<FilterChip defaultSelected={!row.archived}>{row.archived ? "Archived" : "Active"}</FilterChip>` — status label
  → **AssistChip**, remove `defaultSelected`
- L300: same in mobile PositionCard → **AssistChip**, remove `defaultSelected`
- L725: `<FilterChip defaultSelected className="shrink-0">{activeCount} active</FilterChip>` — count badge
  → **AssistChip**, remove `defaultSelected`
- Import: swap `FilterChip` → `AssistChip`

### `app/(dashboard)/people/page.tsx`
- L468: `{person.isSuperAdmin && <FilterChip defaultSelected>Admin</FilterChip>}` — role badge
  → **AssistChip**, remove `defaultSelected`
- L469: `{(person.roles ?? []).map((r) => <FilterChip key={r.id}>{r.name}</FilterChip>)}` — role name badges
  → **AssistChip**, keep `key` prop
- L690: `<FilterChip defaultSelected>{selectedIds.size} selected</FilterChip>` — count display
  → **AssistChip**, remove `defaultSelected`
- L886: `{visibleColumns.map((col) => <FilterChip key={col.key}>{col.label}</FilterChip>)}` — column labels
  → **AssistChip**, keep `key` prop
- Import: add `AssistChip`, remove `FilterChip`

### `app/(dashboard)/finance/budgets/page.tsx`
- L273: `<FilterChip>{stat.headcount} people</FilterChip>` — count badge
  → **AssistChip**
- Import: swap `FilterChip` → `AssistChip`

### `app/(dashboard)/finance/rate-cards/page.tsx`
- L139: `{card.isDefault && <FilterChip defaultSelected>Default</FilterChip>}` — status badge
  → **AssistChip**, remove `defaultSelected`
- L719: `<AssistChip leadingIcon={<Icon name="bolt" size={14} />}>Demo</AssistChip>` — already AssistChip
  → Remove `size={14}` from the Icon (chip controls icon sizing)
- Import: remove `FilterChip` (only 1 usage, now AssistChip); `AssistChip` already imported

### `components/flow-org/FlowOrgHeader.tsx`
- L147: `<FilterChip defaultSelected className="shrink-0">{searchResultCount} … results</FilterChip>` — count display
  → **AssistChip**, remove `defaultSelected`
- L170–178: FilterChips with `defaultSelected`, `trailingIcon={<Icon name="close" size={18} />}`, `onPress={() => deselectBranch(id)}` — these ARE interactive selected-filter chips that deselect on click
  → **Keep as FilterChip** but fix controlled wiring: replace `defaultSelected` with `selected={true}` and `onSelectedChange={() => deselectBranch(id)}`. Remove `size={18}` from the trailingIcon (chip controls icon sizing).
- Import: add `AssistChip`, keep `FilterChip`

### `components/import/csv-import-dialog.tsx`
All chips in MappingStep and PreviewStep components:
- L513 "Step 1 of 2" (defaultSelected + leadingIcon) → **AssistChip**, remove `defaultSelected`
- L514 column count (leadingIcon) → **AssistChip**
- L515 row count (leadingIcon) → **AssistChip**
- L819 "Step 2 of 2" (defaultSelected + leadingIcon) → **AssistChip**, remove `defaultSelected`
- L821 "Ready to import" (defaultSelected + leadingIcon + className) → **AssistChip**, remove `defaultSelected`, keep leadingIcon and className
- L869 Perm count (defaultSelected + leadingIcon) → **AssistChip**, remove `defaultSelected`
- L870 SubCon count (defaultSelected + leadingIcon) → **AssistChip**, remove `defaultSelected`
- L871 other type count (leadingIcon) → **AssistChip**
- L873–875 managers count (leadingIcon) → **AssistChip**
- L878–880 managers-not-in-import (leadingIcon + className) → **AssistChip**, keep className
- L882 salaries count (leadingIcon) → **AssistChip**
- L883 day rates count (leadingIcon) → **AssistChip**
- L898–900 org level counts per level (leadingIcon) → **AssistChip**, keep `key` prop
- Import: add `AssistChip`; remove `FilterChip` (no remaining usages)

### `features/calendar/CalendarView.tsx`
- L101–109: `<FilterChip defaultSelected={…} className={…}>{event.leaveRequest.status}</FilterChip>` — status badge
  → **AssistChip**, remove `defaultSelected`, keep `className`
- Import: swap `FilterChip` → `AssistChip`

### `features/calendar/components/LeaveBalancePanel.tsx`
- L40–42: `<FilterChip className="h-5 text-[10px] px-1.5 text-amber-800 …">Low</FilterChip>` — status badge
  → **AssistChip**, keep className
- L45–47: `<FilterChip className="h-5 text-[10px] px-1.5 text-error …">Depleted</FilterChip>` — status badge
  → **AssistChip**, keep className
- Import: change `FilterChip` → `AssistChip` in `@vkieu/mui` import

---

## Verification

After all changes:
```
cd /Users/xuan-manh.trinh/workplace/web/strata
tsc --noEmit -p apps/web/tsconfig.json
```
Must pass with zero errors.

```
pnpm --filter @strata/web build
```
Must exit 0.

Spot-checks:
- No `<Button` with a direct `<Icon` child: `grep -rn "<Button" apps/web/src --include="*.tsx" | xargs grep -l "<Icon"` should return 0 matches per affected file
- No `<TextField` without `w-full` inside a Card or Dialog
- No `overflow-y-auto` on immediate child of `<DialogContent>`
- No `<FilterChip defaultSelected>` where it's a pure display label
