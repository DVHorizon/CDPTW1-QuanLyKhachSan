/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Grand Horizon Hotels & Resorts Design System Palette
        "text-primary": "#373435",
        "text-secondary": "#203044",
        "surface-base": "#000000",
        "surface-muted": "#fafaf8",
        "surface-raised": "#b9a277",
        "surface-strong": "#fbf8f2",

        // Mapped Semantic Tokens
        "primary": "#203044",
        "primary-container": "#203044",
        "on-primary": "#ffffff",
        "on-primary-container": "#fbf8f2",
        "primary-fixed": "#dae2fd",
        "primary-fixed-dim": "#bec6e0",

        "secondary": "#b9a277",
        "secondary-container": "#fbf8f2",
        "secondary-fixed": "#fedeb2",
        "secondary-fixed-dim": "#d8c49e",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#373435",

        // --- MÃ MÀU DÀNH RIÊNG CHO TRANG ADMIN PMS ---
        // Sử dụng tiền tố "admin-" để không bị đụng chạm với trang chủ
        "admin-primary": "#10b981", // Màu ngọc lục bảo chính của Admin
        "admin-primary-container": "#05a98c",
        "on-admin-primary": "#ffffff",
        // ---------------------------------------------

        "background": "#fafaf8",
        "on-background": "#373435",
        "surface": "#ffffff",
        "on-surface": "#373435",
        "on-surface-variant": "#203044",
        "surface-bright": "#f8f9ff",
        "surface-tint": "#565e74",
        "inverse-on-surface": "#eaf1ff",

        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#fafaf8",
        "surface-container": "#f5f4ef",
        "surface-container-high": "#eae8df",
        "surface-container-highest": "#dedad0",

        "outline": "#8a8782",
        "outline-variant": "#dedad0",

        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        "on-tertiary-fixed": "#002114",
        "on-tertiary-container": "#069669"
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "-apple-system", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
        primary: ["Plus Jakarta Sans", "sans-serif"],
        display: ["Playfair Display", "serif"],
        "label-md": ["Plus Jakarta Sans", "sans-serif"],
        "title-lg": ["Plus Jakarta Sans", "sans-serif"],
        "headline-sm": ["Playfair Display", "serif"],
        "headline-lg": ["Playfair Display", "serif"],
        "body-md": ["Plus Jakarta Sans", "sans-serif"],
        "display-sm": ["Playfair Display", "serif"],
        "body-lg": ["Plus Jakarta Sans", "sans-serif"],
        "headline-md": ["Playfair Display", "serif"],
        "label-lg": ["Plus Jakarta Sans", "sans-serif"],
        "display-lg-mobile": ["Playfair Display", "serif"],
        "label-sm": ["Plus Jakarta Sans", "sans-serif"],
        "body-sm": ["Plus Jakarta Sans", "sans-serif"],
        "display-sm-mobile": ["Playfair Display", "serif"],
        "title-md": ["Plus Jakarta Sans", "sans-serif"],
        "display-lg": ["Playfair Display", "serif"]
      },
      fontSize: {
        // Grand Horizon Typography Scale
        "xs": ["10px", { lineHeight: "14px" }],
        "sm": ["11px", { lineHeight: "16px" }],
        "md": ["12px", { lineHeight: "18px" }],
        "lg": ["14px", { lineHeight: "20px" }],
        "xl": ["16px", { lineHeight: "24px" }],
        "2xl": ["18px", { lineHeight: "26px" }],
        "3xl": ["20px", { lineHeight: "28px" }],
        "4xl": ["24px", { lineHeight: "32px" }],

        // Existing token sizes tuned with Inter standards
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
        "space-1": "2px",
        "space-2": "4px",
        "space-3": "8px",
        "space-4": "10px",
        "space-5": "12px",
        "space-6": "16px",
        "space-7": "20px",
        "space-8": "24px",
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
        "4": "0 12px 32px -8px rgba(185, 162, 119, 0.7)"
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
