import type { Config } from "tailwindcss";
import { tailwindThemeExtension } from "./src/themes/tailwind";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // Tailwind accepts color functions at runtime, but its types only model strings.
  theme: { extend: tailwindThemeExtension() as unknown as NonNullable<Config["theme"]> },
  plugins: [],
} satisfies Config;
