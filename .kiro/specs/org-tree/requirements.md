# Requirements Document

## Introduction

This feature adds an Org Tree page to the Next.js application. It visualises people in a hierarchical tree structure, supports drag-and-drop reparenting, inline editing of person details, person creation, and an unallocated list for people not yet assigned to a parent. The data layer is abstracted behind a repository interface so the current Convex backend can be swapped for any other backend in the future.

## Glossary

- **Org_Tree**: The full hierarchical visualisation of people and their reporting relationships rendered on the `/org-tree` page.
- **Person**: An entity with at minimum a unique identifier, a full name, a job title, a list of squad memberships, a salary, and a parent reference.
- **Node**: A single Person rendered as a card within the Org_Tree.
- **Parent**: The Person to whom another Person directly reports.
- **Child**: A Person who directly reports to a given Parent.
- **Unallocated_List**: The panel that displays all Persons who have no Parent assigned.
- **Repository**: The backend-agnostic data-access interface that the UI consumes. Concrete implementations (e.g. Convex) satisfy this interface.
- **Edit_Modal**: The dialog used to view and modify the details of a Person.
- **Create_Modal**: The dialog used to create a new Person.
- **Drag_Source**: The Node or Unallocated_List item being dragged.
- **Drop_Target**: The Node or Unallocated_List area onto which a Drag_Source is dropped.
- **AI_Chat_Panel**: The floating chat interface on the Org_Tree page that allows users to ask natural language questions about the org data.
- **AI_Provider**: The backend-agnostic interface through which the AI_Chat_Panel sends messages and receives responses.
- **Chat_Message**: A single message in the conversation, with a role of either `user` or `assistant` and a text content string.

---

## Requirements

### Requirement 1: Display the Org Tree

**User Story:** As a user, I want to see all people displayed in a hierarchical tree, so that I can understand the reporting structure of the organisation.

#### Acceptance Criteria

1. THE Org_Tree SHALL render each Person as a Node connected to its Parent by a visible line.
2. THE Org_Tree SHALL display the root-level Persons (those with no Parent) at the top of the hierarchy.
3. WHEN the Org_Tree contains more than one level of hierarchy, THE Org_Tree SHALL visually indent or offset Child Nodes relative to their Parent Node.
4. THE Org_Tree SHALL display at minimum the fullName and title of each Person within its Node.
5. WHEN the Org_Tree data is loading, THE Org_Tree SHALL display a loading indicator in place of the tree.
6. IF the Repository returns an error while fetching Persons, THEN THE Org_Tree SHALL display a descriptive error message to the user.

---

### Requirement 2: Unallocated List

**User Story:** As a user, I want to see people who have no parent in a separate list, so that I know who still needs to be placed in the hierarchy.

#### Acceptance Criteria

1. THE Unallocated_List SHALL display all Persons whose Parent field is null or undefined.
2. WHEN a Person is assigned a Parent, THE Unallocated_List SHALL remove that Person from the list without a full page reload.
3. WHEN a Person's Parent is removed, THE Unallocated_List SHALL add that Person to the list without a full page reload.
4. THE Unallocated_List SHALL display the fullName and title of each unallocated Person.
5. WHILE the Unallocated_List contains zero Persons, THE Unallocated_List SHALL display an empty-state message indicating there are no unallocated people.

---

### Requirement 3: Drag and Drop Reparenting

**User Story:** As a user, I want to drag a person from one parent to another, so that I can reorganise the hierarchy without manually editing fields.

#### Acceptance Criteria

1. WHEN a user drags a Node and drops it onto another Node, THE Org_Tree SHALL update the dragged Person's Parent to the Drop_Target Person.
2. WHEN a user drags a Node and drops it onto the Unallocated_List, THE Org_Tree SHALL set the dragged Person's Parent to null.
3. WHEN a user drags an item from the Unallocated_List and drops it onto a Node, THE Org_Tree SHALL set the dragged Person's Parent to the Drop_Target Person.
4. WHEN a drag operation is in progress, THE Org_Tree SHALL provide a visual indicator on valid Drop_Targets.
5. IF a user drops a Node onto itself, THEN THE Org_Tree SHALL ignore the drop and leave the Person's Parent unchanged.
6. IF a user drops a Node onto one of its own descendants, THEN THE Org_Tree SHALL ignore the drop and leave the Person's Parent unchanged, preventing circular hierarchies.
7. WHEN a drag-and-drop reparenting operation completes, THE Repository SHALL persist the updated Parent for the moved Person.
8. IF the Repository returns an error while persisting a reparenting operation, THEN THE Org_Tree SHALL revert the tree to its state before the drag and display a descriptive error message.

---

### Requirement 4: Edit Person Details

**User Story:** As a user, I want to edit the details of a person, so that I can keep the organisation data accurate.

#### Acceptance Criteria

1. WHEN a user activates the edit action on a Node, THE Edit_Modal SHALL open pre-populated with the current details of that Person.
2. THE Edit_Modal SHALL allow the user to modify the Person's fullName, title, squads, and salary fields.
3. WHEN the user submits the Edit_Modal with valid data, THE Repository SHALL persist the updated Person details.
4. WHEN the Repository confirms the update, THE Edit_Modal SHALL close and THE Org_Tree SHALL reflect the updated Person details without a full page reload.
5. IF the user submits the Edit_Modal with an empty fullName field, THEN THE Edit_Modal SHALL display a validation error and SHALL NOT submit the data to the Repository.
6. WHEN the user cancels or dismisses the Edit_Modal, THE Edit_Modal SHALL close without persisting any changes.
7. IF the Repository returns an error while persisting an edit, THEN THE Edit_Modal SHALL display a descriptive error message and SHALL remain open.

---

### Requirement 5: Create a New Person

**User Story:** As a user, I want to create a new person, so that I can add new members to the organisation.

#### Acceptance Criteria

1. THE Org_Tree page SHALL provide a control that opens the Create_Modal.
2. THE Create_Modal SHALL allow the user to enter at minimum a fullName and a title for the new Person, and optionally one or more squads and a salary.
3. WHEN the user submits the Create_Modal with valid data, THE Repository SHALL persist the new Person.
4. WHEN the Repository confirms creation and no Parent has been specified, THE Unallocated_List SHALL add the new Person without a full page reload.
5. WHEN the Repository confirms creation and a Parent has been specified, THE Org_Tree SHALL add the new Person as a Child of the specified Parent without a full page reload.
6. IF the user submits the Create_Modal with an empty fullName field, THEN THE Create_Modal SHALL display a validation error and SHALL NOT submit the data to the Repository.
7. WHEN the user cancels or dismisses the Create_Modal, THE Create_Modal SHALL close without persisting any data.
8. IF the Repository returns an error while persisting a new Person, THEN THE Create_Modal SHALL display a descriptive error message and SHALL remain open.

---

### Requirement 6: Backend-Agnostic Repository Interface

**User Story:** As a developer, I want the data layer to be abstracted behind an interface, so that the backend can be replaced without rewriting UI components.

#### Acceptance Criteria

1. THE Repository SHALL expose at minimum the following operations: fetch all Persons, create a Person, update a Person, and delete a Person.
2. THE Org_Tree page and its components SHALL depend only on the Repository interface, not on any concrete backend implementation.
3. WHERE a Convex backend is configured, THE Repository SHALL provide a Convex-backed implementation that satisfies the Repository interface.
4. WHEN the concrete Repository implementation is swapped, THE Org_Tree page SHALL function correctly without changes to its component code.

---

### Requirement 8: AI Chat Assistant

**User Story:** As a user, I want to ask natural language questions about the org data, so that I can quickly find people by squad, role, or reporting line.

#### Acceptance Criteria

1. THE Org_Tree page SHALL display a floating button in the bottom-right corner that opens and closes the AI_Chat_Panel.
2. WHEN the floating button is activated, THE AI_Chat_Panel SHALL open and display the conversation history and a text input field.
3. WHEN the floating button is activated while the AI_Chat_Panel is open, THE AI_Chat_Panel SHALL close.
4. WHEN the user submits a non-empty message, THE AI_Chat_Panel SHALL append the message to the conversation history and send it to the AI_Provider.
5. IF the user attempts to submit an empty or whitespace-only message, THEN THE AI_Chat_Panel SHALL NOT send the message to the AI_Provider.
6. WHEN a message is sent to the AI_Provider, THE AI_Chat_Panel SHALL pass the current full list of Persons as context alongside the conversation history.
7. WHILE the AI_Provider is processing a request, THE AI_Chat_Panel SHALL display a loading indicator and disable the input field.
8. WHEN the AI_Provider returns a response, THE AI_Chat_Panel SHALL append the response as an assistant Chat_Message to the conversation history.
9. WHEN the AI_Provider response includes a list of Persons, THE AI_Chat_Panel SHALL render those Persons as structured cards rather than raw text.
10. THE AI_Chat_Panel SHALL support queries that filter Persons by squad membership (e.g. "show me people in PLP squad").
11. THE AI_Chat_Panel SHALL support queries that filter Persons by title or role (e.g. "I need a designer from PLP").
12. THE AI_Chat_Panel SHALL support queries about reporting lines (e.g. "who reports to [person]").
13. THE AI_Chat_Panel SHALL support queries that count Persons within a group (e.g. "how many people are in [squad]").
14. IF the AI_Provider returns an error, THEN THE AI_Chat_Panel SHALL display a descriptive error message in the conversation and re-enable the input field.
15. THE AI_Provider interface SHALL be defined independently of any specific AI service, so that the concrete implementation can be swapped without changes to the AI_Chat_Panel or useAIChat hook.

---

### Requirement 7: Animated Transitions

**User Story:** As a user, I want tree changes to be visually animated, so that I can follow what changed in the hierarchy.

#### Acceptance Criteria

1. WHEN a Node is added to the Org_Tree, THE Org_Tree SHALL animate the Node's entrance using Framer Motion.
2. WHEN a Node is removed from the Org_Tree, THE Org_Tree SHALL animate the Node's exit using Framer Motion.
3. WHEN a Node changes its position in the tree due to a reparenting operation, THE Org_Tree SHALL animate the layout change using Framer Motion layout animations.
4. WHEN an item is added to or removed from the Unallocated_List, THE Unallocated_List SHALL animate the change using Framer Motion.
