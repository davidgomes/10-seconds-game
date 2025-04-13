import React from "react";
import { Moon, Palette, Monitor } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  // Try/catch to handle cases where this component might be rendered
  // outside of ThemeProvider
  try {
    const { theme, resolvedTheme, setTheme } = useTheme();

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="rounded-full">
            {resolvedTheme === "vibe" ? (
              <Palette size={18} />
            ) : (
              <Moon size={18} />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setTheme("vibe")}
            className={cn(
              theme === "vibe" && "bg-accent text-accent-foreground",
            )}
          >
            <Palette className="mr-2 h-4 w-4" />
            <span>Vibe</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme("dark")}
            className={cn(
              theme === "dark" && "bg-accent text-accent-foreground",
            )}
          >
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme("system")}
            className={cn(
              theme === "system" && "bg-accent text-accent-foreground",
            )}
          >
            <Monitor className="mr-2 h-4 w-4" />
            <span>System</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  } catch (error) {
    // Return null if the ThemeProvider isn't available yet
    return null;
  }
}
