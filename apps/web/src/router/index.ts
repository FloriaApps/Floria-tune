import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@floria-tune/store";

const routes = [
  { path: "/login", name: "login", component: () => import("../views/LoginView.vue") },
  { path: "/", name: "home", component: () => import("../views/LibraryView.vue") },
  { path: "/favorites", name: "favorites", component: () => import("../views/FavoritesView.vue") },
  { path: "/genres", name: "genres", component: () => import("../views/GenresView.vue") },
  { path: "/genre/:name", name: "genre", component: () => import("../views/GenreAlbumsView.vue") },
  { path: "/artist/:id", name: "artist", component: () => import("../views/ArtistView.vue") },
  { path: "/album/:id", name: "album", component: () => import("../views/AlbumView.vue") },
  { path: "/playlists", name: "playlists", component: () => import("../views/PlaylistsView.vue") },
  { path: "/playlist/:id", name: "playlist", component: () => import("../views/PlaylistView.vue") },
  { path: "/search", name: "search", component: () => import("../views/SearchView.vue") },
  { path: "/settings", name: "settings", component: () => import("../views/SettingsView.vue") },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.name !== "login" && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (to.name === "login" && auth.isAuthenticated) {
    return { name: "home" };
  }
  return true;
});

export default router;
