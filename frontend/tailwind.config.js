// tailwind.config.js — sidebar colors add karo
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1800AC",
          "blue-dark": "#130089",
          "blue-light": "#3A24D6",
          "blue-50": "#EAE6FF",
          "blue-100": "#D3C9FF",

          // Sidebar specific — darker blue
          "sidebar": "#0F007A",              // main bg
          "sidebar-dark": "#0A0056",         // deeper
          "sidebar-hover": "#1800AC",        // hover bg
          "sidebar-active": "#3A24D6",       // active bg
          "sidebar-border": "#1F0F94",       // borders
          "sidebar-text": "#C7C0F0",         // inactive text
          "sidebar-text-muted": "#8B82C7",   // muted text

          gold: "#AEA701",
          "gold-dark": "#8E8901",
          "gold-light": "#C9A227",
          "gold-50": "#F7F6DC",
        },
      },
      // ... boxShadow, backgroundImage same rakho
    },
  },
  plugins: [],
};