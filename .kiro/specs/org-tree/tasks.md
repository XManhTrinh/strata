# Implementation Plan: Org Tree

## Overview

Implement the `/org-tree` page incrementally: types and utilities first, then a mock repository (for development), then the data hook, then UI components (tree, unallocated list, modals, DnD), and finally the AI chat panel. The Convex backend will be wired in later — the `PersonRepository` interface ensures no component code needs to change when that happens. Each step wires into the previous one so there is no orphaned code.

## Tasks

- [x] 1. Install dependencies and read Next.js docs
  - Install `@dnd-kit/core`, `@dnd-kit/utilities`, `framer-motion`, and `fast-check` via npm (do NOT install convex yet — backend will be connected later)
  - Read `node_modules/next/dist/docs/` for any breaking-change notes relevant to App Router, server components, and client components before writing any page or layout code
  - _Requirements: 6.1, 6.2_

- [ ] 2. Define core types and utility functions
  - [x] 2.1 Create `lib/org-tree/types.ts` with `Person`, `TreeNode`, `PersonRepository`, `AIProvider`, and `ChatMessage` interfaces exactly as specified in the design
    - _Requirements: 6.1, 6.2, 8.15_
  - [x] 2.2 Create `lib/org-tree/tree.ts` with pure functions `buildTree(persons: Person[]): TreeNode[]`, `flattenTree(nodes: TreeNode[]): Person[]`, and `isDescendant(persons: Person[], ancestorId: string, descendantId: string): boolean`
    - `buildTree` must assign correct `depth` values starting at 0 for roots
    - _Requirements: 1.1, 1.2, 1.3, 3.6_
  - [ ]* 2.3 Write property test for `buildTree` / `flattenTree` round-trip
    - **Property 12: buildTree is a pure function — round-trip**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - Tag: `// Feature: org-tree, Property 12: buildTree round-trip`
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ]* 2.4 Write property test for root nodes having no parent
    - **Property 2: Root nodes have no parent**
    - **Validates: Requirements 1.2, 2.1**
    - Tag: `// Feature: org-tree, Property 2: Root nodes have no parent`
    - _Requirements: 1.2, 2.1_
  - [ ]* 2.5 Write property test for child depth exceeding parent depth
    - **Property 3: Child depth exceeds parent depth**
    - **Validates: Requirements 1.3**
    - Tag: `// Feature: org-tree, Property 3: Child depth exceeds parent depth`
    - _Requirements: 1.3_

- [ ] 3. Mock data repository
  - [x] 3.1 Create `lib/org-tree/MockPersonRepository.ts` implementing `PersonRepository` with in-memory state and realistic seed data (at least 10 people across multiple squads, hierarchy levels, and with varied titles)
    - All four operations (`fetchAll`, `create`, `update`, `delete`) must work against the in-memory store
    - This is the active repository used by the page until Convex is connected
    - _Requirements: 6.1, 6.2, 6.4_
  - [x] 3.2 Create `lib/org-tree/mock-data.ts` with seed data: people with `fullName`, `title`, `squads` (some with multiple), `salary`, and `parentId` forming a realistic org hierarchy with some unallocated people
    - _Requirements: 6.1_

- [ ] 3-convex. Convex backend (deferred — connect when ready)
  - [ ]* 3-convex.1 Run `npx convex dev --once` to scaffold the `convex/` directory; create `convex/schema.ts` with the `persons` table (`fullName`, `title`, `squads`, `salary`, `parentId`)
    - _Requirements: 6.3_
  - [ ]* 3-convex.2 Create `convex/persons.ts` with query `getAll` and mutations `create`, `update`, `remove`
    - _Requirements: 6.1, 6.3_
  - [ ]* 3-convex.3 Create `lib/org-tree/ConvexPersonRepository.ts` implementing `PersonRepository` using the generated Convex client hooks; swap it in at the page level to replace `MockPersonRepository`
    - _Requirements: 6.2, 6.3, 6.4_

- [ ] 4. `useOrgTree` hook
  - [x] 4.1 Create `lib/org-tree/useOrgTree.ts` accepting a `PersonRepository` instance; fetch persons on mount; derive `tree` and `unallocated` via `buildTree`; expose `reparent`, `editPerson`, `createPerson`, `deletePerson`, `loading`, and `error`
    - _Requirements: 1.5, 1.6, 2.2, 2.3, 3.7, 3.8_
  - [x] 4.2 Implement optimistic updates in `reparent`: apply the parentId change to local state immediately, call the repository, and roll back to the previous state on error
    - _Requirements: 3.8_
  - [ ]* 4.3 Write property test for optimistic update rollback on error
    - **Property 7: Optimistic update rollback on error**
    - **Validates: Requirements 3.8**
    - Tag: `// Feature: org-tree, Property 7: Optimistic update rollback on error`
    - _Requirements: 3.8_
  - [ ]* 4.4 Write property test for reparenting updating parentId
    - **Property 5: Reparenting updates parentId**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Tag: `// Feature: org-tree, Property 5: Reparenting updates parentId`
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]* 4.5 Write property test for tree remaining acyclic after any reparenting
    - **Property 6: Tree remains acyclic after any reparenting**
    - **Validates: Requirements 3.5, 3.6**
    - Tag: `// Feature: org-tree, Property 6: Tree remains acyclic after any reparenting`
    - _Requirements: 3.5, 3.6_
  - [ ]* 4.6 Write property test for unallocated list membership round-trip
    - **Property 4: Unallocated list membership round-trip**
    - **Validates: Requirements 2.2, 2.3**
    - Tag: `// Feature: org-tree, Property 4: Unallocated list membership round-trip`
    - _Requirements: 2.2, 2.3_

- [ ] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. `EditPersonModal` and `CreatePersonModal` components
  - [x] 6.1 Create `components/org-tree/EditPersonModal.tsx`: controlled modal pre-populated with the person's current `fullName`, `title`, `squads` (multi-value input), and `salary`; validate non-empty `fullName` before calling `onSubmit`; display inline repository errors; close on cancel without persisting
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7_
  - [ ]* 6.2 Write property test for edit modal pre-population
    - **Property 8: Edit modal pre-populated with current values**
    - **Validates: Requirements 4.1**
    - Tag: `// Feature: org-tree, Property 8: Edit modal pre-populated with current values`
    - _Requirements: 4.1_
  - [ ]* 6.3 Write property test for empty fullName rejection (edit modal)
    - **Property 9: Empty fullName is always rejected**
    - **Validates: Requirements 4.5, 5.6**
    - Tag: `// Feature: org-tree, Property 9: Empty fullName is always rejected`
    - _Requirements: 4.5, 5.6_
  - [ ]* 6.4 Write property test for valid submission calling repository with correct data (edit modal)
    - **Property 10: Valid submission calls repository with correct data**
    - **Validates: Requirements 4.3, 5.3**
    - Tag: `// Feature: org-tree, Property 10: Valid submission calls repository with correct data`
    - _Requirements: 4.3, 5.3_
  - [x] 6.5 Create `components/org-tree/CreatePersonModal.tsx`: same fields as edit modal, all optional except `fullName`; same validation and error display rules
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7, 5.8_
  - [ ]* 6.6 Write property test for new person appearing in correct location
    - **Property 11: New person appears in correct location**
    - **Validates: Requirements 5.4, 5.5**
    - Tag: `// Feature: org-tree, Property 11: New person appears in correct location`
    - _Requirements: 5.4, 5.5_

- [ ] 7. `OrgTree` and `UnallocatedList` components
  - [x] 7.1 Create `components/org-tree/OrgNode.tsx`: renders a single `motion.div` (with `layout` prop) showing `fullName` and `title`; includes an edit button that calls `onEdit`; is both a `useDraggable` source and a `useDroppable` target; renders connector lines to children via absolutely-positioned divs
    - _Requirements: 1.1, 1.3, 1.4, 3.4, 7.1, 7.2, 7.3_
  - [x] 7.2 Create `components/org-tree/OrgTree.tsx`: recursively renders `TreeNode[]` using `OrgNode`; wraps children lists in `AnimatePresence`; shows loading indicator when `loading` is true; shows error message when `error` is non-null
    - _Requirements: 1.2, 1.5, 1.6, 7.1, 7.2, 7.3_
  - [ ]* 7.3 Write property test for tree nodes displaying fullName and title
    - **Property 1: Tree nodes display fullName and title**
    - **Validates: Requirements 1.4, 2.4**
    - Tag: `// Feature: org-tree, Property 1: Tree nodes display fullName and title`
    - _Requirements: 1.4, 2.4_
  - [x] 7.4 Create `components/org-tree/UnallocatedList.tsx`: renders the flat unallocated persons list wrapped in `AnimatePresence`; each item is a `useDraggable` source and the list area is a `useDroppable` target; shows empty-state message when list is empty
    - _Requirements: 2.1, 2.4, 2.5, 3.2, 3.3, 7.4_

- [ ] 8. DnD wiring and `onDragEnd` handler
  - [x] 8.1 In the org-tree page (or a dedicated `DndLayer` component), wrap the tree and unallocated list in `DndContext`; implement `onDragEnd`: identify source and target, guard against self-drop and ancestor-drop via `isDescendant`, then call `reparent`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. `useAIChat` hook and `AIProvider` interface
  - [x] 10.1 Confirm `AIProvider` and `ChatMessage` interfaces are exported from `lib/org-tree/types.ts` (created in task 2.1); create `lib/org-tree/useAIChat.ts` accepting an `AIProvider` and `persons: Person[]`; hold `messages`, `loading`, `error`; implement `sendMessage` — guard against empty/whitespace input, append user message, call `provider.chat`, append assistant response, handle errors
    - _Requirements: 8.4, 8.5, 8.6, 8.7, 8.8, 8.14, 8.15_
  - [ ]* 10.2 Write property test for org data always passed as context
    - **Property 13: Org data always passed as context**
    - **Validates: Requirements 8.6**
    - Tag: `// Feature: org-tree, Property 13: Org data always passed as context`
    - _Requirements: 8.6_
  - [ ]* 10.3 Write property test for empty message never submitted
    - **Property 14: Empty message is never submitted**
    - **Validates: Requirements 8.5**
    - Tag: `// Feature: org-tree, Property 14: Empty message is never submitted`
    - _Requirements: 8.5_
  - [ ]* 10.4 Write property test for error state shown on AI provider failure
    - **Property 15: Error state shown on AI provider failure**
    - **Validates: Requirements 8.14**
    - Tag: `// Feature: org-tree, Property 15: Error state shown on AI provider failure`
    - _Requirements: 8.14_
  - [ ]* 10.5 Write property test for message history growing monotonically
    - **Property 16: Message history grows monotonically**
    - **Validates: Requirements 8.4, 8.8**
    - Tag: `// Feature: org-tree, Property 16: Message history grows monotonically`
    - _Requirements: 8.4, 8.8_

- [ ] 11. `AIChatPanel` component
  - [x] 11.1 Create `components/org-tree/AIChatPanel.tsx`: floating circular toggle button anchored bottom-right; `AnimatePresence` drives panel open/close animation; scrollable message history with distinct user/assistant styling; person cards for structured person lists in responses; typing indicator while loading; error display in thread; input disabled while loading
    - _Requirements: 8.1, 8.2, 8.3, 8.7, 8.8, 8.9, 8.14_

- [ ] 12. Assemble the `/org-tree` page
  - [x] 12.1 Read `node_modules/next/dist/docs/` for any App Router page/layout conventions that differ from Next.js 13/14 before creating the file
  - [x] 12.2 Create `app/org-tree/page.tsx`: instantiate `MockPersonRepository`; call `useOrgTree` and `useAIChat`; render `DndContext` wrapping `OrgTree`, `UnallocatedList`, `EditPersonModal`, `CreatePersonModal`, and `AIChatPanel`; wire all callbacks and state from the hooks to the components; add a "New Person" button that opens `CreatePersonModal`
    - When Convex is ready, only this file needs to change — swap `MockPersonRepository` for `ConvexPersonRepository`
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.2, 6.4, 8.1_

- [ ] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The Convex backend tasks (3-convex.*) are deferred — implement them when ready to connect the real backend; only `app/org-tree/page.tsx` needs to change (swap `MockPersonRepository` for `ConvexPersonRepository`)
- Each task references specific requirements for traceability
- Property tests use fast-check with a minimum of 100 iterations each
- All property tests must include the tag comment `// Feature: org-tree, Property N: <text>`
- All components depend only on the `PersonRepository` interface — never on a concrete implementation
