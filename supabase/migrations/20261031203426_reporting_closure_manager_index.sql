-- Deleting a person cascades to their reporting lines as a manager. Without an index matching
-- that foreign key (workspace_id, manager_member_id), the cascade's generic plan scans the whole
-- workspace's reporting lines for each person: about 150 ms each at 100k people.
create index reporting_closure_workspace_manager_idx
  on public.reporting_closure (workspace_id, manager_member_id);
