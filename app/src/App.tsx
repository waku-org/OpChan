//TODO: research into having signatures somehow?
//TODO research: **each message sent should not be able to be spoofed**
/**
 * Reference:
 * https://www.notion.so/Logos-Forum-PoC-Waku-Powered-Opchan-1968f96fb65c8078b343c43429d66d0a#1968f96fb65c8025a929c2c9255a57c4
 * Also note that for UX purposes, **we should not ask a user to sign with their Bitcoin wallet for every action.**
 *
 * Instead, a key delegation system should be developed.
 *
 * - User sign an in-browser key with their wallet and broadcast it
 * - Browser uses in-browser key to sign messages moving forward
 */

import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CellPage from './pages/CellPage';
import PostPage from './pages/PostPage';
import NotFound from './pages/NotFound';
import Dashboard from './pages/Dashboard';
import Index from './pages/Index';
import ProfilePage from './pages/ProfilePage';
import BookmarksPage from './pages/BookmarksPage';

// Create a client
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Router>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cells" element={<Index />} />
          <Route path="/cell/:cellId" element={<CellPage />} />
          <Route path="/post/:postId" element={<PostPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </Router>
  </QueryClientProvider>
);

export default App;
