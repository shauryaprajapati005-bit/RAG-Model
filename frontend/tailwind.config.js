/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0B1020",
        "bg-nav": "#0D1425",
        "bg-card": "#131D30",
        "bg-elevated": "#19253A",
        "accent-primary": "#22D3EE",
        "accent-secondary": "#A78BFA",
        "text-primary": "#F8FAFC",
        "text-secondary": "#94A3B8",
        "border": "#263449",
      },
    },
  },
  plugins: [],
};
