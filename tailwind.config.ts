import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Flat hex tokens swapped by the `.dark` class. No accent hue exists in
        // this system — green and red are the only chromatic colours, and they
        // carry meaning (profit / loss), never decoration.
        background: "var(--bg)",
        surface: "var(--surface)",
        foreground: "var(--text)",
        secondary: "var(--secondary)",
        border: "var(--border)",
        hover: "var(--hover)",
        profit: "var(--profit)",
        loss: "var(--loss)",
        "nav-muted": "var(--nav-muted)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // 11px column headers, per the spec.
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      letterSpacing: {
        header: "0.08em",
      },
    },
  },
  plugins: [],
};

export default config;
