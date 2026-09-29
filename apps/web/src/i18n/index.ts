import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import pt from "./locales/pt.json";

export const SUPPORTED_LOCALES = [
  { id: "en", label: "English" },
  { id: "pt", label: "Português" },
] as const;

export type LocaleId = (typeof SUPPORTED_LOCALES)[number]["id"];

// English é o idioma primário/padrão do app. globalInjection:true expõe
// $t() direto em qualquer template, sem precisar importar useI18n() em
// cada componente um por um.
export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: "en",
  fallbackLocale: "en",
  messages: { en, pt },
});
