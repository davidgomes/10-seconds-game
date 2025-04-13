import React, { createContext, useContext, useEffect, useState } from "react";
import { getThemePreference, setThemePreference } from "@/lib/themeApi";

type Theme = "vibe" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "vibe" | "dark"; // The actual theme applied (never 'system')
  setTheme: (theme: Theme) => void;
}

// Create a default context with no-op function to avoid null checks
const defaultThemeContext: ThemeContextType = {
  theme: "system",
  resolvedTheme: "vibe",
  setTheme: () => {
    console.warn("ThemeProvider not initialized yet");
  },
};

const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"vibe" | "dark">("vibe");
  const [mounted, setMounted] = useState(false);

  // Initial theme load from server
  useEffect(() => {
    async function loadInitialTheme() {
      try {
        const serverTheme = await getThemePreference();
        setThemeState(serverTheme as Theme);
      } catch (error) {
        console.error("Error loading theme preference:", error);
      }
      setMounted(true);
    }

    loadInitialTheme();
  }, []);

  // Determine the actual theme to apply based on preference and system settings
  useEffect(() => {
    if (!mounted) return;

    if (theme === "system") {
      // Use system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setResolvedTheme(prefersDark ? "dark" : "vibe");
    } else {
      // Use explicit theme preference
      setResolvedTheme(theme === "dark" ? "dark" : "vibe");
    }
  }, [theme, mounted]);

  // Update theme when it changes
  useEffect(() => {
    if (!mounted) return;

    // Update data-theme attribute on document element
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme, mounted]);

  // Add listener for system theme changes
  useEffect(() => {
    if (!mounted) return;

    // Only listen to system changes if theme is set to 'system'
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      const handleChange = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? "dark" : "vibe");
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme, mounted]);

  // Function to set theme and persist it to the server
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    // Persist to server
    await setThemePreference(newTheme);
  };

  // Prevent theme flicker on load
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
