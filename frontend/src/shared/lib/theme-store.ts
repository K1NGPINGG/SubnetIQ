import { create } from "zustand";

interface ThemeStore {
  dark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  dark: localStorage.getItem("theme") === "dark",
  toggle: () =>
    set((state) => {
      const next = !state.dark;
      localStorage.setItem("theme", next ? "dark" : "light");
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return { dark: next };
    }),
}));

// Apply on load
if (localStorage.getItem("theme") === "dark") {
  document.documentElement.classList.add("dark");
}
