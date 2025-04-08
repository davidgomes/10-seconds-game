import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Game from "@/pages/Game";
import Login from "@/pages/Login";
import { GameProvider, useGame } from "@/context/GameContext";
import { ThemeProvider } from "@/context/ThemeContext";

function ProtectedRouteWithProviders({ component: Component }: { component: React.ComponentType }) {
  const { isLoggedIn } = useGame();

  if (!isLoggedIn) {
    return <Login />;
  }

  return <Component />;
}

function AppRoutes() {
  return (
    <GameProvider>
      <Switch>
        <Route path="/" component={() => <ProtectedRouteWithProviders component={Game} />} />
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </GameProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
