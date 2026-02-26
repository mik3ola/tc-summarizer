// @ts-nocheck
// Supabase Edge Function: Process Hard Deletions (Cron)
// Deletes auth.users for profiles where deletion_scheduled_for has passed.
// Secured by CRON_SECRET.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("authorization") || "";
  const providedSecret = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!cronSecret || providedSecret !== cronSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date().toISOString();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id")
      .not("deletion_scheduled_for", "is", null)
      .lte("deletion_scheduled_for", now);

    if (error) {
      console.error("Query error:", error);
      return json({ error: "Failed to query profiles" }, 500);
    }

    const deleted: string[] = [];
    const errors: { user_id: string; error: string }[] = [];

    for (const p of profiles || []) {
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(p.user_id);
        if (deleteError) throw deleteError;
        deleted.push(p.user_id);
      } catch (e) {
        console.error("Delete user error:", p.user_id, e);
        errors.push({ user_id: p.user_id, error: (e as Error).message });
      }
    }

    if (errors.length > 0) {
      console.error("Deletion errors:", JSON.stringify(errors));
    }

    return json({
      success: true,
      deleted: deleted.length,
      errors: errors.length,
    });
  } catch (err) {
    console.error("Cron error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
