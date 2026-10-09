/** @type {import('tailwindcss').Config} */

// Bảng màu chuẩn mực Grand Horizon & PMS Admin
const PALETTE = {
  // Brand Primary & Navy
  navy: {
    DEFAULT: "#203044",
    deep: "#131b2e",
    surface: "#fafaf8",
    soft: "#fbf8f2",
  },
  // Brand Secondary & Gold
  gold: {
    DEFAULT: "#b9a277",
    light: "#ffd985",
    warm: "#fedeb2",
    muted: "#d8c49e",
    dark: "#a68e64",
  },
  // Neutral & Typography
  neutral: {
    dark: "#373435",      // Text chính
    outline: "#8a8782",   // Border / placeholder
    border: "#dedad0",    // Border divider cao cấp
    muted: "#eae8df",     // Container high
    soft: "#f5f4ef",      // Container
    white: "#ffffff",
    black: "#000000",
  },
  // Admin PMS Emerald Accent
  admin: {
    primary: "#10b981",
    container: "#05a98c",
  },
  // Status Colors
  status: {
    error: "#ba1a1a",
    errorContainer: "#ffdad6",
    onErrorContainer: "#93000a",
  },
  // Grand Horizon PMS Colors
  pms: {
    bgStart: "#fbfcff",
    bgEnd: "#eef7f5",
    glass: "rgba(255, 255, 255, 0.78)",
    glassStrong: "rgba(255, 255, 255, 0.92)",
    tableHead: "#f4f8f8",
    ink: "#14212b",
    muted: "#526575",
    soft: "#6f8190",
    line: "rgba(70, 90, 106, 0.17)",
    trust: { a: "#1a7ac7", b: "#3862d7" },
    ok: { a: "#05a98c", b: "#2b9a68" },
    action: { a: "#ffd985", b: "#c9993d" },
    alert: { a: "#e86a7c", b: "#e4714d" }
  }
};

const FONT_SANS = ["Plus Jakarta Sans", "system-ui", "-apple-system", "sans-serif"];
const FONT_SERIF = ["Playfair Display", "Georgia", "serif"];

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // --- 1. CORE BRAND TOKENS (Grand Horizon) ---
        "primary": PALETTE.navy.DEFAULT,
        "secondary": PALETTE.gold.DEFAULT,
        "text-primary": PALETTE.neutral.dark,
        "text-secondary": PALETTE.navy.DEFAULT,
        "surface-base": PALETTE.neutral.black,
        "surface-muted": PALETTE.navy.surface,
        "surface-raised": PALETTE.gold.DEFAULT,
        "surface-strong": PALETTE.navy.soft,

        // --- 2. SEMANTIC & MATERIAL TOKENS (Dùng chung cho cả Client & Admin PMS) ---
        "background": PALETTE.navy.surface,
        "on-background": PALETTE.neutral.dark,
        "surface": PALETTE.neutral.white,
        "on-surface": PALETTE.neutral.dark,
        "on-surface-variant": PALETTE.navy.DEFAULT,
        "primary-container": PALETTE.navy.DEFAULT,
        "on-primary": PALETTE.neutral.white,
        "on-primary-container": PALETTE.navy.soft,
        "primary-fixed": "#dae2fd",
        "primary-fixed-dim": "#bec6e0",
        "secondary-container": PALETTE.navy.soft,
        "secondary-fixed": PALETTE.gold.warm,
        "secondary-fixed-dim": PALETTE.gold.muted,
        "on-secondary": PALETTE.neutral.white,
        "on-secondary-container": PALETTE.neutral.dark,

        // Surface Containers
        "surface-container-lowest": PALETTE.neutral.white,
        "surface-container-low": PALETTE.navy.surface,
        "surface-container": PALETTE.neutral.soft,
        "surface-container-high": PALETTE.neutral.muted,
        "surface-container-highest": PALETTE.neutral.border,
        "surface-bright": "#f8f9ff",
        "surface-tint": "#565e74",
        "inverse-on-surface": "#eaf1ff",
        "outline": PALETTE.neutral.outline,
        "outline-variant": PALETTE.neutral.border,

        // --- 3. ADMIN PMS ACCENT (Không bị đụng với Client) ---
        "admin-primary": PALETTE.admin.primary,
        "admin-primary-container": PALETTE.admin.container,
        "on-admin-primary": PALETTE.neutral.white,

        // --- 4. SYSTEM STATUS & TERTIARY ---
        "error": PALETTE.status.error,
        "error-container": PALETTE.status.errorContainer,
        "on-error": PALETTE.neutral.white,
        "on-error-container": PALETTE.status.onErrorContainer,
        "tertiary": "#000000",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#002114",
        "on-tertiary-container": "#069669",
        "tertiary-fixed": "#85f8c4",
        "tertiary-fixed-dim": "#68dba9",
        "on-tertiary-fixed": "#002114",
        "on-tertiary-fixed-variant": "#005137",
        "surface-dim": "#cbdbf5",
        "surface-variant": "#d3e4fe",

        // --- 5. GRAND HORIZON PMS APP TOKENS ---
        "pms-bg-start": PALETTE.pms.bgStart,
        "pms-bg-end": PALETTE.pms.bgEnd,
        "pms-glass": PALETTE.pms.glass,
        "pms-glass-strong": PALETTE.pms.glassStrong,
        "pms-table-head": PALETTE.pms.tableHead,
        "pms-ink": PALETTE.pms.ink,
        "pms-muted": PALETTE.pms.muted,
        "pms-soft": PALETTE.pms.soft,
        "pms-line": PALETTE.pms.line,
        "pms-trust-a": PALETTE.pms.trust.a,
        "pms-trust-b": PALETTE.pms.trust.b,
        "pms-ok-a": PALETTE.pms.ok.a,
        "pms-ok-b": PALETTE.pms.ok.b,
        "pms-action-a": PALETTE.pms.action.a,
        "pms-action-b": PALETTE.pms.action.b,
        "pms-alert-a": PALETTE.pms.alert.a,
        "pms-alert-b": PALETTE.pms.alert.b,
      },

      fontFamily: {
        // Core Web Fonts
        sans: FONT_SANS,
        serif: FONT_SERIF,
        primary: FONT_SANS,
        display: FONT_SANS,

        // Semantic font aliases (Tương thích Admin PMS - Sử dụng font thường Plus Jakarta Sans)
        "body-sm": FONT_SANS,
        "body-md": FONT_SANS,
        "body-lg": FONT_SANS,
        "label-sm": FONT_SANS,
        "label-md": FONT_SANS,
        "label-lg": FONT_SANS,
        "title-md": FONT_SANS,
        "title-lg": FONT_SANS,
        "headline-sm": FONT_SANS,
        "headline-md": FONT_SANS,
        "headline-lg": FONT_SANS,
        "display-sm": FONT_SANS,
        "display-lg": FONT_SANS,
        "display-sm-mobile": FONT_SANS,
        "display-lg-mobile": FONT_SANS
      },

      fontSize: {
        // Semantic Typography Scale (Tương thích toàn bộ Admin PMS & Design tokens)
        "label-sm": ["11px", { lineHeight: "16px", letterSpacing: "0.06em", fontWeight: "700" }],
        "label-md": ["12px", { lineHeight: "18px", letterSpacing: "0.04em", fontWeight: "600" }],
        "label-lg": ["14px", { lineHeight: "20px", letterSpacing: "0.02em", fontWeight: "600" }],
        "body-sm": ["13px", { lineHeight: "20px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "22px", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "title-md": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "title-lg": ["18px", { lineHeight: "26px", fontWeight: "600" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "700" }],
        "display-sm-mobile": ["28px", { lineHeight: "36px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "display-sm": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-lg-mobile": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-lg": ["52px", { lineHeight: "60px", letterSpacing: "-0.025em", fontWeight: "800" }]
      },

      spacing: {
        margin: "2rem",
        gutter: "1.5rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2.5rem"
      },

      borderRadius: {
        DEFAULT: "0.25rem",
        "xs": "6px",
        "sm": "8px",
        "md": "12px",
        "lg": "16px",
        "full": "9999px"
      },

      boxShadow: {
        "1": "0 10px 30px -22px rgba(32, 48, 68, 0.5)",
        "2": "0 18px 50px -28px rgba(32, 48, 68, 0.7)",
        "3": "0 16px 40px -18px rgba(32, 48, 68, 0.75)",
        "4": "0 12px 32px -8px rgba(185, 162, 119, 0.7)",
        "pms": "0 18px 44px rgba(30, 65, 82, 0.11)",
        "pms-soft": "0 9px 24px rgba(30, 65, 82, 0.075)"
      },

      transitionDuration: {
        "instant": "150ms",
        "fast": "200ms",
        "normal": "300ms",
        "slow": "500ms"
      }
    }
  },
  plugins: [],
}
