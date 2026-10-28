// Temporary stand-in for the generated types: run `pnpm db:types` with the local Supabase stack
// running to replace this file. Never edit the generated file by hand.
type EmptySchema = {
  Tables: Record<string, never>;
  Views: Record<string, never>;
  Functions: Record<string, never>;
  Enums: Record<string, never>;
  CompositeTypes: Record<string, never>;
};

export type Database = {
  public: EmptySchema;
};
