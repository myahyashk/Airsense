/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        airsense: {
          page: "#0b1626",
          brand: "#123a63",
          accent: "#4f9eff",
          teal: "#2ec4a6",
          card: "#112338",
          cardHover: "#152c46",
          elevated: "#183252",
          border: "#1d3b61",
          borderSubtle: "rgba(79, 158, 255, 0.12)",
          textMuted: "#94a3b8",
        },
        aqi: {
          good: "#10b981",
          moderate: "#eab308",
          sensitive: "#f97316",
          unhealthy: "#ef4444",
          veryUnhealthy: "#8b5cf6",
          hazardous: "#881337",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(0, 0, 0, 0.35)",
        glow: "0 0 15px -3px rgba(79, 158, 255, 0.25)",
        tealGlow: "0 0 12px -2px rgba(46, 196, 166, 0.35)",
      }
    },
  },
  plugins: [],
}
