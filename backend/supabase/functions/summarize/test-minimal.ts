// Minimal test version - deploy this to test if Edge Functions work at all
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  // Just return success with debug info - no auth check at all
  return new Response(
    JSON.stringify({
      success: true,
      method: req.method,
      url: req.url,
      hasAuth: !!req.headers.get("authorization"),
      hasApiKey: !!req.headers.get("apikey"),
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*"
      }
    }
  );
});

