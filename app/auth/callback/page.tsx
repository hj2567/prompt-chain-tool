"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

const POST_AUTH_NEXT_KEY = "post_auth_next";

export default function AuthCallback() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const finish = async () => {
      await supabase.auth.getSession();

      const next =
        sessionStorage.getItem("post_auth_next") ||
        new URLSearchParams(window.location.search).get("next") ||
        "/flavors";

      sessionStorage.removeItem("post_auth_next");
      window.location.replace(next);
    };

    finish();
  }, []);

  return null;
}