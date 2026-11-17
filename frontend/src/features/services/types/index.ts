import type { Database } from "@/integrations/supabase/types";
export type Service = Database["public"]["Tables"]["services"]["Row"];
