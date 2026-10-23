import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { StoreProvider } from '@/lib/store';
import { AppShell } from '@/components/app-shell';
import LandingPage from '@/pages/landing';
import UnderstandPage from '@/pages/understand';
import MarketPage from '@/pages/market';
import TrendsPage from '@/pages/trends';
import TimeMachinePage from '@/pages/time-machine';
import RoadmapPage from '@/pages/roadmap';
import ResumePage from '@/pages/resume';
import ImpactPage from '@/pages/impact';
import AiStatusPage from '@/pages/ai-status';

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

function AppRoutes() {
  return (
    <AppShell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/app"><Redirect to="/app/understand" /></Route>
          <Route path="/app/understand" component={UnderstandPage} />
          <Route path="/app/explore/market" component={MarketPage} />
          <Route path="/app/explore/trends" component={TrendsPage} />
          <Route path="/app/explore/time-machine" component={TimeMachinePage} />
          <Route path="/app/roadmap" component={RoadmapPage} />
          <Route path="/app/roadmap/tracker"><Redirect to="/app/roadmap" /></Route>
          <Route path="/app/roadmap/resume" component={ResumePage} />
          <Route path="/app/impact" component={ImpactPage} />
          <Route path="/app/ai-status" component={AiStatusPage} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </AppShell>
  );
}

function Router() {
  const [loc] = useLocation();
  if (loc === '/app' || loc.startsWith('/app/')) return <AppRoutes />;
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StoreProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </StoreProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
