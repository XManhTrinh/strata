# Requirements Document

## Introduction

This specification covers a deep audit of all Material Design 3 Expressive Dialog variants in the `@windmorph/react` component library and the Strata application. The goal is to ensure complete M3 Expressive spec compliance across five dialog variants (basic, icon, full-screen, alert, scrollable), verify all variant configurations are supported, and apply remaining visual tweaks to align the Strata dialog usage with M3 Expressive guidelines for web/React.

The current `@windmorph/react` Dialog component supports basic, icon, and full-screen variants via Radix UI primitives. This audit identifies gaps (alert dialog variant, scrollable content handling) and ensures visual fidelity with the M3 Expressive specification for all variants. Key M3 Expressive changes from base M3 include: tonal elevation (no drop shadows), spring-based physics motion (replacing easing+duration), semantic shape tokens, and updated padding structures.

## Glossary

- **Dialog_Component**: The `DialogContent` React component in `@windmorph/react` that renders M3-compliant dialog containers using Radix UI Dialog primitives
- **Basic_Dialog**: An M3 dialog with title, supporting text, and action buttons using start-aligned layout with 28dp corner radius
- **Icon_Dialog**: An M3 dialog with a hero icon centered above the title, triggering center-aligned layout for title and description
- **Full_Screen_Dialog**: An M3 dialog that occupies the entire viewport on mobile (0dp radius) with a 56dp header bar containing a close icon, falling back to a centered dialog on larger screens
- **Alert_Dialog**: An M3 dialog that uses `role="alertdialog"` for critical confirmations, preventing dismissal via outside click or Escape key unless explicitly allowed
- **Scrollable_Dialog**: An M3 dialog with content that exceeds the viewport height, showing a divider between the header and scrollable body, and between the scrollable body and action buttons
- **Scrim**: The semi-transparent overlay behind the dialog (32% opacity of on-surface color per M3 spec)
- **M3_Spec**: Material Design 3 Expressive component specifications published by Google defining visual and behavioral requirements for dialogs, using tonal elevation, spring physics motion, and semantic shape tokens
- **Tonal_Elevation**: M3 Expressive elevation model where hierarchy is conveyed through surface color tints (e.g., `surface-container-high`) rather than drop shadows
- **Spring_Motion**: M3 Expressive physics-based animation system that replaces fixed easing curves and durations with spring interpolation for natural, fluid motion
- **Shape_Token**: Semantic design tokens (e.g., `corner-extra-large` = 28px) that abstract shape values for future theming and shape morphing support
- **Strata_Application**: The web frontend at `apps/web/` that consumes the `@windmorph/react` component library
- **Radix_Dialog**: The `@radix-ui/react-dialog` primitive library providing accessible dialog behavior (focus trap, portal, overlay)

## Requirements

### Requirement 1: Basic Dialog Variant

**User Story:** As a developer, I want the basic dialog variant to match all M3 visual specifications, so that the dialog renders with correct spacing, typography, and alignment.

#### Acceptance Criteria

1. THE Dialog_Component SHALL render the basic dialog container with `surface-container-high` background color (tonal elevation — no drop shadow) and the `corner-extra-large` shape token (28px corner radius)
2. THE Dialog_Component SHALL apply headline padding of 6px top, 24px left/right, and 13px bottom to the title section
3. THE Dialog_Component SHALL apply content padding of 20px top and 24px left/right to the supporting text section
4. THE Dialog_Component SHALL apply actions padding of 16px top and 24px left/right/bottom to the action buttons section
5. THE Dialog_Component SHALL enforce a minimum width of 280px and a maximum width of 560px for the basic dialog
6. THE Dialog_Component SHALL constrain the basic dialog container to a maximum height of 90vh to prevent the dialog from exceeding the viewport
7. THE Dialog_Component SHALL render the title using Headline Small typography (24px font-size, 32px line-height, 400 weight)
8. THE Dialog_Component SHALL render the supporting text using Body Medium typography (14px font-size, 20px line-height, 400 weight, 0.25px letter-spacing) with `on-surface-variant` color
9. THE Dialog_Component SHALL render action buttons end-aligned with 8px gap between buttons
10. WHEN no `icon` prop is provided, THE Dialog_Component SHALL use start-aligned (left-aligned) text layout for the title and description
11. THE Dialog_Component SHALL NOT render any box-shadow (elevation is expressed through tonal surface color only, per M3 Expressive guidelines)

### Requirement 2: Icon Dialog Variant

**User Story:** As a developer, I want the icon dialog variant to center-align content when a hero icon is present, so that the dialog matches M3 icon dialog specifications.

#### Acceptance Criteria

1. WHEN the `icon` prop is provided, THE Dialog_Component SHALL render the icon horizontally centered above the title with 24dp width and 24dp height
2. WHEN the `icon` prop is provided, THE Dialog_Component SHALL apply the `secondary` color token to the hero icon
3. WHEN the `icon` prop is provided, THE Dialog_Component SHALL center-align the title and description text
4. WHEN the `icon` prop is provided, THE Dialog_Component SHALL apply a 16dp gap between the icon and the title
5. WHEN the `icon` prop is provided, THE Dialog_Component SHALL maintain the same container dimensions (280px min-width, 560px max-width), the same section-specific padding structure, `surface-container-high` background (no shadow), and `corner-extra-large` shape token (28px) as the basic variant

### Requirement 3: Full-Screen Dialog Variant

**User Story:** As a developer, I want the full-screen dialog to fill the viewport on mobile and fall back to a centered dialog on larger screens, so that it handles complex tasks across breakpoints.

#### Acceptance Criteria

1. WHEN the `fullScreen` prop is true on viewports below the `sm` breakpoint (640px), THE Dialog_Component SHALL render with 0dp corner radius and dimensions of 100% width and 100% height filling the entire viewport (inset 0)
2. WHEN the `fullScreen` prop is true on viewports below the `sm` breakpoint, THE Dialog_Component SHALL render a 56dp-height header bar containing a close icon (24dp) and a start-aligned headline using Title Large typography (22px/28px line-height, 400 weight)
3. WHEN the user activates the close icon in the full-screen header bar, THE Dialog_Component SHALL dismiss the dialog
4. WHEN the `fullScreen` prop is true on viewports at or above the `sm` breakpoint, THE Dialog_Component SHALL render as a centered dialog with `corner-extra-large` shape token (28px corner radius), 280px minimum width, 560px maximum width, and M3 Expressive section-specific padding
5. WHEN the `fullScreen` prop is true on viewports below the `sm` breakpoint, THE Dialog_Component SHALL use a spring-based slide-from-bottom animation on open and a spring-based slide-to-bottom animation on close (using M3 Expressive physics motion with spring parameters: stiffness ~300, damping ~25)
6. WHEN the `fullScreen` prop is true, THE Dialog_Component SHALL render the content area with overflow-y scrolling and 24dp padding on top, left, and right sides
7. THE Dialog_Component SHALL apply `surface-container-high` background to the full-screen variant container

### Requirement 4: Alert Dialog Variant

**User Story:** As a developer, I want an alert dialog variant for critical confirmations that prevents accidental dismissal, so that destructive or irreversible actions require explicit user choice.

#### Acceptance Criteria

1. WHEN the `alert` prop is true, THE Dialog_Component SHALL render with `role="alertdialog"` on the content container
2. WHEN the `alert` prop is true, THE Dialog_Component SHALL prevent dismissal via clicking outside the dialog (disable overlay close) and the dialog SHALL remain open and visible
3. WHEN the `alert` prop is true, THE Dialog_Component SHALL prevent dismissal via the Escape key and the dialog SHALL remain open and visible
4. WHEN the `alert` prop is true, THE Dialog_Component SHALL only close when the user activates one of the action buttons rendered inside the dialog footer
5. IF the `alert` prop is true, THEN THE Dialog_Component SHALL apply the same container dimensions (280px min-width, 560px max-width), `corner-extra-large` shape token (28px), section-specific padding, `surface-container-high` background (no shadow), and typography as the basic or icon variant
6. WHEN the `alert` prop is true, THE Dialog_Component SHALL set `aria-labelledby` referencing the dialog title element's `id` and `aria-describedby` referencing the dialog description element's `id`
7. WHEN the `alert` prop is true and the dialog opens, THE Dialog_Component SHALL place initial focus on the first action button within the dialog footer

### Requirement 5: Scrollable Dialog Variant

**User Story:** As a developer, I want dialogs with long content to handle overflow gracefully with visible scroll indicators, so that users can access all content without the dialog exceeding the viewport.

#### Acceptance Criteria

1. THE Dialog_Component SHALL constrain the dialog container to a maximum height of 90vh, reserving space for the title section and action buttons outside the scrollable region
2. WHEN the content area's scroll height exceeds its visible height (scrollHeight > clientHeight), THE Dialog_Component SHALL enable vertical scrolling on the content area positioned between the title section and the action buttons
3. WHEN the content area's scroll height exceeds its visible height, THE Dialog_Component SHALL render a 1px solid divider using the `outline-variant` color token at the bottom edge of the title section (between title and scrollable content)
4. WHEN the content area's scroll height exceeds its visible height, THE Dialog_Component SHALL render a 1px solid divider using the `outline-variant` color token at the top edge of the action buttons (between scrollable content and action buttons)
5. WHILE the user scrolls the content area, THE Dialog_Component SHALL keep the title section and action buttons in fixed positions that do not scroll with the content
6. WHEN the content area's scroll height is less than or equal to its visible height, THE Dialog_Component SHALL hide both dividers (no divider rendered between title and content, or between content and action buttons)
7. WHEN the viewport is resized causing the content area to transition between overflowing and non-overflowing states, THE Dialog_Component SHALL add or remove the dividers accordingly without requiring the dialog to be reopened
8. THE Dialog_Component SHALL apply `overflow-y: auto` to the scrollable content area so that the scrollbar is only visible when content overflows

### Requirement 6: Scrim and Overlay Behavior

**User Story:** As a developer, I want the dialog overlay (scrim) to match M3 specifications, so that the background content is appropriately obscured during dialog display.

#### Acceptance Criteria

1. THE Dialog_Component SHALL render the scrim with `on-surface` color at 32% opacity
2. WHEN the dialog opens, THE Dialog_Component SHALL animate the scrim with a spring-based fade-in using M3 Expressive physics motion (spring parameters: stiffness ~300, damping ~30, producing approximately 150ms settling time)
3. WHEN the dialog closes, THE Dialog_Component SHALL animate the scrim with a spring-based fade-out using M3 Expressive physics motion (spring parameters: stiffness ~400, damping ~35, producing approximately 100ms settling time)
4. THE Dialog_Component SHALL render the scrim as a fixed-position element with inset 0 (top, right, bottom, left all set to 0) at z-index 50 covering the full viewport
5. THE Dialog_Component SHALL ensure the scrim blocks pointer events on all content beneath it while the dialog is open
6. WHEN the `alert` prop is NOT true, THE Dialog_Component SHALL dismiss the dialog when the user clicks on the scrim overlay

### Requirement 7: Strata Application Dialog Migration

**User Story:** As a developer, I want the Strata application to use the `@windmorph/react` Dialog component consistently for all dialog use cases, so that the UI is visually cohesive and follows M3 guidelines.

#### Acceptance Criteria

1. THE Strata_Application SHALL replace the custom `ConfirmDialog` component in `packages/ui/` with the `@windmorph/react` Dialog component, using `role="alertdialog"` on the DialogContent element and providing both a confirm and cancel action button in the DialogFooter for confirmation scenarios
2. WHEN the Strata_Application renders a delete confirmation, THE Strata_Application SHALL use the Dialog_Component with the `icon` prop set to a delete-themed icon name and with `role="alertdialog"` on the DialogContent element
3. WHEN a dialog contains a form with 5 or more input fields (text fields, selects, checkboxes, radio buttons, or textareas), THE Strata_Application SHALL render the Dialog_Component with the `fullScreen` prop enabled
4. WHEN dialog body content height exceeds the available viewport height minus the dialog header and footer, THE Strata_Application SHALL ensure the dialog content area is scrollable by applying `overflow-y: auto` with a maximum height constraint equal to `90vh` minus the combined height of the dialog header, footer, and padding

### Requirement 8: Documentation and Showcase Coverage

**User Story:** As a developer, I want the documentation site to showcase all five dialog variants with interactive examples, so that consumers of the library can understand available configurations.

#### Acceptance Criteria

1. THE Documentation_Page SHALL include a Showcase section for each of the five dialog variants (basic, icon, full-screen, alert, and scrollable) where each section contains a trigger button that opens the dialog and allows the user to dismiss it
2. THE Documentation_Page SHALL display a copyable source code snippet for each Showcase section, toggled via a code-visibility control within that section
3. THE Documentation_Page SHALL include a props reference table listing every prop accepted by the Dialog_Component (including `fullScreen`, `icon`, `alert`, and `showClose`) with columns for prop name, type, default value, and description
4. WHEN a user clicks the trigger button of a documentation example, THE Documentation_Page SHALL open the corresponding dialog variant with the animation, scrim, and dismissal behavior defined in Requirements 1 through 6 for that variant
5. THE Documentation_Page SHALL include an example for the alert variant that demonstrates blocked outside-click and Escape-key dismissal, and an example for the scrollable variant that demonstrates visible dividers and scrollable content area
