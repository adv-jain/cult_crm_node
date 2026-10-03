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

          // Sidebar — LIGHT theme (GoLand style)
          "sidebar": "#FFFFFF",
          "sidebar-dark": "#F8F9FC",
          "sidebar-hover": "#F1F3F9",
          "sidebar-active": "#1800AC",
          "sidebar-border": "#EEF0F6",
          "sidebar-text": "#4B5563",
          "sidebar-text-muted": "#9CA3AF",
          "sidebar-text-active": "#FFFFFF",

          gold: "#AEA701",
          "gold-dark": "#8E8901",
          "gold-light": "#C9A227",
          "gold-50": "#F7F6DC",
        },
      },
    },
  },
  plugins: [],
};