import type { Config } from "tailwindcss";
import { designTokens } from "./src/shared/tokens";

export default {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: designTokens.colors.accent,
        surface: designTokens.colors.background,
      },
      fontFamily: { sans: designTokens.fonts.sans.split(", ") },
      borderRadius: designTokens.radius,
      boxShadow: designTokens.shadows,
      spacing: designTokens.spacing,
    },
  },
  plugins: [],
} satisfies Config;
