interface UserResponse {
  username: string | null;
  userId?: number;
  wins?: number;
  roundsPlayed?: number;
}

/**
 * Get the current username from the server
 */
export async function getUsername(): Promise<UserResponse> {
  try {
    const response = await fetch("/api/username");

    if (!response.ok) {
      throw new Error("Failed to fetch username");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching username:", error);
    return { username: null }; // Default to null to indicate no user is signed in
  }
}

/**
 * Set the username on the server
 */
export async function setUsername(username: string): Promise<void> {
  try {
    const response = await fetch("/api/username", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      throw new Error("Failed to set username");
    }
  } catch (error) {
    console.error("Error setting username:", error);
    throw error;
  }
}

/**
 * Clear the username cookie (logout)
 */
export async function logout(): Promise<void> {
  try {
    const response = await fetch("/api/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to logout");
    }
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
}
