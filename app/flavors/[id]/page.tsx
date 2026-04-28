"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { use, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  shouldDenyNonLocalAdminEmail,
  shouldGrantLocalDevAdminBypass,
} from "@/lib/localOnlyAdmin";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
const THEME_STORAGE_KEY = "humor-flavors-theme-mode";

type Step = {
  id: number;
  order_by: number;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  llm_temperature: number | null;
  humor_flavor_step_type_id: number | null;
  llm_input_type_id: number | null;
  llm_output_type_id: number | null;
  llm_model_id: number | null;
};

type Flavor = {
  id: number;
  slug: string;
  description: string | null;
};

type FlavorResponse = {
  id: number | string;
  created_datetime_utc: string | null;
  humor_flavor_id: number | null;
  humor_flavor_step_id: number | null;
  llm_model_id: number | null;
  llm_temperature: number | null;
  llm_model_response: any;
  profile_id: string | null;
  caption_request_id: number | string | null;
};

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

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

    secondaryLinkBtn: {
      height: 44,
      padding: "12px 16px",
      borderRadius: 14,
      fontWeight: 950,
      border: t.cardBorder,
      background: t.mutedBg,
      color: t.text,
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      transition: slowTransition,
    },

    primaryBtn: {
      height: 36,
      padding: "8px 12px",
      borderRadius: 10,
      fontWeight: 950,
      border: t.cardBorder,
      background: t.pillBg,
      color: t.text,
      cursor: "pointer",
      transition: slowTransition,
    },
    secondaryBtn: {
      height: 36,
      padding: "8px 12px",
      borderRadius: 10,
      fontWeight: 950,
      border: t.cardBorder,
      background: t.mutedBg,
      color: t.text,
      cursor: "pointer",
      opacity: 0.95,
      transition: slowTransition,
    },
    dangerBtn: {
      height: 36,
      padding: "8px 12px",
      borderRadius: 10,
      fontWeight: 950,
      border: t.dangerBorder,
      background: t.dangerBg,
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
    kpiValue: { fontSize: 38, fontWeight: 1000, marginTop: 8, letterSpacing: -1 },
    kpiSub: { opacity: 0.7, marginTop: 4 },

    card: {
      borderRadius: 18,
      padding: 14,
      border: t.cardBorder,
      background: t.cardBg,
      boxShadow: t.shadow,
      backdropFilter: "blur(10px)",
      marginTop: 14,
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

    formGrid1: { display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 12 },
    formGrid3: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 12,
      marginBottom: 14,
    },

    input: {
      height: 42,
      padding: "10px 12px",
      borderRadius: 12,
      border: t.inputBorder,
      background: t.inputBg,
      color: t.text,
      outline: "none",
      width: "100%",
      transition: slowTransition,
    },
    textareaMedium: {
      minHeight: 150,
      padding: "12px 14px",
      borderRadius: 14,
      border: t.inputBorder,
      background: t.inputBg,
      color: t.text,
      outline: "none",
      width: "100%",
      resize: "vertical",
      fontFamily,
      lineHeight: 1.5,
      transition: slowTransition,
    },
    textareaLarge: {
      minHeight: 220,
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

    stepsList: {
      display: "grid",
      gap: 18,
      marginTop: 14,
    },
    stepCard: {
      display: "grid",
      gap: 10,
      borderRadius: 18,
      padding: 14,
      border: t.cardBorder,
      background: t.cardBg,
      boxShadow: t.shadow,
      transition: slowTransition,
    },
    stepHeader: {
      display: "flex",
      justifyContent: "space-between",
      gap: 10,
      alignItems: "flex-start",
      flexWrap: "wrap",
    },
    stepBadge: {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 10px",
      borderRadius: 999,
      border: t.cardBorder,
      background: t.mutedBg,
      fontWeight: 950,
      fontSize: 11,
      letterSpacing: 1,
      transition: slowTransition,
    },

    editBlock: {
      display: "grid",
      gap: 14,
      marginTop: 4,
    },

    metaGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
      gap: 8,
    },
    metaItem: {
      padding: "8px 10px",
      borderRadius: 12,
      border: t.mutedBorder,
      background: t.mutedBg,
      transition: slowTransition,
    },
    metaLabel: {
      fontSize: 10,
      fontWeight: 900,
      opacity: 0.62,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    metaValue: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 1.3,
      wordBreak: "break-word",
    },

    promptGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
    },
    promptPanel: {
      minWidth: 0,
    },
    promptLabel: {
      fontSize: 11,
      fontWeight: 900,
      opacity: 0.72,
      marginBottom: 4,
    },
    promptPre: {
      margin: 0,
      minHeight: 88,
      maxHeight: 160,
      overflow: "auto",
      padding: 12,
      borderRadius: 12,
      border: t.mutedBorder,
      background: t.mutedBg,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      lineHeight: 1.45,
      fontSize: 12,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      transition: slowTransition,
    },
    promptPreTall: {
      margin: 0,
      minHeight: 88,
      maxHeight: 160,
      overflow: "auto",
      padding: 12,
      borderRadius: 12,
      border: t.mutedBorder,
      background: t.mutedBg,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      lineHeight: 1.45,
      fontSize: 12,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      transition: slowTransition,
    },

    responseList: {
      display: "grid",
      gap: 10,
      marginTop: 14,
    },
    responseRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      borderRadius: 14,
      border: t.mutedBorder,
      background: t.mutedBg,
      transition: slowTransition,
    },
    responseRowLeft: {
      minWidth: 0,
      display: "grid",
      gap: 4,
    },
    responseRowTitle: {
      fontWeight: 900,
      fontSize: 14,
      lineHeight: 1.25,
    },
    responseRowSub: {
      opacity: 0.7,
      fontSize: 12,
      lineHeight: 1.35,
      wordBreak: "break-word",
    },
    viewBtn: {
      height: 34,
      padding: "0 12px",
      borderRadius: 10,
      border: t.cardBorder,
      background: t.pillBg,
      color: t.text,
      cursor: "pointer",
      fontWeight: 900,
      flexShrink: 0,
      transition: slowTransition,
    },

    modalOverlay: {
      position: "fixed",
      inset: 0,
      background: theme === "dark" ? "rgba(0,0,0,0.58)" : "rgba(15,23,42,0.18)",
      backdropFilter: "blur(8px)",
      display: "grid",
      placeItems: "center",
      padding: 24,
      zIndex: 1000,
    },
    modalCard: {
      width: "min(920px, 100%)",
      maxHeight: "85vh",
      overflow: "hidden",
      borderRadius: 22,
      border: t.cardBorder,
      background: t.cardBg,
      boxShadow: t.shadow,
      display: "grid",
      gridTemplateRows: "auto 1fr",
    },
    modalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      padding: "18px 18px 14px",
      borderBottom: t.mutedBorder,
    },
    modalTitle: {
      fontWeight: 950,
      fontSize: 18,
      lineHeight: 1.2,
    },
    modalSub: {
      marginTop: 6,
      opacity: 0.72,
      fontSize: 12,
      lineHeight: 1.4,
    },
    modalClose: {
      height: 38,
      width: 38,
      borderRadius: 999,
      border: t.cardBorder,
      background: t.mutedBg,
      color: t.text,
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 18,
      flexShrink: 0,
      transition: slowTransition,
    },
    modalBody: {
      padding: 18,
      overflow: "auto",
    },
    modalPre: {
      margin: 0,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      lineHeight: 1.6,
      fontSize: 14,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    },

    testGrid: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: "1.1fr 0.9fr",
      gap: 18,
    },
    testLeft: {
      display: "grid",
      gap: 14,
      alignContent: "start",
    },
    testRight: {
      display: "grid",
      gap: 10,
      alignContent: "start",
    },
    previewTitle: {
      fontSize: 12,
      fontWeight: 900,
      opacity: 0.72,
    },
    previewFrame: {
      width: "100%",
      minHeight: 420,
      borderRadius: 20,
      overflow: "hidden",
      border: t.cardBorder,
      background: t.mutedBg,
      display: "grid",
      placeItems: "center",
      transition: slowTransition,
    },
    previewImg: {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      display: "block",
    },
    previewPlaceholder: {
      opacity: 0.7,
      padding: 24,
      textAlign: "center",
    },

    outputsList: {
      display: "grid",
      gap: 12,
    },
    outputCard: {
      padding: 14,
      borderRadius: 16,
      border: t.mutedBorder,
      background: t.mutedBg,
      transition: slowTransition,
    },
    outputTitle: {
      fontWeight: 900,
      fontSize: 13,
      marginBottom: 8,
      opacity: 0.9,
    },
    outputPre: {
      margin: 0,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      lineHeight: 1.6,
      fontSize: 14,
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

    codeInline: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: "0.95em",
      padding: "2px 6px",
      borderRadius: 8,
      background: t.mutedBg,
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

export default function FlavorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const flavorId = Number(id);

  const [mounted, setMounted] = useState(false);

  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  const [flavorResponses, setFlavorResponses] = useState<FlavorResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<FlavorResponse | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [busyStepId, setBusyStepId] = useState<number | null>(null);

  const [orderBy, setOrderBy] = useState("");
  const [stepTypeId, setStepTypeId] = useState("");
  const [temperature, setTemperature] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");

  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editOrderBy, setEditOrderBy] = useState("");
  const [editStepTypeId, setEditStepTypeId] = useState("");
  const [editTemperature, setEditTemperature] = useState("");
  const [editSystemPrompt, setEditSystemPrompt] = useState("");
  const [editUserPrompt, setEditUserPrompt] = useState("");

  const [isEditingFlavor, setIsEditingFlavor] = useState(false);
  const [editFlavorSlug, setEditFlavorSlug] = useState("");
  const [editFlavorDescription, setEditFlavorDescription] = useState("");
  const [isSavingFlavor, setIsSavingFlavor] = useState(false);

  const [sessionReady, setSessionReady] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  const [testImageUrl, setTestImageUrl] = useState("");
  const [runningFlavor, setRunningFlavor] = useState(false);
  const [stepOutputs, setStepOutputs] = useState<string[]>([]);

  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  const [authChecked, setAuthChecked] = useState(false);
  const [isAllowedAdmin, setIsAllowedAdmin] = useState(false);
  const [authError, setAuthError] = useState("");

  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  const ui = useMemo(() => getUi(resolvedTheme), [resolvedTheme]);

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
    if (!mounted || !authChecked || !isAllowedAdmin || Number.isNaN(flavorId)) {
      return;
    }

    void fetchFlavorAndSteps();
    void fetchFlavorResponses();
  }, [mounted, authChecked, isAllowedAdmin, flavorId]);

  useEffect(() => {
    if (!mounted) return;

    let active = true;
    const supabase = getSupabaseBrowserClient();

    async function loadInitialSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (session?.user?.email) {
        setSignedInEmail(session.user.email);
      }

      if (error) {
        console.error("getSession error:", error);
        return;
      }

      if (active && session?.access_token) {
        setAccessToken(session.access_token);
        setSessionReady(true);
      }
    }

    void loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (session?.user?.email) {
        setSignedInEmail(session.user.email);
      }

      if (session?.access_token) {
        setAccessToken(session.access_token);
        setSessionReady(true);
      } else {
        setAccessToken("");
        setSessionReady(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [mounted]);

  useEffect(() => {
    if (!selectedResponse) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedResponse(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedResponse]);

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
      setIsAllowedAdmin(false);
      setAuthChecked(true);
      return;
    }

    if (!session?.user) {
      setIsAllowedAdmin(false);
      setAuthChecked(true);
      return;
    }

    if (shouldDenyNonLocalAdminEmail(session.user.email)) {
      setAuthError(
        "This account is only allowed admin access on the local server."
      );
      setIsAllowedAdmin(false);
      setAuthChecked(true);
      return;
    }

    if (shouldGrantLocalDevAdminBypass(session.user.email)) {
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

  async function fetchFlavorAndSteps() {
    const supabase = getSupabaseBrowserClient();
    setLoading(true);

    const { data: flavorData, error: flavorError } = await supabase
      .from("humor_flavors")
      .select("id, slug, description")
      .eq("id", flavorId)
      .single();

    if (flavorError) {
      console.error("Flavor error:", flavorError);
    }

    const { data: stepsData, error: stepsError } = await supabase
      .from("humor_flavor_steps")
      .select(
        "id, order_by, llm_system_prompt, llm_user_prompt, llm_temperature, humor_flavor_step_type_id, llm_input_type_id, llm_output_type_id, llm_model_id"
      )
      .eq("humor_flavor_id", flavorId)
      .order("order_by", { ascending: true });

    if (stepsError) {
      console.error("Steps error:", stepsError);
    }

    const safeSteps = stepsData || [];
    setFlavor(flavorData || null);
    setSteps(safeSteps);

    if (flavorData) {
      setEditFlavorSlug(flavorData.slug || "");
      setEditFlavorDescription(flavorData.description || "");
    }

    setLoading(false);

    if (safeSteps.length === 0) {
      setOrderBy("1");
    } else {
      const maxOrder = Math.max(...safeSteps.map((step) => step.order_by || 0));
      setOrderBy(String(maxOrder + 1));
    }
  }

  async function fetchFlavorResponses() {
    const supabase = getSupabaseBrowserClient();
    setLoadingResponses(true);

    const { data, error } = await supabase
      .from("llm_model_responses")
      .select(
        "id, created_datetime_utc, humor_flavor_id, humor_flavor_step_id, llm_model_id, llm_temperature, llm_model_response, profile_id, caption_request_id"
      )
      .eq("humor_flavor_id", flavorId)
      .order("created_datetime_utc", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Flavor responses error:", error);
      setFlavorResponses([]);
      setLoadingResponses(false);
      return;
    }

    setFlavorResponses((data || []) as FlavorResponse[]);
    setLoadingResponses(false);
  }

  async function reindexSteps() {
    const supabase = getSupabaseBrowserClient();

    const { data: currentSteps, error } = await supabase
      .from("humor_flavor_steps")
      .select("id, order_by")
      .eq("humor_flavor_id", flavorId)
      .order("order_by", { ascending: true });

    if (error) {
      console.error("Reindex fetch error:", error);
      return;
    }

    const safeSteps = currentSteps || [];
    if (safeSteps.length === 0) return;

    for (let i = 0; i < safeSteps.length; i++) {
      const step = safeSteps[i];
      const newOrder = i + 1;

      if (step.order_by !== newOrder) {
        const { error: updateError } = await supabase
          .from("humor_flavor_steps")
          .update({ order_by: newOrder })
          .eq("id", step.id);

        if (updateError) {
          console.error("Reindex update error:", updateError);
          return;
        }
      }
    }
  }

  async function handleCreateStep(e: FormEvent) {
    e.preventDefault();

    if (!orderBy.trim()) {
      alert("Order is required.");
      return;
    }

    if (!stepTypeId.trim()) {
      alert("Step Type ID is required.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setIsSaving(true);

    const payload = {
      humor_flavor_id: flavorId,
      order_by: Number(orderBy),
      humor_flavor_step_type_id: Number(stepTypeId),
      llm_input_type_id: 1,
      llm_output_type_id: 1,
      llm_model_id: 14,
      llm_temperature: temperature.trim() === "" ? null : Number(temperature),
      llm_system_prompt: systemPrompt.trim() === "" ? null : systemPrompt,
      llm_user_prompt: userPrompt.trim() === "" ? null : userPrompt,
    };

    const { error } = await supabase.from("humor_flavor_steps").insert(payload);

    setIsSaving(false);

    if (error) {
      console.error("Insert step error:", error);
      alert(error.message || "Insert failed");
      return;
    }

    setStepTypeId("");
    setTemperature("");
    setSystemPrompt("");
    setUserPrompt("");

    await reindexSteps();
    await fetchFlavorAndSteps();
    await fetchFlavorResponses();
  }

  function startEditing(step: Step) {
    setEditingStepId(step.id);
    setEditOrderBy(String(step.order_by ?? ""));
    setEditStepTypeId(String(step.humor_flavor_step_type_id ?? ""));
    setEditTemperature(
      step.llm_temperature === null || step.llm_temperature === undefined
        ? ""
        : String(step.llm_temperature)
    );
    setEditSystemPrompt(step.llm_system_prompt || "");
    setEditUserPrompt(step.llm_user_prompt || "");
  }

  function cancelEditing() {
    setEditingStepId(null);
    setEditOrderBy("");
    setEditStepTypeId("");
    setEditTemperature("");
    setEditSystemPrompt("");
    setEditUserPrompt("");
  }

  async function handleSaveEdit(stepId: number) {
    if (!editOrderBy.trim()) {
      alert("Order is required.");
      return;
    }

    if (!editStepTypeId.trim()) {
      alert("Step Type ID is required.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setBusyStepId(stepId);

    const { error } = await supabase
      .from("humor_flavor_steps")
      .update({
        order_by: Number(editOrderBy),
        humor_flavor_step_type_id: Number(editStepTypeId),
        llm_temperature:
          editTemperature.trim() === "" ? null : Number(editTemperature),
        llm_system_prompt:
          editSystemPrompt.trim() === "" ? null : editSystemPrompt,
        llm_user_prompt: editUserPrompt.trim() === "" ? null : editUserPrompt,
      })
      .eq("id", stepId);

    if (error) {
      console.error("Edit step error:", error);
      alert(error.message || "Update failed");
      setBusyStepId(null);
      return;
    }

    await reindexSteps();
    await fetchFlavorAndSteps();
    await fetchFlavorResponses();
    cancelEditing();
    setBusyStepId(null);
  }

  async function handleDeleteStep(stepId: number) {
    const confirmed = window.confirm("Delete this step?");
    if (!confirmed) return;

    const supabase = getSupabaseBrowserClient();
    setBusyStepId(stepId);

    const { error } = await supabase
      .from("humor_flavor_steps")
      .delete()
      .eq("id", stepId);

    if (error) {
      console.error("Delete step error:", error);
      alert(error.message || "Delete failed");
      setBusyStepId(null);
      return;
    }

    await reindexSteps();
    await fetchFlavorAndSteps();
    await fetchFlavorResponses();
    setBusyStepId(null);
  }

  async function handleMoveStep(stepId: number, direction: "up" | "down") {
    const currentIndex = steps.findIndex((step) => step.id === stepId);
    if (currentIndex === -1) return;

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const currentStep = steps[currentIndex];
    const targetStep = steps[targetIndex];

    const supabase = getSupabaseBrowserClient();
    setBusyStepId(stepId);

    const { error: tempError } = await supabase
      .from("humor_flavor_steps")
      .update({ order_by: -999 })
      .eq("id", currentStep.id);

    if (tempError) {
      console.error("Move temp update error:", tempError);
      alert(tempError.message || "Move failed");
      setBusyStepId(null);
      return;
    }

    const { error: targetError } = await supabase
      .from("humor_flavor_steps")
      .update({ order_by: currentStep.order_by })
      .eq("id", targetStep.id);

    if (targetError) {
      console.error("Move target update error:", targetError);
      alert(targetError.message || "Move failed");
      await fetchFlavorAndSteps();
      setBusyStepId(null);
      return;
    }

    const { error: currentError } = await supabase
      .from("humor_flavor_steps")
      .update({ order_by: targetStep.order_by })
      .eq("id", currentStep.id);

    if (currentError) {
      console.error("Move current update error:", currentError);
      alert(currentError.message || "Move failed");
      await fetchFlavorAndSteps();
      setBusyStepId(null);
      return;
    }

    await reindexSteps();
    await fetchFlavorAndSteps();
    await fetchFlavorResponses();
    setBusyStepId(null);
  }

  async function handleSaveFlavor() {
    if (!editFlavorSlug.trim()) {
      alert("Flavor slug is required.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setIsSavingFlavor(true);

    const { error } = await supabase
      .from("humor_flavors")
      .update({
        slug: editFlavorSlug.trim(),
        description:
          editFlavorDescription.trim() === "" ? null : editFlavorDescription,
      })
      .eq("id", flavorId);

    setIsSavingFlavor(false);

    if (error) {
      console.error("Edit flavor error:", error);
      alert(error.message || "Flavor update failed");
      return;
    }

    setIsEditingFlavor(false);
    await fetchFlavorAndSteps();
    await fetchFlavorResponses();
  }

  async function handleDeleteFlavor() {
    const confirmed = window.confirm(
      "Delete this humor flavor and all of its steps?"
    );
    if (!confirmed) return;

    const supabase = getSupabaseBrowserClient();
    setIsSavingFlavor(true);

    const { error } = await supabase
      .from("humor_flavors")
      .delete()
      .eq("id", flavorId);

    setIsSavingFlavor(false);

    if (error) {
      console.error("Delete flavor error:", error);
      alert(error.message || "Flavor delete failed");
      return;
    }

    window.location.href = "/flavors";
  }

  function parseAlmostcrackdErrorBody(txt: string, status: number): string {
    const trimmed = txt.trim();
    if (!trimmed) return `Request failed (${status})`;
    try {
      const j = JSON.parse(trimmed) as {
        message?: string;
        statusMessage?: string;
        error?: boolean;
      };
      if (j && typeof j === "object") {
        const m = j.message || j.statusMessage;
        if (typeof m === "string" && m.length > 0) return m;
      }
    } catch {
      // Body is not JSON (e.g. plain text error page)
    }
    return trimmed.length > 500 ? `${trimmed.slice(0, 500)}…` : trimmed;
  }

  async function apiPost<T,>(path: string, body: any): Promise<T> {
    const res = await fetch(`https://api.almostcrackd.ai${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
    });

    const txt = await res.text();

    if (!res.ok) {
      throw new Error(parseAlmostcrackdErrorBody(txt, res.status));
    }

    try {
      return JSON.parse(txt) as T;
    } catch {
      return txt as unknown as T;
    }
  }

  /** Pipeline may return a caption request id from upload or generate steps. */
  function extractCaptionRequestIdFromPayload(input: unknown): number | null {
    if (input == null) return null;
    const pick = (v: unknown): number | null => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
      return null;
    };
    if (typeof input !== "object") return null;
    const r = input as Record<string, unknown>;
    const direct =
      pick(r.captionRequestId) ??
      pick(r.caption_request_id) ??
      pick(r.requestId) ??
      pick(r.request_id);
    if (direct != null) return direct;
    const data = r.data;
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      return (
        pick(d.captionRequestId) ??
        pick(d.caption_request_id) ??
        pick(d.id)
      );
    }
    return null;
  }

  async function uploadImageFromUrl(imageUrl: string): Promise<{
    imageId: string;
    captionRequestId: number | null;
  }> {
    const step = await apiPost<Record<string, unknown>>(
      "/pipeline/upload-image-from-url",
      {
        imageUrl,
        isCommonUse: false,
      }
    );

    const imageId = step?.imageId;
    if (typeof imageId !== "string" || !imageId) {
      throw new Error("Bad response from upload-image-from-url");
    }

    return {
      imageId,
      captionRequestId: extractCaptionRequestIdFromPayload(step),
    };
  }

  /**
   * llm_model_responses.caption_request_id is NOT NULL — create a parent row when the API did not return one.
   */
  async function ensureCaptionRequestId(params: {
    supabase: ReturnType<typeof getSupabaseBrowserClient>;
    profileId: string;
    imageId: string;
    pipelineResult: unknown;
    fromUpload: number | null;
  }): Promise<number> {
    const fromGenerate = extractCaptionRequestIdFromPayload(
      params.pipelineResult
    );
    if (fromGenerate != null) return fromGenerate;
    if (params.fromUpload != null) return params.fromUpload;

    const { data, error } = await params.supabase
      .from("caption_requests")
      .insert({
        profile_id: params.profileId,
        image_id: params.imageId,
      })
      .select("id")
      .single();

    if (error || data == null || data.id == null) {
      console.error("caption_requests insert:", error);
      throw new Error(
        error?.message ??
          "Could not create caption_requests row (needed for caption_request_id). Check table columns (e.g. image_id) and RLS."
      );
    }

    return Number(data.id);
  }

  /** API sometimes returns 200 with `{ error: true, message }` instead of captions. */
  function isPipelineErrorPayload(input: unknown): input is {
    error: true;
    message?: string;
  } {
    return (
      !!input &&
      typeof input === "object" &&
      (input as { error?: unknown }).error === true
    );
  }

  function normalizeCaptions(input: any): string[] {
    if (Array.isArray(input)) {
      return input
        .map((x) =>
          typeof x === "string"
            ? x
            : x?.content || x?.caption || x?.text || JSON.stringify(x)
        )
        .filter(Boolean);
    }

    if (Array.isArray(input?.captions)) {
      return input.captions
        .map((x: any) =>
          typeof x === "string"
            ? x
            : x?.content || x?.caption || x?.text || JSON.stringify(x)
        )
        .filter(Boolean);
    }

    if (typeof input?.output === "string") return [input.output];
    if (typeof input?.caption === "string") return [input.caption];
    if (typeof input?.text === "string") return [input.text];

    return [JSON.stringify(input, null, 2)];
  }

  function formatResponseContent(value: any) {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  async function persistRunCaptionsToSupabase(
    captions: string[],
    processingTimeSeconds: number,
    captionRequestId: number
  ) {
    if (captions.length === 0 || Number.isNaN(flavorId)) return;

    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const profileId = session?.user?.id;
    if (!profileId) {
      throw new Error("Not signed in; cannot save captions.");
    }

    const sortedSteps = [...steps].sort(
      (a, b) => (a.order_by ?? 0) - (b.order_by ?? 0)
    );
    const lastStep = sortedSteps[sortedSteps.length - 1];

    const raw = Number.isFinite(processingTimeSeconds)
      ? Math.max(0, processingTimeSeconds)
      : 0;
    const seconds = Math.min(32767, Math.round(raw));

    const llmSystemPrompt =
      lastStep?.llm_system_prompt?.trim() ||
      "(humor flavor admin test — no system prompt on last step)";
    const llmUserPrompt =
      lastStep?.llm_user_prompt?.trim() ||
      "(humor flavor admin test — no user prompt on last step)";

    const row = {
      humor_flavor_id: flavorId,
      humor_flavor_step_id: lastStep?.id ?? null,
      llm_model_id: lastStep?.llm_model_id ?? null,
      llm_temperature: lastStep?.llm_temperature ?? null,
      llm_system_prompt: llmSystemPrompt,
      llm_user_prompt: llmUserPrompt,
      llm_model_response: captions, // save whole run together
      profile_id: profileId,
      caption_request_id: captionRequestId,
      processing_time_seconds: seconds,
    };

    const { error } = await supabase.from("llm_model_responses").insert(row);

    if (error) {
      console.error("persistRunCaptionsToSupabase:", error);
      throw new Error(error.message || "Failed to save captions");
    }
  }

  async function handleRunFlavor() {
    if (!sessionReady || !accessToken) {
      alert("Session not ready.");
      return;
    }

    if (!testImageUrl.trim()) {
      alert("Image URL required");
      return;
    }

    setRunningFlavor(true);
    setStepOutputs([]);

    try {
      const { imageId, captionRequestId: captionRequestIdFromUpload } =
        await uploadImageFromUrl(testImageUrl.trim());

      const genStarted = performance.now();
      const allCaptions: string[] = [];
      let lastResult: any = null;

      // The API currently returns only one caption per generate call,
      // so run generation five times for the same uploaded image.
      for (let i = 0; i < 5; i++) {
        const result = await apiPost<any>("/pipeline/generate-captions", {
          imageId,
        });

        lastResult = result;

        if (isPipelineErrorPayload(result)) {
          throw new Error(
            typeof result.message === "string" && result.message.length > 0
              ? result.message
              : "Caption generation failed (API returned an error payload)."
          );
        }

        const captionsFromRun = normalizeCaptions(result);

        for (const caption of captionsFromRun) {
          const cleanCaption = caption.trim();
          if (cleanCaption && !allCaptions.includes(cleanCaption)) {
            allCaptions.push(cleanCaption);
          }
        }
      }

      const processingTimeSeconds = Math.max(
        0,
        (performance.now() - genStarted) / 1000
      );

      if (allCaptions.length === 0) {
        throw new Error("No captions were returned by the API.");
      }

      setStepOutputs(allCaptions);

      const supabase = getSupabaseBrowserClient();
      const {
        data: { session: persistSession },
      } = await supabase.auth.getSession();
      const persistUserId = persistSession?.user?.id;
      if (!persistUserId) {
        throw new Error("Not signed in; cannot save captions.");
      }

      const captionRequestId = await ensureCaptionRequestId({
        supabase,
        profileId: persistUserId,
        imageId,
        pipelineResult: lastResult,
        fromUpload: captionRequestIdFromUpload,
      });

      try {
        await persistRunCaptionsToSupabase(
          allCaptions,
          processingTimeSeconds,
          captionRequestId
        );
      } catch (persistErr: unknown) {
        const msg =
          persistErr instanceof Error
            ? persistErr.message
            : "Unknown error saving captions";
        console.error("Save captions to Supabase:", persistErr);
        alert(
          `Captions were generated but could not be saved to llm_model_responses: ${msg}`
        );
      }
      await fetchFlavorResponses();
    } catch (err: any) {
      console.error("Run flavor error:", err);
      setStepOutputs([err?.message || "Pipeline failed"]);
    } finally {
      setRunningFlavor(false);
    }
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

  if (!mounted || !authChecked || loading) {
    return (
      <main style={ui.shell}>
        <Background ui={ui} />
        <div style={ui.wrap}>
          <div style={ui.loadingCard}>
            <div style={ui.loadingTitle}>Loading…</div>
            <div style={ui.loadingSub}>Fetching humor flavor and steps.</div>
          </div>
        </div>
      </main>
    );
  }

  if (!isAllowedAdmin) {
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
              border: ui.card.border,
              background: ui.card.background,
              boxShadow: ui.card.boxShadow,
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
                  color: ui.subline.color,
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
                border: ui.metaItem.border,
                background: ui.metaItem.background,
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
                  border: ui.secondaryBtn.border,
                  background: ui.secondaryBtn.background,
                  color: ui.secondaryBtn.color,
                  cursor: "pointer",
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

  if (!flavor) {
    return (
      <main style={ui.shell}>
        <Background ui={ui} />
        <div style={ui.wrap}>
          <div style={ui.errorCard}>
            <div style={{ fontWeight: 950 }}>Flavor not found</div>
            <div style={{ marginTop: 8, opacity: 0.9 }}>
              The humor flavor could not be loaded.
            </div>
          </div>
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
              <span style={ui.kicker}>HUMOR FLAVOR</span>
              <span style={ui.pill}>Detail editor</span>
            </div>

            <h1 style={ui.h1}>{flavor.slug}</h1>
            <div style={ui.subline}>
              {flavor.description || "No description"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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

            <Link href="/flavors" style={ui.secondaryLinkBtn}>
              ← Back to Flavors
            </Link>

            <button
              type="button"
              onClick={() => setIsEditingFlavor((prev) => !prev)}
              style={ui.secondaryBtn}
            >
              {isEditingFlavor ? "Close Edit" : "Edit Flavor"}
            </button>

            <button
              type="button"
              onClick={handleDeleteFlavor}
              disabled={isSavingFlavor}
              style={ui.dangerBtn}
            >
              Delete Flavor
            </button>
          </div>
        </header>

        <section style={ui.kpiGrid}>
          <KpiCard ui={ui} title="Flavor ID" value={String(flavor.id)} subtitle="humor_flavors.id" />
          <KpiCard ui={ui} title="Steps" value={String(steps.length)} subtitle="current configured steps" />
          <KpiCard
            ui={ui}
            title="Auth"
            value={sessionReady ? "Ready" : "Not ready"}
            subtitle="test runner session state"
          />
        </section>

        {isEditingFlavor ? (
          <section style={ui.card}>
            <div style={ui.cardHeader}>
              <div>
                <div style={ui.cardTitle}>Edit Flavor</div>
                <div style={ui.cardSub}>Update slug and description.</div>
              </div>
              <span style={ui.pill}>Flavor</span>
            </div>

            <div style={ui.formGrid1}>
              <Field ui={ui} label="Slug">
                <input
                  value={editFlavorSlug}
                  onChange={(e) => setEditFlavorSlug(e.target.value)}
                  style={ui.input}
                />
              </Field>

              <Field ui={ui} label="Description">
                <textarea
                  value={editFlavorDescription}
                  onChange={(e) => setEditFlavorDescription(e.target.value)}
                  style={ui.textareaLarge}
                />
              </Field>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <button
                type="button"
                onClick={handleSaveFlavor}
                disabled={isSavingFlavor}
                style={ui.primaryBtn}
              >
                {isSavingFlavor ? "Saving..." : "Save Flavor"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEditingFlavor(false);
                  setEditFlavorSlug(flavor.slug || "");
                  setEditFlavorDescription(flavor.description || "");
                }}
                disabled={isSavingFlavor}
                style={ui.secondaryBtn}
              >
                Cancel
              </button>
            </div>
          </section>
        ) : null}

        <section style={ui.card}>
          <div style={ui.cardHeader}>
            <div>
              <div style={ui.cardTitle}>Create New Step</div>
              <div style={ui.cardSub}>Add a new step to this humor flavor pipeline.</div>
            </div>
            <span style={ui.pill}>Builder</span>
          </div>

          <form onSubmit={handleCreateStep} style={{ marginTop: 12 }}>
            <div style={ui.formGrid3}>
              <Field ui={ui} label="Order">
                <input
                  type="number"
                  value={orderBy}
                  onChange={(e) => setOrderBy(e.target.value)}
                  style={ui.input}
                  placeholder="1"
                />
              </Field>

              <Field ui={ui} label="Step Type ID">
                <input
                  type="number"
                  value={stepTypeId}
                  onChange={(e) => setStepTypeId(e.target.value)}
                  style={ui.input}
                  placeholder="1"
                />
              </Field>

              <Field ui={ui} label="Temperature">
                <input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  style={ui.input}
                  placeholder="0.7"
                />
              </Field>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <Field ui={ui} label="System Prompt">
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  style={ui.textareaMedium}
                  placeholder="Enter the system prompt"
                />
              </Field>

              <Field ui={ui} label="User Prompt">
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  style={ui.textareaLarge}
                  placeholder="Enter the user prompt"
                />
              </Field>
            </div>

            <div style={{ marginTop: 14 }}>
              <button type="submit" disabled={isSaving} style={ui.primaryBtn}>
                {isSaving ? "Creating..." : "Create Step"}
              </button>
            </div>
          </form>
        </section>

        <section style={ui.card}>
          <div style={ui.cardHeader}>
            <div>
              <div style={ui.cardTitle}>Configured Steps</div>
              <div style={ui.cardSub}>Ordered execution flow for this flavor.</div>
            </div>
            <span style={ui.pill}>{steps.length} total</span>
          </div>

          {steps.length === 0 ? (
            <EmptyState
              ui={ui}
              title="No steps yet"
              body="Create the first step to begin configuring this humor flavor."
            />
          ) : (
            <div style={ui.stepsList}>
              {steps.map((step, index) => {
                const isEditing = editingStepId === step.id;
                const isBusy = busyStepId === step.id;

                return (
                  <div key={step.id} style={ui.stepCard}>
                    <div style={ui.stepHeader}>
                      <div>
                        <div style={ui.stepBadge}>STEP {index + 1}</div>
                        <div style={ui.cardSub}>
                          ID {step.id} · Order {step.order_by ?? "—"}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => startEditing(step)}
                          disabled={isBusy}
                          style={ui.secondaryBtn}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveStep(step.id, "up")}
                          disabled={index === 0 || isBusy}
                          style={ui.secondaryBtn}
                        >
                          Move Up
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveStep(step.id, "down")}
                          disabled={index === steps.length - 1 || isBusy}
                          style={ui.secondaryBtn}
                        >
                          Move Down
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteStep(step.id)}
                          disabled={isBusy}
                          style={ui.dangerBtn}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div style={ui.editBlock}>
                        <div style={ui.formGrid3}>
                          <Field ui={ui} label="Order">
                            <input
                              type="number"
                              value={editOrderBy}
                              onChange={(e) => setEditOrderBy(e.target.value)}
                              style={ui.input}
                            />
                          </Field>

                          <Field ui={ui} label="Step Type ID">
                            <input
                              type="number"
                              value={editStepTypeId}
                              onChange={(e) => setEditStepTypeId(e.target.value)}
                              style={ui.input}
                            />
                          </Field>

                          <Field ui={ui} label="Temperature">
                            <input
                              type="number"
                              step="0.1"
                              value={editTemperature}
                              onChange={(e) => setEditTemperature(e.target.value)}
                              style={ui.input}
                            />
                          </Field>
                        </div>

                        <Field ui={ui} label="System Prompt">
                          <textarea
                            value={editSystemPrompt}
                            onChange={(e) => setEditSystemPrompt(e.target.value)}
                            style={ui.textareaMedium}
                          />
                        </Field>

                        <Field ui={ui} label="User Prompt">
                          <textarea
                            value={editUserPrompt}
                            onChange={(e) => setEditUserPrompt(e.target.value)}
                            style={ui.textareaLarge}
                          />
                        </Field>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(step.id)}
                            disabled={isBusy}
                            style={ui.primaryBtn}
                          >
                            Save
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditing}
                            disabled={isBusy}
                            style={ui.secondaryBtn}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={ui.metaGrid}>
                          <MetaCard ui={ui} label="Step Type ID" value={step.humor_flavor_step_type_id ?? "None"} />
                          <MetaCard ui={ui} label="Input Type ID" value={step.llm_input_type_id ?? "None"} />
                          <MetaCard ui={ui} label="Output Type ID" value={step.llm_output_type_id ?? "None"} />
                          <MetaCard ui={ui} label="Model ID" value={step.llm_model_id ?? "None"} />
                          <MetaCard ui={ui} label="Temperature" value={step.llm_temperature ?? "None"} />
                        </div>

                        <div style={ui.promptGrid}>
                          <PromptPanel
                            ui={ui}
                            label="System Prompt"
                            value={step.llm_system_prompt || "No system prompt"}
                          />
                          <PromptPanel
                            ui={ui}
                            label="User Prompt"
                            value={step.llm_user_prompt || "No user prompt"}
                            tall
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section style={ui.card}>
          <div style={ui.cardHeader}>
            <div>
              <div style={ui.cardTitle}>Generated Captions for This Flavor</div>
              <div style={ui.cardSub}>
                Recent model responses associated with this humor flavor.
              </div>
            </div>
            <span style={ui.pill}>{flavorResponses.length} total</span>
          </div>

          {loadingResponses ? (
            <div style={ui.loadingCard}>
              <div style={ui.loadingTitle}>Loading…</div>
              <div style={ui.loadingSub}>Fetching generated outputs.</div>
            </div>
          ) : flavorResponses.length === 0 ? (
            <EmptyState
              ui={ui}
              title="No generated captions yet"
              body="Run this flavor or check whether outputs are being saved to llm_model_responses."
            />
          ) : (
            <div style={ui.responseList}>
              {flavorResponses.map((row) => (
                <div key={String(row.id)} style={ui.responseRow}>
                  <div style={ui.responseRowLeft}>
                    <div style={ui.responseRowTitle}>
                      Response {row.id}
                    </div>
                    <div style={ui.responseRowSub}>
                      Step {row.humor_flavor_step_id ?? "—"} · Model {row.llm_model_id ?? "—"} ·{" "}
                      {row.created_datetime_utc
                        ? new Date(row.created_datetime_utc).toLocaleString()
                        : "No timestamp"}
                    </div>
                  </div>

                  <button
                    type="button"
                    style={ui.viewBtn}
                    onClick={() => setSelectedResponse(row)}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={ui.card}>
          <div style={ui.cardHeader}>
            <div>
              <div style={ui.cardTitle}>Test Humor Flavor</div>
              <div style={ui.cardSub}>Upload image by URL and run caption generation.</div>
            </div>
            <span style={ui.pill}>Runner</span>
          </div>

          <div style={ui.testGrid}>
            <div style={ui.testLeft}>
              <Field ui={ui} label="Image URL">
                <input
                  value={testImageUrl}
                  onChange={(e) => setTestImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  style={ui.input}
                />
              </Field>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleRunFlavor}
                  disabled={runningFlavor || !sessionReady}
                  style={ui.primaryBtn}
                >
                  {runningFlavor
                    ? "Running..."
                    : sessionReady
                    ? "Run Flavor"
                    : "Sign in first"}
                </button>
              </div>

              {stepOutputs.length > 0 ? (
                <div style={ui.outputsList}>
                  {stepOutputs.map((output, i) => (
                    <div key={i} style={ui.outputCard}>
                      <div style={ui.outputTitle}>Caption {i + 1}</div>
                      <pre style={ui.outputPre}>{output}</pre>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={ui.testRight}>
              <div style={ui.previewTitle}>Image Preview</div>
              <div style={ui.previewFrame}>
                {testImageUrl.trim() ? (
                  <img
                    src={testImageUrl}
                    alt="Test image preview"
                    style={ui.previewImg}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    onLoad={(e) => {
                      e.currentTarget.style.display = "block";
                    }}
                  />
                ) : (
                  <div style={ui.previewPlaceholder}>Paste an image URL to preview it here.</div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {selectedResponse ? (
        <div
          style={ui.modalOverlay}
          onClick={() => setSelectedResponse(null)}
        >
          <div
            style={ui.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={ui.modalHeader}>
              <div>
                <div style={ui.modalTitle}>
                  Response {selectedResponse.id}
                </div>
                <div style={ui.modalSub}>
                  Step {selectedResponse.humor_flavor_step_id ?? "—"} · Model {selectedResponse.llm_model_id ?? "—"} ·{" "}
                  {selectedResponse.created_datetime_utc
                    ? new Date(selectedResponse.created_datetime_utc).toLocaleString()
                    : "No timestamp"}
                </div>
              </div>

              <button
                type="button"
                style={ui.modalClose}
                onClick={() => setSelectedResponse(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={ui.modalBody}>
              <pre style={ui.modalPre}>
                {formatResponseContent(selectedResponse.llm_model_response)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
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

function MetaCard({
  ui,
  label,
  value,
}: {
  ui: Record<string, CSSProperties>;
  label: string;
  value: ReactNode;
}) {
  return (
    <div style={ui.metaItem}>
      <div style={ui.metaLabel}>{label}</div>
      <div style={ui.metaValue}>{value}</div>
    </div>
  );
}

function PromptPanel({
  ui,
  label,
  value,
  tall,
}: {
  ui: Record<string, CSSProperties>;
  label: string;
  value: string;
  tall?: boolean;
}) {
  return (
    <div style={ui.promptPanel}>
      <div style={ui.promptLabel}>{label}</div>
      <pre style={tall ? ui.promptPreTall : ui.promptPre}>{value}</pre>
    </div>
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