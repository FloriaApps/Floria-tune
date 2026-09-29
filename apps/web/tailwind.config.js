/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cores lidas de variáveis CSS (definidas em src/assets/main.css),
        // para que os temas (Gruvbox, Nord, Dracula...) troquem tudo em
        // runtime sem precisar recompilar o Tailwind. O placeholder
        // <alpha-value> deixa os modificadores de opacidade (bg-ink-900/50,
        // text-gold-400/80 etc.) funcionando normalmente.
        ink: {
          950: "rgb(var(--color-ink-950) / <alpha-value>)", // fundo principal
          900: "rgb(var(--color-ink-900) / <alpha-value>)", // superfícies (sidebar, painéis)
          800: "rgb(var(--color-ink-800) / <alpha-value>)", // hover / bordas sutis
        },
        paper: {
          100: "rgb(var(--color-paper-100) / <alpha-value>)", // texto principal
          400: "rgb(var(--color-paper-400) / <alpha-value>)", // texto apagado / metadados
        },
        gold: {
          400: "rgb(var(--color-gold-400) / <alpha-value>)", // acento primário
          500: "rgb(var(--color-gold-500) / <alpha-value>)",
        },
        moss: {
          500: "rgb(var(--color-moss-500) / <alpha-value>)", // acento secundário
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
