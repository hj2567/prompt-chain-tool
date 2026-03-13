"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

const DEV_ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_DEV_BYPASS_EMAIL;
const THEME_STORAGE_KEY = "humor-flavors-theme-mode";

type Flavor = {
  id: number;
  slug: string;
  description: string | null;
};

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const fontFamily =
  'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

const themeTokens: Record<
  ResolvedTheme,
  {
    text: string;
    bg: string;
    cardBg: string;
    cardBorder: string;
    mutedBg: string;
    mutedBorder: string;
    pillBg: string;
    pillBorder: string;
    inputBg: string;
    inputBorder: string;
    dangerBg: string;
    dangerBorder: string;
    shadow: string;
    subline: string;
    noiseOpacity: number;
    glowA: string;
    glowB: string;
    gradient: string;
  }
> = {
  dark: {
    text: "white",
    bg: "#06070a",
    cardBg: "rgba(255,255,255,0.05)",
    cardBorder: "1px solid rgba(255,255,255,0.14)",
    mutedBg: "rgba(255,255,255,0.03)",
    mutedBorder: "1px solid rgba(255,255,255,0.10)",
    pillBg: "rgba(255,255,255,0.04)",
    pillBorder: "1px solid rgba(255,255,255,0.12)",
    inputBg: "rgba(255,255,255,0.06)",
    inputBorder: "1px solid rgba(255,255,255,0.14)",
    dangerBg: "rgba(255,120,120,0.16)",
    dangerBorder: "1px solid rgba(255,120,120,0.35)",
    shadow: "0 12px 40px rgba(0,0,0,0.30)",
    subline: "rgba(255,255,255,0.82)",
    noiseOpacity: 0.22,
    glowA: "radial-gradient(circle, rgba(130,120,255,0.18), transparent 60%)",
    glowB: "radial-gradient(circle, rgba(255,120,200,0.14), transparent 60%)",
    gradient:
      "radial-gradient(1200px 700px at 10% 10%, rgba(120,140,255,0.22), transparent 55%), radial-gradient(900px 650px at 90% 20%, rgba(255,140,200,0.14), transparent 60%), radial-gradient(900px 650px at 30% 110%, rgba(0,255,180,0.10), transparent 55%)",
  },
  light: {
    text: "#111827",
    bg: "#f6f7fb",
    cardBg: "rgba(255,255,255,0.78)",
    cardBorder: "1px solid rgba(15,23,42,0.10)",
    mutedBg: "rgba(255,255,255,0.72)",
    mutedBorder: "1px solid rgba(15,23,42,0.08)",
    pillBg: "rgba(255,255,255,0.85)",
    pillBorder: "1px solid rgba(15,23,42,0.10)",
    inputBg: "rgba(255,255,255,0.92)",
    inputBorder: "1px solid rgba(15,23,42,0.12)",
    dangerBg: "rgba(239,68,68,0.10)",
    dangerBorder: "1px solid rgba(239,68,68,0.28)",
    shadow: "0 12px 30px rgba(15,23,42,0.08)",
    subline: "rgba(17,24,39,0.72)",
    noiseOpacity: 0.08,
    glowA: "radial-gradient(circle, rgba(99,102,241,0.10), transparent 60%)",
    glowB: "radial-gradient(circle, rgba(236,72,153,0.08), transparent 60%)",
    gradient:
      "radial-gradient(1200px 700px at 10% 10%, rgba(99,102,241,0.10), transparent 55%), radial-gradient(900px 650px at 90% 20%, rgba(236,72,153,0.08), transparent 60%), radial-gradient(900px 650px at 30% 110%, rgba(16,185,129,0.06), transparent 55%)",
  },
};

function getUi(theme: ResolvedTheme): Record<string, CSSProperties> {
  const t = themeTokens[theme];
  const slowTransition =
    "background 1600ms cubic-bezier(.22,1,.36,1), color 1600ms cubic-bezier(.22,1,.36,1), border-color 1600ms cubic-bezier(.22,1,.36,1), box-shadow 1600ms cubic-bezier(.22,1,.36,1), opacity 1600ms cubic-bezier(.22,1,.36,1)";

  return {
    shell: {
      minHeight: "100vh",
      position: "relative",
      overflow: "hidden",
      fontFamily,
      color: t.text,
      background: t.bg,
      transition: slowTransition,
    },
    wrap: {
      position: "relative",
      zIndex: 2,
      maxWidth: 1380,
      margin: "0 auto",
      padding: "28px 22px 40px",
    },
    header: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    },

    kickerRow: { display: "flex", gap: 10, alignItems: "center" },
    kicker: {
      display: "inline-flex",
      alignItems: "center",
      padding: "7px 12px",
      borderRadius: 999,
      border: t.cardBorder,
      background: t.mutedBg,
      fontWeight: 950,
      fontSize: 12,
      letterSpacing: 2,
      transition: slowTransition,
    },
    pill: {
      display: "inline-flex",
      alignItems: "center",
      padding: "7px 12px",
      borderRadius: 999,
      border: t.pillBorder,
      background: t.pillBg,
      fontWeight: 900,
      fontSize: 12,
      opacity: 0.9,
      transition: slowTransition,
    },
    smallPill: {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 10px",
      borderRadius: 999,
      border: t.pillBorder,
      background: t.pillBg,
      fontWeight: 900,
      fontSize: 12,
      opacity: 0.9,
      transition: slowTransition,
    },

    themeToggleGroup: {
      display: "inline-flex",
      gap: 6,
      padding: 4,
      borderRadius: 999,
      border: t.cardBorder,
      background: t.mutedBg,
      alignItems: "center",
      transition: slowTransition,
    },
    themeToggleBtn: {
      height: 34,
      padding: "0 12px",
      borderRadius: 999,
      border: "none",
      background: "transparent",
      color: t.text,
      cursor: "pointer",
      fontWeight: 900,
      opacity: 0.72,
      transition: slowTransition,
    },
    themeToggleBtnActive: {
      background: t.pillBg,
      opacity: 1,
      boxShadow: t.shadow,
    },

    h1: {
      fontSize: 58,
      lineHeight: 0.95,
      letterSpacing: -2,
      margin: "14px 0 10px",
      fontWeight: 1000,
    },
    subline: {
      color: t.subline,
      fontSize: 15,
      maxWidth: 760,
      transition: slowTransition,
    },

    secondaryActionBtn: {
      height: 44,
      padding: "12px 16px",
      borderRadius: 14,
      fontWeight: 950,
      border: t.cardBorder,
      background: t.mutedBg,
      color: t.text,
      cursor: "pointer",
      transition: slowTransition,
    },

    primaryBtn: {
      height: 40,
      padding: "10px 14px",
      borderRadius: 12,
      fontWeight: 950,
      border: t.cardBorder,
      background: t.pillBg,
      color: t.text,
      cursor: "pointer",
      transition: slowTransition,
    },

    kpiGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 14,
      marginTop: 18,
    },
    kpiCard: {
      borderRadius: 20,
      padding: 18,
      border: t.cardBorder,
      background: t.cardBg,
      boxShadow: t.shadow,
      backdropFilter: "blur(10px)",
      transition: slowTransition,
    },
    kpiTitle: { opacity: 0.75, fontWeight: 900, fontSize: 14 },
    kpiValue: {
      fontSize: 38,
      fontWeight: 1000,
      marginTop: 8,
      letterSpacing: -1,
    },
    kpiSub: { opacity: 0.7, marginTop: 4 },

    card: {
      borderRadius: 20,
      padding: 18,
      border: t.cardBorder,
      background: t.cardBg,
      boxShadow: t.shadow,
      backdropFilter: "blur(10px)",
      marginTop: 16,
      transition: slowTransition,
    },
    cardHeader: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
    },
    cardTitle: { fontWeight: 950, fontSize: 16 },
    cardSub: { opacity: 0.7, fontSize: 12, marginTop: 4 },

    fieldLabel: {
      fontSize: 12,
      opacity: 0.7,
      fontWeight: 900,
    },

    formGrid1: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: 12,
      marginTop: 12,
    },

    input: {
      height: 42,
      padding: "10px 12px",
      borderRadius: 14,
      border: t.inputBorder,
      background: t.inputBg,
      color: t.text,
      outline: "none",
      width: "100%",
      transition: slowTransition,
    },

    textareaLarge: {
      minHeight: 140,
      padding: "12px 14px",
      borderRadius: 14,
      border: t.inputBorder,
      background: t.inputBg,
      color: t.text,
      outline: "none",
      width: "100%",
      resize: "vertical",
      fontFamily,
      lineHeight: 1.55,
      transition: slowTransition,
    },

    infoCard: {
      marginTop: 14,
      padding: 14,
      borderRadius: 16,
      border: t.mutedBorder,
      background: t.mutedBg,
      display: "grid",
      gap: 4,
      opacity: 0.9,
      fontSize: 13,
      transition: slowTransition,
    },

    codeInline: {
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: "0.95em",
      padding: "3px 8px",
      borderRadius: 6,
      background: t.mutedBg,
      transition: slowTransition,
    },

    flavorGrid: {
      marginTop: 14,
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 14,
    },
    flavorCard: {
      borderRadius: 20,
      padding: 18,
      border: t.cardBorder,
      background: t.cardBg,
      boxShadow: t.shadow,
      textDecoration: "none",
      color: t.text,
      display: "grid",
      gap: 12,
      transition: slowTransition,
    },
    flavorTopRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
    },
    flavorBadge: {
      display: "inline-flex",
      alignItems: "center",
      padding: "8px 12px",
      borderRadius: 999,
      border: t.cardBorder,
      background: t.mutedBg,
      fontWeight: 950,
      fontSize: 12,
      letterSpacing: 1,
      transition: slowTransition,
    },
    flavorSlug: {
      fontSize: 22,
      lineHeight: 1.1,
      fontWeight: 950,
      letterSpacing: -0.6,
      wordBreak: "break-word",
    },
    flavorDescription: {
      opacity: 0.78,
      lineHeight: 1.55,
      minHeight: 48,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },

    metaRow: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 10,
    },
    metaItem: {
      padding: "10px 12px",
      borderRadius: 14,
      border: t.mutedBorder,
      background: t.mutedBg,
      transition: slowTransition,
    },
    metaLabel: {
      fontSize: 11,
      fontWeight: 900,
      opacity: 0.62,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    metaValue: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 1.4,
      wordBreak: "break-word",
    },

    empty: {
      marginTop: 12,
      padding: 14,
      borderRadius: 16,
      border: t.mutedBorder,
      background: t.mutedBg,
      transition: slowTransition,
    },
    emptyTitle: { fontWeight: 950 },
    emptyBody: { marginTop: 6, opacity: 0.7, fontSize: 13, lineHeight: 1.45 },

    loadingCard: {
      marginTop: 18,
      borderRadius: 20,
      padding: 18,
      border: t.cardBorder,
      background: t.cardBg,
      transition: slowTransition,
    },
    loadingTitle: { fontWeight: 950, fontSize: 16 },
    loadingSub: { marginTop: 6, opacity: 0.7 },

    errorCard: {
      marginTop: 18,
      borderRadius: 20,
      padding: 18,
      border: t.dangerBorder,
      background: t.dangerBg,
      transition: slowTransition,
    },

    bgGradient: {
      position: "absolute",
      inset: 0,
      background: t.gradient,
      transition: "background 1600ms cubic-bezier(.22,1,.36,1)",
    },
    bgGlowA: {
      position: "absolute",
      width: 900,
      height: 900,
      left: -320,
      top: -340,
      background: t.glowA,
      filter: "blur(2px)",
      transition: "background 1600ms cubic-bezier(.22,1,.36,1)",
    },
    bgGlowB: {
      position: "absolute",
      width: 900,
      height: 900,
      right: -320,
      bottom: -380,
      background: t.glowB,
      filter: "blur(2px)",
      transition: "background 1600ms cubic-bezier(.22,1,.36,1)",
    },
    bgNoise: {
      position: "absolute",
      inset: 0,
      backgroundImage:
        "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22 x=%220%22 y=%220%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/></filter><rect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.08%22/></svg>')",
      opacity: t.noiseOpacity,
      mixBlendMode: theme === "dark" ? "overlay" : "multiply",
      pointerEvents: "none",
      transition: "opacity 1600ms cubic-bezier(.22,1,.36,1)",
    },
  };
}

export default function FlavorsPage() {
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  const [authChecked, setAuthChecked] = useState(false);
  const [isAllowedAdmin, setIsAllowedAdmin] = useState(false);
  const [authError, setAuthError] = useState("");

  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  const ui = useMemo(() => getUi(resolvedTheme), [resolvedTheme]);

  const flavorCount = flavors.length;
  const describedCount = useMemo(
    () => flavors.filter((f) => !!f.description?.trim()).length,
    [flavors]
  );
  const latestId = useMemo(
    () => (flavors.length ? Math.max(...flavors.map((f) => f.id)) : 0),
    [flavors]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "system" || saved === "light" || saved === "dark") {
      setThemeMode(saved);
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [mounted, themeMode]);

  useEffect(() => {
    if (!mounted) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      if (themeMode === "system") {
        setResolvedTheme(media.matches ? "dark" : "light");
      } else {
        setResolvedTheme(themeMode);
      }
    };

    applyTheme();
    media.addEventListener("change", applyTheme);

    return () => {
      media.removeEventListener("change", applyTheme);
    };
  }, [mounted, themeMode]);

  useEffect(() => {
    if (!mounted) return;
    void checkAdminAccess();
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !authChecked || !isAllowedAdmin) return;
    void fetchFlavors();
  }, [mounted, authChecked, isAllowedAdmin]);

  async function checkAdminAccess() {
    const supabase = getSupabaseBrowserClient();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (session?.user?.email) {
      setSignedInEmail(session.user.email);
    }

    if (sessionError) {
      console.error("Session error:", sessionError);
      setAuthError(sessionError.message || "Unable to verify session.");
      setIsAllowedAdmin(false);
      setAuthChecked(true);
      return;
    }

    if (!session?.user) {
      setAuthError("You must be signed in to view this page.");
      setIsAllowedAdmin(false);
      setAuthChecked(true);
      return;
    }

    if (
      process.env.NODE_ENV === "development" &&
      DEV_ADMIN_EMAIL &&
      session.user.email &&
      session.user.email === DEV_ADMIN_EMAIL
    ) {
      setIsAllowedAdmin(true);
      setAuthChecked(true);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_superadmin, is_matrix_admin")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile access error:", profileError);
      setAuthError("Unable to verify admin access.");
      setIsAllowedAdmin(false);
      setAuthChecked(true);
      return;
    }

    const allowed =
      profile.is_superadmin === true || profile.is_matrix_admin === true;

    setIsAllowedAdmin(allowed);
    setAuthChecked(true);

    if (!allowed) {
      setAuthError(
        "You must be a superadmin or matrix admin to view this page."
      );
    }
  }

  async function fetchFlavors() {
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("humor_flavors")
      .select("id, slug, description")
      .order("id", { ascending: true });

    if (error) {
      console.error("Fetch flavors error:", error);
      return;
    }

    setFlavors(data || []);
  }

  async function handleCreateFlavor(e: FormEvent) {
    e.preventDefault();

    const cleanSlug = slugify(slug);
    if (!cleanSlug) {
      alert("Slug is required.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setIsSaving(true);

    const { error } = await supabase.from("humor_flavors").insert({
      slug: cleanSlug,
      description: description.trim() ? description.trim() : null,
    });

    setIsSaving(false);

    if (error) {
      console.error("Insert flavor error:", error);
      alert(error.message);
      return;
    }

    setSlug("");
    setDescription("");
    await fetchFlavors();
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.replace("/");
  }

  const themeButtonStyle = (mode: ThemeMode): CSSProperties => ({
    ...ui.themeToggleBtn,
    ...(themeMode === mode ? ui.themeToggleBtnActive : {}),
  });

  if (!mounted || !authChecked) {
    return (
      <main style={ui.shell}>
        <Background ui={ui} />
        <div style={ui.wrap}>
          <div style={ui.loadingCard}>
            <div style={ui.loadingTitle}>Loading…</div>
            <div style={ui.loadingSub}>Checking admin access.</div>
          </div>
        </div>
      </main>
    );
  }

  if (!isAllowedAdmin) {
    const t = themeTokens[resolvedTheme];

    return (
      <main style={ui.shell}>
        <Background ui={ui} />

        <div
          style={{
            ...ui.wrap,
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
          }}
        >
          <section
            style={{
              width: "100%",
              maxWidth: 900,
              borderRadius: 24,
              padding: 32,
              border: t.cardBorder,
              background: t.cardBg,
              boxShadow: t.shadow,
              backdropFilter: "blur(10px)",
              display: "grid",
              gap: 20,
            }}
          >
            <div style={ui.kickerRow}>
              <span style={ui.kicker}>ADMIN</span>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 72,
                  lineHeight: 0.95,
                  letterSpacing: -2,
                  fontWeight: 1000,
                }}
              >
                Access denied
              </h1>

              <div
                style={{
                  fontSize: 18,
                  lineHeight: 1.5,
                  color: t.subline,
                  maxWidth: 700,
                }}
              >
                Your account is signed in, but it doesn&apos;t have{" "}
                <code style={ui.codeInline}>profiles.is_superadmin</code>{" "}
                or{" "}
                <code style={ui.codeInline}>profiles.is_matrix_admin</code>.
              </div>
            </div>

            <div
              style={{
                borderRadius: 18,
                padding: "20px 22px",
                border: t.mutedBorder,
                background: t.mutedBg,
                display: "grid",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  opacity: 0.7,
                  fontWeight: 500,
                }}
              >
                Signed in as
              </div>

              <div
                style={{
                  fontSize: 26,
                  lineHeight: 1.1,
                  fontWeight: 900,
                  wordBreak: "break-word",
                }}
              >
                {signedInEmail || "Unknown user"}
              </div>

              <div
                style={{
                  fontSize: 14,
                  opacity: 0.6,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                }}
              >
                Debug: {authError || "not-superadmin"}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={signOut}
                style={{
                  height: 56,
                  minWidth: 220,
                  padding: "0 24px",
                  borderRadius: 14,
                  fontSize: 18,
                  fontWeight: 900,
                  border: t.cardBorder,
                  background: t.mutedBg,
                  color: t.text,
                  cursor: "pointer",
                  transition:
                    "background 1600ms cubic-bezier(.22,1,.36,1), color 1600ms cubic-bezier(.22,1,.36,1), border-color 1600ms cubic-bezier(.22,1,.36,1), box-shadow 1600ms cubic-bezier(.22,1,.36,1)",
                }}
              >
                Sign out
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={ui.shell}>
      <Background ui={ui} />

      <div style={ui.wrap}>
        <header style={ui.header}>
          <div>
            <div style={ui.kickerRow}>
              <span style={ui.kicker}>HUMOR FLAVORS</span>
              <span style={ui.pill}>Collection manager</span>
            </div>

            <h1 style={ui.h1}>Flavor Library</h1>
            <div style={ui.subline}>
              Create, review, and open humor flavor configurations.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={ui.themeToggleGroup}>
              <button
                type="button"
                onClick={() => setThemeMode("light")}
                style={themeButtonStyle("light")}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setThemeMode("dark")}
                style={themeButtonStyle("dark")}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setThemeMode("system")}
                style={themeButtonStyle("system")}
              >
                System
              </button>
            </div>

            <button onClick={signOut} style={ui.secondaryActionBtn}>
              Logout →
            </button>
          </div>
        </header>

        <section style={ui.kpiGrid}>
          <KpiCard
            ui={ui}
            title="Total Flavors"
            value={String(flavorCount)}
            subtitle="rows in humor_flavors"
          />
          <KpiCard
            ui={ui}
            title="With Description"
            value={String(describedCount)}
            subtitle="documented entries"
          />
          <KpiCard
            ui={ui}
            title="Latest ID"
            value={String(latestId || 0)}
            subtitle="highest current flavor id"
          />
        </section>

        <section style={ui.card}>
          <div style={ui.cardHeader}>
            <div>
              <div style={ui.cardTitle}>Create New Flavor</div>
              <div style={ui.cardSub}>
                Add a new humor flavor to the library.
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateFlavor} style={{ marginTop: 12 }}>
            <div style={ui.formGrid1}>
              <Field ui={ui} label="Slug">
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. mean-girls-energy"
                  style={ui.input}
                />
              </Field>

              <Field ui={ui} label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the humor flavor"
                  style={ui.textareaLarge}
                />
              </Field>
            </div>

            <div style={ui.infoCard}>
              <div>
                Preview slug:{" "}
                <code style={ui.codeInline}>
                  {slug.trim() ? slugify(slug) : "—"}
                </code>
              </div>
              <div>
                {description.trim()
                  ? `Description: "${description.trim()}"`
                  : "Add a description for this humor flavor."}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                type="submit"
                disabled={isSaving}
                style={ui.primaryBtn}
              >
                {isSaving ? "Creating..." : "Create Flavor"}
              </button>
            </div>
          </form>
        </section>

        <section style={ui.card}>
          <div style={ui.cardHeader}>
            <div>
              <div style={ui.cardTitle}>All Flavors</div>
              <div style={ui.cardSub}>
                Click any flavor to open its detail page and manage steps.
              </div>
            </div>
            <span style={ui.pill}>{flavors.length} total</span>
          </div>

          {flavors.length === 0 ? (
            <EmptyState
              ui={ui}
              title="No flavors yet"
              body="Create your first humor flavor to begin building step pipelines."
            />
          ) : (
            <div style={ui.flavorGrid}>
              {flavors.map((flavor) => (
                <Link
                  key={flavor.id}
                  href={`/flavors/${flavor.id}`}
                  style={ui.flavorCard}
                >
                  <div style={ui.flavorTopRow}>
                    <div style={ui.flavorBadge}>FLAVOR {flavor.id}</div>
                    <span style={ui.smallPill}>Open →</span>
                  </div>

                  <div style={ui.flavorSlug}>{flavor.slug}</div>

                  <div style={ui.flavorDescription}>
                    {flavor.description || "No description"}
                  </div>

                  <div style={ui.metaRow}>
                    <div style={ui.metaItem}>
                      <div style={ui.metaLabel}>ID</div>
                      <div style={ui.metaValue}>{flavor.id}</div>
                    </div>

                    <div style={ui.metaItem}>
                      <div style={ui.metaLabel}>Status</div>
                      <div style={ui.metaValue}>
                        {flavor.description?.trim()
                          ? "Documented"
                          : "Undocumented"}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  ui,
  label,
  children,
}: {
  ui: Record<string, CSSProperties>;
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={ui.fieldLabel}>{label}</div>
      {children}
    </label>
  );
}

function KpiCard({
  ui,
  title,
  value,
  subtitle,
}: {
  ui: Record<string, CSSProperties>;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div style={ui.kpiCard}>
      <div style={ui.kpiTitle}>{title}</div>
      <div style={ui.kpiValue}>{value}</div>
      <div style={ui.kpiSub}>{subtitle}</div>
    </div>
  );
}

function EmptyState({
  ui,
  title,
  body,
}: {
  ui: Record<string, CSSProperties>;
  title: string;
  body: string;
}) {
  return (
    <div style={ui.empty}>
      <div style={ui.emptyTitle}>{title}</div>
      <div style={ui.emptyBody}>{body}</div>
    </div>
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