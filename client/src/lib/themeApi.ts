/**
 * Get the current theme preference from the server
 */
export async function getThemePreference(): Promise<string> {
  try {
    const response = await fetch("/api/theme");

    if (!response.ok) {
      throw new Error("Failed to fetch theme preference");
    }

    const data = await response.json();
    return data.theme;
  } catch (error) {
    console.error("Error fetching theme:", error);
    return "system"; // Default to system preference
  }
}

/**
 * Set the theme preference on the server
 */
export async function setThemePreference(
  theme: "dark" | "vibe" | "system",
): Promise<void> {
  try {
    const response = await fetch("/api/theme", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ theme }),
    });

    if (!response.ok) {
      throw new Error("Failed to set theme preference");
    }
  } catch (error) {
    console.error("Error setting theme:", error);
  }
}
