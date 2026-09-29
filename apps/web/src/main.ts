import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { i18n } from "./i18n";
import { useAuthStore, useUiStore } from "@floria-tune/store";
import "./assets/main.css";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
app.use(i18n);

const ui = useUiStore(pinia);


ui.applyTheme();

if (ui.locale !== "en") {
  i18n.global.locale.value = ui.locale as "en" | "pt";
}

const auth = useAuthStore(pinia);
auth
  .restore()
  .catch(() => undefined)
  .finally(() => {
    app.mount("#app");
  });
