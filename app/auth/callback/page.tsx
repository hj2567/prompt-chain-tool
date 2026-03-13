"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function AuthCallback() {
  useEffect(() => {
    const run = async () => {
      const supabase = getSupabaseBrowserClient();

      // THIS finishes the OAuth flow
      await supabase.auth.exchangeCodeForSession(window.location.href);

      const next =
        sessionStorage.getItem("post_auth_next") ||
        new URLSearchParams(window.location.search).get("next") ||
        "/flavors";

      sessionStorage.removeItem("post_auth_next");

      window.location.replace(next);
    };

    run();
  }, []);

  return null;
}