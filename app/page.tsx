"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

type ThemeMode = "light" | "dark";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const updateThemeByTime = () => {
      const hour = new Date().getHours();
      setThemeMode(hour >= 7 && hour < 19 ? "light" : "dark");
    };

    updateThemeByTime();

    const interval = window.setInterval(updateThemeByTime, 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data.session;
        setAuthed(!!session);
        setEmail(session?.user?.email ?? "");
      } catch (err) {
        console.error("getSession failed:", err);
        setAuthed(false);
        setEmail("");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const ui = useMemo(() => getUi(themeMode), [themeMode]);

  return (
    <main style={ui.shell}>
      <Background ui={ui} />

      <div style={ui.wrap}>
        <div style={ui.hero}>
          <div style={ui.kickerRow}>
            <span style={ui.kicker}>HUMOR FLAVORS</span>
            <span style={ui.pill}>
              {loading
                ? "Checking session"
                : authed
                  ? "Authenticated"
                  : "Sign in required"}
            </span>
          </div>

          <h1 style={ui.h1}>Humor Flavors</h1>

          <div style={ui.subline}>
            {loading ? (
              <span style={{ opacity: 0.75 }}>Loading…</span>
            ) : authed ? (
              <>
                Signed in as{" "}
                <b style={{ opacity: 0.95 }}>{email || "unknown"}</b>
              </>
            ) : (
              <span style={{ opacity: 0.8 }}>
                Log in to access the humor flavor dashboard.
              </span>
            )}
          </div>

          <div style={{ marginTop: 22 }}>
            {loading ? (
              <div style={ui.skeletonBtn} />
            ) : authed ? (
              <a
                href="/flavors"
                style={ui.primaryBtn}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-1px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0px)")
                }
              >
                Continue to Humor Flavors{" "}
                <span style={{ opacity: 0.7 }}>→</span>
              </a>
            ) : (
              <a
                href="/auth?next=/flavors"
                style={ui.primaryBtn}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-1px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0px)")
                }
              >
                Log in with Google <span style={{ opacity: 0.7 }}>→</span>
              </a>
            )}
          </div>

          <div style={ui.footerRow}>
            <span style={ui.footerPill}>Secure</span>
            <span style={ui.footerPill}>Superadmin-only</span>
            <span style={ui.footerPill}>Staging-safe</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function Background({ ui }: { ui: Record<string, CSSProperties> }) {
  return (
    <>
      <div style={ui.bgGradient} />
      <div style={ui.bgGlowA} />
      <div style={ui.bgGlowB} />
      <div style={ui.bgNoise} />
    </>
  );
}

const fontFamily =
  'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

function getUi(themeMode: ThemeMode): Record<string, CSSProperties> {
  const isDark = themeMode === "dark";

  const text = isDark ? "white" : "#111827";
  const bg = isDark ? "#06070a" : "#f6f7fb";
  const border = isDark
    ? "1px solid rgba(255,255,255,0.14)"
    : "1px solid rgba(15,23,42,0.10)";
  const softBorder = isDark
    ? "1px solid rgba(255,255,255,0.12)"
    : "1px solid rgba(15,23,42,0.10)";
  const pillBg = isDark
    ? "rgba(255,255,255,0.06)"
    : "rgba(255,255,255,0.78)";
  const buttonBg = isDark
    ? "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.09))"
    : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.72))";
  const shadow = isDark
    ? "0 14px 30px rgba(0,0,0,0.35)"
    : "0 14px 30px rgba(15,23,42,0.10)";

  return {
    shell: {
      minHeight: "100vh",
      position: "relative",
      overflow: "hidden",
      fontFamily,
      color: text,
      background: bg,
      transition:
        "background 900ms cubic-bezier(.22,1,.36,1), color 900ms cubic-bezier(.22,1,.36,1)",
    },

    wrap: {
      position: "relative",
      zIndex: 2,
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: 28,
    },

    hero: {
      width: "min(920px, 94vw)",
      textAlign: "center",
    },

    kickerRow: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
    },

    kicker: {
      display: "inline-flex",
      alignItems: "center",
      padding: "7px 12px",
      borderRadius: 999,
      border,
      background: pillBg,
      fontWeight: 950,
      fontSize: 12,
      letterSpacing: 2,
      opacity: 0.95,
      boxShadow: isDark ? "none" : "0 8px 20px rgba(15,23,42,0.06)",
    },

    pill: {
      display: "inline-flex",
      alignItems: "center",
      padding: "7px 12px",
      borderRadius: 999,
      border: softBorder,
      background: pillBg,
      fontWeight: 900,
      fontSize: 12,
      opacity: 0.88,
      boxShadow: isDark ? "none" : "0 8px 20px rgba(15,23,42,0.06)",
    },

    h1: {
      fontSize: 86,
      lineHeight: 0.92,
      letterSpacing: -2.5,
      margin: "18px 0 12px",
      fontWeight: 1000,
    },

    subline: {
      fontSize: 16,
      opacity: 0.8,
      lineHeight: 1.6,
      maxWidth: 720,
      margin: "0 auto",
    },

    primaryBtn: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      padding: "16px 18px",
      width: "min(360px, 100%)",
      borderRadius: 999,
      textDecoration: "none",
      color: text,
      fontWeight: 950,
      letterSpacing: -0.2,
      border,
      background: buttonBg,
      boxShadow: shadow,
      transform: "translateY(0px)",
      transition:
        "transform 120ms ease, background 900ms cubic-bezier(.22,1,.36,1), color 900ms cubic-bezier(.22,1,.36,1), border-color 900ms cubic-bezier(.22,1,.36,1)",
    },

    skeletonBtn: {
      width: "min(360px, 100%)",
      height: 54,
      borderRadius: 999,
      border: softBorder,
      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
      margin: "0 auto",
    },

    footerRow: {
      marginTop: 18,
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      justifyContent: "center",
      opacity: 0.95,
    },

    footerPill: {
      fontSize: 12,
      padding: "6px 10px",
      borderRadius: 999,
      border: softBorder,
      background: pillBg,
      opacity: 0.85,
      boxShadow: isDark ? "none" : "0 8px 20px rgba(15,23,42,0.05)",
    },

    bgGradient: {
      position: "absolute",
      inset: 0,
      background: isDark
        ? "radial-gradient(1200px 700px at 10% 10%, rgba(120,140,255,0.22), transparent 55%), radial-gradient(900px 650px at 90% 20%, rgba(255,140,200,0.14), transparent 60%), radial-gradient(900px 650px at 30% 110%, rgba(0,255,180,0.10), transparent 55%)"
        : "radial-gradient(1200px 700px at 10% 10%, rgba(99,102,241,0.12), transparent 55%), radial-gradient(900px 650px at 90% 20%, rgba(236,72,153,0.09), transparent 60%), radial-gradient(900px 650px at 30% 110%, rgba(16,185,129,0.07), transparent 55%)",
      transition: "background 900ms cubic-bezier(.22,1,.36,1)",
    },

    bgGlowA: {
      position: "absolute",
      width: 900,
      height: 900,
      left: -320,
      top: -340,
      background: isDark
        ? "radial-gradient(circle, rgba(130,120,255,0.18), transparent 60%)"
        : "radial-gradient(circle, rgba(99,102,241,0.10), transparent 60%)",
      filter: "blur(2px)",
      transition: "background 900ms cubic-bezier(.22,1,.36,1)",
    },

    bgGlowB: {
      position: "absolute",
      width: 900,
      height: 900,
      right: -320,
      bottom: -380,
      background: isDark
        ? "radial-gradient(circle, rgba(255,120,200,0.14), transparent 60%)"
        : "radial-gradient(circle, rgba(236,72,153,0.08), transparent 60%)",
      filter: "blur(2px)",
      transition: "background 900ms cubic-bezier(.22,1,.36,1)",
    },

    bgNoise: {
      position: "absolute",
      inset: 0,
      backgroundImage:
        "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22 x=%220%22 y=%220%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/></filter><rect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.08%22/></svg>')",
      opacity: isDark ? 0.22 : 0.08,
      mixBlendMode: isDark ? "overlay" : "multiply",
      pointerEvents: "none",
      transition: "opacity 900ms cubic-bezier(.22,1,.36,1)",
    },
  };
}