import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f1117",
        sidebar: "#161b22",
        card: "#1c2128",
        borderDark: "#30363d",
        accentBlue: "#2563eb",
      },
    },
  },
  plugins: [],
};
export default config;
