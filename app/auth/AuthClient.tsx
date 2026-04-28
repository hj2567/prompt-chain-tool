"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

const POST_AUTH_NEXT_KEY = "post_auth_next";

type Theme = "light" | "dark";

export default function AuthClient() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const hour = new Date().getHours();
    setTheme(hour >= 7 && hour < 19 ? "light" : "dark");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/flavors";

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        sessionStorage.removeItem("oauth_started_at");
        const savedNext = sessionStorage.getItem("oauth_next") || next;
        window.location.replace(savedNext);
      }
    };
    window.addEventListener("pageshow", onPageShow);

    sessionStorage.setItem("oauth_next", next);

    const now = Date.now();
    const last = Number(sessionStorage.getItem("oauth_started_at") || "0");
    const COOLDOWN_MS = 250;

    if (last && now - last < COOLDOWN_MS) {
      sessionStorage.removeItem("oauth_started_at");
      window.location.replace(next);
      return () => window.removeEventListener("pageshow", onPageShow);
    }

    sessionStorage.setItem("oauth_started_at", String(now));

    const go = async () => {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    };

    go();

    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const ui = useMemo(() => getUI(theme), [theme]);

  return (
    <main style={ui.shell}>
      <Background ui={ui} />

      <div style={ui.center}>
        <div style={ui.card}>
          <div style={ui.kicker}>AUTH</div>

          <div style={ui.spinnerWrap}>
            <div style={ui.spinner} />
          </div>

          <h1 style={ui.title}>Redirecting to Google…</h1>
          <p style={ui.subtitle}>Secure OAuth handshake in progress.</p>

          <div style={ui.footerRow}>
            <span style={ui.footerPill}>OAuth 2.0</span>
            <span style={ui.footerPill}>Google</span>
            <span style={ui.footerPill}>Supabase</span>
          </div>

          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      </div>
    </main>
  );
}

function Background({ ui }: { ui: any }) {
  return (
    <>
      <div style={ui.bgGradient} />
      <div style={ui.bgGlowA} />
      <div style={ui.bgGlowB} />
      <div style={ui.bgNoise} />
    </>
  );
}

/* ========================= */
/* 🎨 THEME SYSTEM */
/* ========================= */

function getUI(theme: Theme): Record<string, CSSProperties> {
  const isDark = theme === "dark";

  return {
    shell: {
      minHeight: "100vh",
      position: "relative",
      overflow: "hidden",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
      color: isDark ? "white" : "#111827",
      background: isDark ? "#06070a" : "#f6f7fb",
      transition: "all 0.6s ease",
    },

    center: {
      position: "relative",
      zIndex: 2,
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: 24,
    },

    card: {
      width: "min(560px, 92vw)",
      borderRadius: 28,
      padding: 28,
      border: isDark
        ? "1px solid rgba(255,255,255,0.14)"
        : "1px solid rgba(0,0,0,0.08)",
      background: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(255,255,255,0.9)",
      boxShadow: isDark
        ? "0 18px 70px rgba(0,0,0,0.55)"
        : "0 18px 40px rgba(0,0,0,0.08)",
      backdropFilter: "blur(10px)",
      textAlign: "center",
    },

    kicker: {
      display: "inline-flex",
      padding: "7px 12px",
      borderRadius: 999,
      background: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(0,0,0,0.06)",
      fontWeight: 950,
      fontSize: 12,
      marginBottom: 18,
    },

    spinnerWrap: {
      display: "flex",
      justifyContent: "center",
      marginBottom: 20,
    },

    spinner: {
      width: 60,
      height: 60,
      borderRadius: "50%",
      border: isDark
        ? "4px solid rgba(255,255,255,0.2)"
        : "4px solid rgba(0,0,0,0.1)",
      borderTopColor: isDark ? "#fff" : "#111",
      animation: "spin 0.9s linear infinite",
    },

    title: {
      fontSize: 32,
      fontWeight: 950,
      marginBottom: 10,
    },

    subtitle: {
      opacity: 0.7,
      fontSize: 14,
    },

    footerRow: {
      marginTop: 20,
      display: "flex",
      gap: 10,
      justifyContent: "center",
      flexWrap: "wrap",
    },

    footerPill: {
      fontSize: 12,
      padding: "6px 10px",
      borderRadius: 999,
      background: isDark
        ? "rgba(255,255,255,0.05)"
        : "rgba(0,0,0,0.05)",
    },

    bgGradient: {
      position: "absolute",
      inset: 0,
      background: isDark
        ? "radial-gradient(1200px 700px at 10% 10%, rgba(120,140,255,0.22), transparent 55%)"
        : "radial-gradient(1200px 700px at 10% 10%, rgba(99,102,241,0.12), transparent 55%)",
    },

    bgGlowA: {
      position: "absolute",
      width: 900,
      height: 900,
      left: -320,
      top: -340,
      background: isDark
        ? "rgba(130,120,255,0.18)"
        : "rgba(99,102,241,0.12)",
      filter: "blur(80px)",
    },

    bgGlowB: {
      position: "absolute",
      width: 900,
      height: 900,
      right: -320,
      bottom: -380,
      background: isDark
        ? "rgba(255,120,200,0.14)"
        : "rgba(236,72,153,0.10)",
      filter: "blur(80px)",
    },

    bgNoise: {
      position: "absolute",
      inset: 0,
      opacity: isDark ? 0.2 : 0.05,
    },
  };
}