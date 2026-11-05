import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1600px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        heading: "var(--heading)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          light: "#6BFFAA",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
          border: "var(--border)",
          hover: "var(--card-hover)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "#0B132B",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "#0B132B",
        },
        info: {
          DEFAULT: "var(--info)",
          foreground: "#0B132B",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          hover: "var(--card-hover)",
          foreground: "var(--card-foreground)",
        },
      },
      borderRadius: {
        xl: "20px",
        lg: "18px", 
        md: "12px", 
        sm: "8px",
        full: "999px",
      },
      boxShadow: {
        sm: "0 4px 10px rgba(0,0,0,0.1)",
        md: "0 10px 30px rgba(0,0,0,0.15)",
        xl: "0 20px 40px rgba(0,0,0,0.25)",
        neon: "0 0 20px rgba(57, 255, 136, 0.35)",
        "neon-lg": "0 10px 35px rgba(57, 255, 136, 0.45)",
      },
      transitionTimingFunction: {
        "figma-spring": "cubic-bezier(0.16, 1, 0.3, 1)",
        "figma-bounce": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        DEFAULT: "300ms", 
      },
      keyframes: {
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(57, 255, 136, 0.25)" },
          "50%": { boxShadow: "0 0 28px rgba(57, 255, 136, 0.55)" },
        },
      },
      animation: {
        "float-slow": "float-slow 4s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
