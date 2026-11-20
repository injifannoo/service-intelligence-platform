import { supabaseAdmin } from "./client.server";

export async function requireSupabaseAuth() {
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized: Session is required");
  }

  return { userId: user.id, user };
}