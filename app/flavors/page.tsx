"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { duplicateHumorFlavor } from "@/lib/duplicateHumorFlavor";
import {
  shouldDenyNonLocalAdminEmail,
  shouldGrantLocalDevAdminBypass,
} from "@/lib/localOnlyAdmin";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

const THEME_STORAGE_KEY = "humor-flavors-theme-mode";
const RECENT_FLAVORS_STORAGE_KEY = "humor-flavors-recently-opened";
const PAGE_SIZE = 50;

type Flavor = {
  id: number;
  slug: string;
  description: string | null;
};

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";
type ViewMode = "table" | "cards";
type StatusFilter = "all" | "documented" | "undocumented";
type SortMode = "id-asc" | "id-desc" | "slug-asc" | "slug-desc";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getFlavorDisplayName(flavor: Flavor) {
  const cleanSlug = flavor.slug?.trim();
  return cleanSlug || `Flavor ${flavor.id}`;
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
      maxWidth: 1600,
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
    kickerRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
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
    compactCard: {
      borderRadius: 20,
      padding: 14,
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
    select: {
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
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: "0.95em",
      padding: "3px 8px",
      borderRadius: 6,
      background: t.mutedBg,
      transition: slowTransition,
    },
    toolbar: {
      display: "grid",
      gridTemplateColumns: "minmax(280px, 1fr) 180px 180px max-content",
      gap: 10,
      marginTop: 14,
      alignItems: "end",
    },
    viewToggle: {
      display: "inline-flex",
      width: "max-content",
      gap: 4,
      padding: 4,
      borderRadius: 14,
      border: t.cardBorder,
      background: t.mutedBg,
      alignItems: "center",
      justifySelf: "start",
      transition: slowTransition,
    },
    viewToggleBtn: {
      height: 34,
      minWidth: 74,
      padding: "0 12px",
      borderRadius: 10,
      border: "none",
      background: "transparent",
      color: t.text,
      cursor: "pointer",
      fontWeight: 900,
      opacity: 0.72,
      transition: slowTransition,
    },
    viewToggleBtnActive: {
      background: t.pillBg,
      opacity: 1,
      boxShadow: t.shadow,
    },
    recentGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
      gap: 10,
      marginTop: 14,
    },
    recentLink: {
      minWidth: 0,
      padding: 12,
      borderRadius: 16,
      border: t.mutedBorder,
      background: t.mutedBg,
      color: t.text,
      textDecoration: "none",
      transition: slowTransition,
    },
    recentTitle: {
      fontWeight: 950,
      fontSize: 14,
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    },
    recentSub: {
      marginTop: 4,
      fontSize: 12,
      opacity: 0.7,
    },
    tableWrap: {
      marginTop: 14,
      overflow: "auto",
      borderRadius: 16,
      border: t.mutedBorder,
      background: t.mutedBg,
      transition: slowTransition,
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: 940,
    },
    th: {
      textAlign: "left",
      padding: "12px 14px",
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      opacity: 0.68,
      borderBottom: t.mutedBorder,
      whiteSpace: "nowrap",
    },
    td: {
      padding: "12px 14px",
      borderBottom: t.mutedBorder,
      verticalAlign: "middle",
      fontSize: 14,
    },
    rowLink: {
      color: t.text,
      textDecoration: "none",
      fontWeight: 950,
      overflowWrap: "anywhere",
    },
    tableDescription: {
      opacity: 0.72,
      maxWidth: 560,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    actionRow: {
      display: "flex",
      gap: 8,
      justifyContent: "flex-end",
      flexWrap: "wrap",
    },
    actionLink: {
      height: 34,
      padding: "0 12px",
      borderRadius: 10,
      border: t.cardBorder,
      background: t.pillBg,
      color: t.text,
      display: "inline-flex",
      alignItems: "center",
      textDecoration: "none",
      fontWeight: 900,
      transition: slowTransition,
    },
    duplicateSmallBtn: {
      height: 34,
      padding: "0 12px",
      borderRadius: 10,
      fontWeight: 900,
      border: t.cardBorder,
      background: t.mutedBg,
      color: t.text,
      cursor: "pointer",
      transition: slowTransition,
    },
    pager: {
      marginTop: 14,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },
    pagerBtns: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      flexWrap: "wrap",
    },
    pagerBtn: {
      height: 36,
      padding: "0 12px",
      borderRadius: 10,
      border: t.cardBorder,
      background: t.mutedBg,
      color: t.text,
      cursor: "pointer",
      fontWeight: 900,
      transition: slowTransition,
    },
    flavorGrid: {
      marginTop: 14,
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gridAutoRows: "minmax(420px, auto)",
      gap: 18,
      alignItems: "stretch",
    },
    flavorCardWrap: {
      minWidth: 0,
      height: "100%",
      display: "flex",
    },
    flavorCard: {
      height: "100%",
      width: "100%",
      minHeight: 420,
      borderRadius: 20,
      padding: 18,
      border: t.cardBorder,
      background: t.cardBg,
      boxShadow: t.shadow,
      textDecoration: "none",
      color: t.text,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      transition: slowTransition,
    },
    flavorTopRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    flavorTopLeft: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      minWidth: 0,
    },
    flavorTopRight: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexShrink: 0,
    },
    duplicateBtn: {
      width: "100%",
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
    cardButtonRow: {
      marginTop: 12,
      flexShrink: 0,
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
    flavorOpenPill: {
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
    flavorSlug: {
      fontSize: 22,
      lineHeight: 1.12,
      fontWeight: 950,
      letterSpacing: -0.6,
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
      minHeight: 50,
      marginTop: 4,
    },
    flavorDescription: {
      opacity: 0.78,
      lineHeight: 1.55,
      minHeight: 74,
      display: "-webkit-box",
      WebkitLineClamp: 3,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
    },
    metaRow: {
      marginTop: "auto",
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
    duplicateModalOverlay: {
      position: "fixed",
      inset: 0,
      zIndex: 60,
      background: "rgba(6, 7, 10, 0.72)",
      display: "grid",
      placeItems: "center",
      padding: 20,
    },
    duplicateModalCard: {
      width: "100%",
      maxWidth: 460,
      borderRadius: 20,
      padding: 22,
      border: t.cardBorder,
      background: t.cardBg,
      boxShadow: t.shadow,
      backdropFilter: "blur(10px)",
    },
    duplicateModalActions: {
      marginTop: 16,
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      justifyContent: "flex-end",
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
  const router = useRouter();
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<Flavor | null>(null);
  const [duplicateSlugInput, setDuplicateSlugInput] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("id-asc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(0);
  const [recentFlavorIds, setRecentFlavorIds] = useState<number[]>([]);

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

  const filteredFlavors = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = flavors.filter((flavor) => {
      const isDocumented = !!flavor.description?.trim();
      if (statusFilter === "documented" && !isDocumented) return false;
      if (statusFilter === "undocumented" && isDocumented) return false;

      if (!q) return true;
      return (
        String(flavor.id).includes(q) ||
        flavor.slug.toLowerCase().includes(q) ||
        (flavor.description || "").toLowerCase().includes(q)
      );
    });

    filtered.sort((a, b) => {
      if (sortMode === "id-asc") return a.id - b.id;
      if (sortMode === "id-desc") return b.id - a.id;
      if (sortMode === "slug-asc") return a.slug.localeCompare(b.slug);
      if (sortMode === "slug-desc") return b.slug.localeCompare(a.slug);
      return 0;
    });

    return filtered;
  }, [flavors, search, sortMode, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredFlavors.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedFlavors = filteredFlavors.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  const recentFlavors = useMemo(() => {
    const byId = new Map(flavors.map((flavor) => [flavor.id, flavor]));
    return recentFlavorIds
      .map((id) => byId.get(id))
      .filter((flavor): flavor is Flavor => !!flavor)
      .slice(0, 5);
  }, [flavors, recentFlavorIds]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "system" || savedTheme === "light" || savedTheme === "dark") {
      setThemeMode(savedTheme);
    }

    const savedRecent = window.localStorage.getItem(RECENT_FLAVORS_STORAGE_KEY);
    if (savedRecent) {
      try {
        const parsed = JSON.parse(savedRecent);
        if (Array.isArray(parsed)) {
          setRecentFlavorIds(
            parsed.filter((value) => typeof value === "number" && Number.isFinite(value))
          );
        }
      } catch {
        window.localStorage.removeItem(RECENT_FLAVORS_STORAGE_KEY);
      }
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [mounted, themeMode]);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(
      RECENT_FLAVORS_STORAGE_KEY,
      JSON.stringify(recentFlavorIds.slice(0, 10))
    );
  }, [mounted, recentFlavorIds]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, sortMode]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

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

    if (shouldDenyNonLocalAdminEmail(session.user.email)) {
      setAuthError("This account is only allowed admin access on the local server.");
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

    const allowed = profile.is_superadmin === true || profile.is_matrix_admin === true;

    setIsAllowedAdmin(allowed);
    setAuthChecked(true);

    if (!allowed) {
      setAuthError("You must be a superadmin or matrix admin to view this page.");
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

  function rememberFlavor(flavorId: number) {
    setRecentFlavorIds((prev) => [flavorId, ...prev.filter((id) => id !== flavorId)].slice(0, 10));
  }

  function openDuplicateDialog(flavor: Flavor) {
    setDuplicateTarget(flavor);
    setDuplicateSlugInput(`${flavor.slug}-copy`);
  }

  async function confirmDuplicateFlavor() {
    if (!duplicateTarget) return;

    const supabase = getSupabaseBrowserClient();
    setIsDuplicating(true);

    try {
      const { newFlavorId } = await duplicateHumorFlavor(supabase, {
        sourceFlavorId: duplicateTarget.id,
        newSlug: duplicateSlugInput,
      });

      rememberFlavor(newFlavorId);
      setDuplicateTarget(null);
      await fetchFlavors();
      router.push(`/flavors/${newFlavorId}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Duplicate failed.");
    } finally {
      setIsDuplicating(false);
    }
  }

  const themeButtonStyle = (mode: ThemeMode): CSSProperties => ({
    ...ui.themeToggleBtn,
    ...(themeMode === mode ? ui.themeToggleBtnActive : {}),
  });

  const viewButtonStyle = (mode: ViewMode): CSSProperties => ({
    ...ui.viewToggleBtn,
    ...(viewMode === mode ? ui.viewToggleBtnActive : {}),
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
                <code style={ui.codeInline}>profiles.is_superadmin</code> or{" "}
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
              <div style={{ fontSize: 14, opacity: 0.7, fontWeight: 500 }}>
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
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
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
              Search, filter, duplicate, and open humor flavor configurations without scrolling through 1,000+ cards.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={ui.themeToggleGroup}>
              <button type="button" onClick={() => setThemeMode("light")} style={themeButtonStyle("light")}>
                Light
              </button>
              <button type="button" onClick={() => setThemeMode("dark")} style={themeButtonStyle("dark")}>
                Dark
              </button>
              <button type="button" onClick={() => setThemeMode("system")} style={themeButtonStyle("system")}>
                System
              </button>
            </div>

            <button onClick={signOut} style={ui.secondaryActionBtn}>
              Logout →
            </button>
          </div>
        </header>

        <section style={ui.kpiGrid}>
          <KpiCard ui={ui} title="Total Flavors" value={String(flavorCount)} subtitle="rows in humor_flavors" />
          <KpiCard ui={ui} title="Filtered Results" value={String(filteredFlavors.length)} subtitle="matching current search" />
          <KpiCard ui={ui} title="With Description" value={String(describedCount)} subtitle="documented entries" />
        </section>

        <section style={ui.card}>
          <div style={ui.cardHeader}>
            <div>
              <div style={ui.cardTitle}>Create New Flavor</div>
              <div style={ui.cardSub}>Add a new humor flavor to the library.</div>
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
                Preview slug: <code style={ui.codeInline}>{slug.trim() ? slugify(slug) : "—"}</code>
              </div>
              <div>{description.trim() ? `Description: "${description.trim()}"` : "Add a description for this humor flavor."}</div>
            </div>

            <div style={{ marginTop: 14 }}>
              <button type="submit" disabled={isSaving} style={ui.primaryBtn}>
                {isSaving ? "Creating..." : "Create Flavor"}
              </button>
            </div>
          </form>
        </section>

        {recentFlavors.length > 0 ? (
          <section style={ui.compactCard}>
            <div style={ui.cardHeader}>
              <div>
                <div style={ui.cardTitle}>Recently Opened</div>
                <div style={ui.cardSub}>Quick access to flavors you opened from this browser.</div>
              </div>
              <button type="button" style={ui.duplicateSmallBtn} onClick={() => setRecentFlavorIds([])}>
                Clear
              </button>
            </div>

            <div style={ui.recentGrid}>
              {recentFlavors.map((flavor) => (
                <Link
                  key={flavor.id}
                  href={`/flavors/${flavor.id}`}
                  style={ui.recentLink}
                  onClick={() => rememberFlavor(flavor.id)}
                >
                  <div style={ui.recentTitle}>{getFlavorDisplayName(flavor)}</div>
                  <div style={ui.recentSub}>Flavor {flavor.id}</div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section style={ui.card}>
          <div style={ui.cardHeader}>
            <div>
              <div style={ui.cardTitle}>All Flavors</div>
              <div style={ui.cardSub}>
                Search by ID, slug, or description. Default view is a dense table for scale.
              </div>
            </div>
            <span style={ui.pill}>{filteredFlavors.length} shown / {flavors.length} total</span>
          </div>

          <div style={ui.toolbar}>
            <Field ui={ui} label="Search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search slug, description, or ID..."
                style={ui.input}
              />
            </Field>

            <Field ui={ui} label="Status">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} style={ui.select}>
                <option value="all">All</option>
                <option value="documented">Documented</option>
                <option value="undocumented">Undocumented</option>
              </select>
            </Field>

            <Field ui={ui} label="Sort">
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} style={ui.select}>
                <option value="id-asc">ID ↑</option>
                <option value="id-desc">ID ↓</option>
                <option value="slug-asc">Slug A–Z</option>
                <option value="slug-desc">Slug Z–A</option>
              </select>
            </Field>

            <Field ui={ui} label="View">
              <div style={ui.viewToggle}>
                <button type="button" onClick={() => setViewMode("table")} style={viewButtonStyle("table")}>
                  Table
                </button>
                <button type="button" onClick={() => setViewMode("cards")} style={viewButtonStyle("cards")}>
                  Cards
                </button>
              </div>
            </Field>
          </div>

          {filteredFlavors.length === 0 ? (
            <EmptyState ui={ui} title="No matching flavors" body="Try clearing search or changing the status filter." />
          ) : viewMode === "table" ? (
            <FlavorTable
              ui={ui}
              flavors={paginatedFlavors}
              rememberFlavor={rememberFlavor}
              openDuplicateDialog={openDuplicateDialog}
            />
          ) : (
            <FlavorCards
              ui={ui}
              flavors={paginatedFlavors}
              rememberFlavor={rememberFlavor}
              openDuplicateDialog={openDuplicateDialog}
            />
          )}

          {filteredFlavors.length > PAGE_SIZE ? (
            <div style={ui.pager}>
              <div style={{ opacity: 0.72, fontSize: 13 }}>
                Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filteredFlavors.length)} of {filteredFlavors.length}
              </div>

              <div style={ui.pagerBtns}>
                <button type="button" style={ui.pagerBtn} disabled={safePage === 0} onClick={() => setPage(0)}>
                  First
                </button>
                <button type="button" style={ui.pagerBtn} disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  Prev
                </button>
                <span style={ui.smallPill}>Page {safePage + 1} / {totalPages}</span>
                <button type="button" style={ui.pagerBtn} disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                  Next
                </button>
                <button type="button" style={ui.pagerBtn} disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
                  Last
                </button>
              </div>
            </div>
          ) : null}
        </section>

        {duplicateTarget ? (
          <div
            style={ui.duplicateModalOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dup-dialog-title"
            onClick={() => !isDuplicating && setDuplicateTarget(null)}
          >
            <div style={ui.duplicateModalCard} onClick={(e) => e.stopPropagation()}>
              <div style={ui.cardHeader}>
                <div>
                  <div style={ui.cardTitle} id="dup-dialog-title">
                    Duplicate flavor
                  </div>
                  <div style={ui.cardSub}>
                    Copy <code style={ui.codeInline}>{getFlavorDisplayName(duplicateTarget)}</code> and all of its steps. Choose a new unique slug.
                  </div>
                </div>
              </div>

              <Field ui={ui} label="New slug">
                <input
                  value={duplicateSlugInput}
                  onChange={(e) => setDuplicateSlugInput(e.target.value)}
                  placeholder="e.g. my-flavor-v2"
                  style={ui.input}
                  disabled={isDuplicating}
                  autoFocus
                />
              </Field>

              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
                Preview: <code style={ui.codeInline}>{duplicateSlugInput.trim() ? slugify(duplicateSlugInput) : "—"}</code>
              </div>

              <div style={ui.duplicateModalActions}>
                <button type="button" disabled={isDuplicating} onClick={() => setDuplicateTarget(null)} style={ui.secondaryActionBtn}>
                  Cancel
                </button>
                <button type="button" disabled={isDuplicating} onClick={() => void confirmDuplicateFlavor()} style={ui.primaryBtn}>
                  {isDuplicating ? "Duplicating…" : "Create copy"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function FlavorTable({
  ui,
  flavors,
  rememberFlavor,
  openDuplicateDialog,
}: {
  ui: Record<string, CSSProperties>;
  flavors: Flavor[];
  rememberFlavor: (flavorId: number) => void;
  openDuplicateDialog: (flavor: Flavor) => void;
}) {
  return (
    <div style={ui.tableWrap}>
      <table style={ui.table}>
        <thead>
          <tr>
            <th style={{ ...ui.th, width: 90 }}>ID</th>
            <th style={ui.th}>Slug</th>
            <th style={ui.th}>Description</th>
            <th style={{ ...ui.th, width: 150 }}>Status</th>
            <th style={{ ...ui.th, width: 210, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {flavors.map((flavor) => {
            const documented = !!flavor.description?.trim();
            return (
              <tr key={flavor.id}>
                <td style={ui.td}>{flavor.id}</td>
                <td style={ui.td}>
                  <Link href={`/flavors/${flavor.id}`} style={ui.rowLink} onClick={() => rememberFlavor(flavor.id)}>
                    {getFlavorDisplayName(flavor)}
                  </Link>
                </td>
                <td style={ui.td}>
                  <div style={ui.tableDescription}>{flavor.description || "No description"}</div>
                </td>
                <td style={ui.td}>
                  <span style={ui.smallPill}>{documented ? "Documented" : "Undocumented"}</span>
                </td>
                <td style={ui.td}>
                  <div style={ui.actionRow}>
                    <Link href={`/flavors/${flavor.id}`} style={ui.actionLink} onClick={() => rememberFlavor(flavor.id)}>
                      Open →
                    </Link>
                    <button type="button" style={ui.duplicateSmallBtn} onClick={() => openDuplicateDialog(flavor)}>
                      Duplicate…
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FlavorCards({
  ui,
  flavors,
  rememberFlavor,
  openDuplicateDialog,
}: {
  ui: Record<string, CSSProperties>;
  flavors: Flavor[];
  rememberFlavor: (flavorId: number) => void;
  openDuplicateDialog: (flavor: Flavor) => void;
}) {
  return (
    <div style={ui.flavorGrid}>
      {flavors.map((flavor) => (
        <div key={flavor.id} style={ui.flavorCardWrap}>
          <Link href={`/flavors/${flavor.id}`} style={ui.flavorCard} onClick={() => rememberFlavor(flavor.id)}>
            <div style={ui.flavorTopRow}>
              <div style={ui.flavorTopLeft}>
                <div style={ui.flavorBadge}>FLAVOR {flavor.id}</div>
              </div>

              <div style={ui.flavorTopRight}>
                <span style={ui.flavorOpenPill}>Open →</span>
              </div>
            </div>

            <div style={ui.flavorSlug}>{getFlavorDisplayName(flavor)}</div>

            <div style={ui.flavorDescription}>{flavor.description || "No description"}</div>

            <div style={ui.metaRow}>
              <div style={ui.metaItem}>
                <div style={ui.metaLabel}>ID</div>
                <div style={ui.metaValue}>{flavor.id}</div>
              </div>

              <div style={ui.metaItem}>
                <div style={ui.metaLabel}>Status</div>
                <div style={ui.metaValue}>{flavor.description?.trim() ? "Documented" : "Undocumented"}</div>
              </div>
            </div>

            <div style={ui.cardButtonRow}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openDuplicateDialog(flavor);
                }}
                style={ui.duplicateBtn}
              >
                Duplicate…
              </button>
            </div>
          </Link>
        </div>
      ))}
    </div>
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
