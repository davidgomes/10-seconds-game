import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Game from "@/pages/Game";
import Login from "@/pages/Login";
import { GameProvider, useGame } from "@/context/GameContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LoadingProvider, useLoading } from "@/context/LoadingContext";
import { GlobalLoadingIndicator } from "@/components/GlobalLoadingIndicator";
import { useEffect } from "react";
import { useState } from "react";
import {
  PGliteProvider,
  useLiveQuery,
  usePGlite,
} from '@electric-sql/pglite-react'
import { type PGliteWithLive } from '@electric-sql/pglite/live'
import { loadPGlite } from './db';
import ChangeLogSynchronizer from "@/sync";

function ProtectedRouteWithProviders({ component: Component }: { component: React.ComponentType }) {
  const { isLoggedIn } = useGame();
  const { isLoading } = useLoading();

  if (isLoading) {
    return null; // GlobalLoadingIndicator will show instead
  }

  if (!isLoggedIn) {
    return <Login />;
  }

  return <Component />;
}

function AppRoutes() {
  const [db, setDb] = useState<PGliteWithLive>()

  useEffect(() => {
    let isMounted = true
    let writePathSync: ChangeLogSynchronizer

    async function init() {
      const pglite = await loadPGlite()

      if (!isMounted) {
        return
      }

      writePathSync = new ChangeLogSynchronizer(pglite)
      writePathSync.start()

      setDb(pglite)
    }

    init()

    return () => {
      isMounted = false

      // if (writePathSync !== undefined) {
        // writePathSync.stop()
      // }
    }
  }, []);

  if (!db) {
    return null;
  }
  
  return (
    <PGliteProvider db={db}>
      <GameProvider>
        <Switch>
          <Route path="/" component={() => <ProtectedRouteWithProviders component={Game} />} />
        <Route component={NotFound} />
        </Switch>
        <Toaster />
      </GameProvider>
    </PGliteProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      
      <ThemeProvider>
        <LoadingProvider>
          <GlobalLoadingIndicator />
          <AppRoutes />
          </LoadingProvider>
        </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
