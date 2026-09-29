export interface ThemeOption {
  id: string;
  name: string;
  /** [fundo, acento primário, acento secundário] — só para desenhar o preview. */
  swatch: [string, string, string];
}

export const THEMES: ThemeOption[] = [
  { id: "mono", name: "Monochrome", swatch: ["#080808", "#FFFFFF", "#6E6E6E"] },
  { id: "floria", name: "Floria", swatch: ["#15130F", "#D4A24C", "#4A5D4E"] },
  { id: "gruvbox", name: "Gruvbox", swatch: ["#282828", "#FE8019", "#8EC07C"] },
  { id: "nord", name: "Nord", swatch: ["#2E3440", "#88C0D0", "#A3BE8C"] },
  { id: "dracula", name: "Dracula", swatch: ["#282A36", "#BD93F9", "#50FA7B"] },
  { id: "solarized", name: "Solarized Dark", swatch: ["#002B36", "#B58900", "#268BD2"] },
];

export const DEFAULT_THEME_ID = "mono";
