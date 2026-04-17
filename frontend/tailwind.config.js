/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        metro: {
          bg: "#0a0e1a",
          surface: "#0f1629",
          card: "#141d35",
          border: "#1e2d52",
          accent: "#3b82f6",
          green: "#10b981",
          yellow: "#f59e0b",
          red: "#ef4444",
          orange: "#f97316",
          text: "#e2e8f0",
          muted: "#64748b",
        }
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: 0, transform: "translateY(8px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        slideIn: { "0%": { opacity: 0, transform: "translateX(-12px)" }, "100%": { opacity: 1, transform: "translateX(0)" } },
      }
    },
  },
  plugins: [],
}
