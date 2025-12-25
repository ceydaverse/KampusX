import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./features/auth/AuthProvider";
import { ThemeProvider } from "./features/theme/ThemeProvider";
import { SocketProvider } from "./providers/SocketProvider";
import { PageTransition } from "./shared/components/PageTransition";
import MainLayout from "./MainLayout/MainLayout";
import AuthPage from "./features/auth/pages/AuthPage";
import CategoryPage from "./features/categories/CategoryPage";
import GroupChatsPage from "./features/groupChats/pages/GroupChatsPage";
import CommunityRulesPage from "./features/pages/CommunityRulesPage";
import HakkimizdaPage from "./features/pages/HakkimizdaPage";
import ProfilePage from "./features/account/pages/ProfilePage";
import LikesPage from "./features/account/pages/LikesPage";
import SecurityPrivacyPage from "./features/account/pages/SecurityPrivacyPage";
import SavedQuestionsPage from "./features/questions/pages/SavedQuestionsPage";
import DirectMessagesPage from "./features/messages/pages/DirectMessagesPage";

// Routes wrapper component - location ve user state'ini kullanabilmek için
const AppRoutes: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Route değişimlerinde ve user state değişimlerinde animasyonu tetiklemek için key
  const transitionKey = `${location.pathname}-${user?.id || 'no-user'}`;

  return (
    <PageTransition transitionKey={transitionKey}>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/kategori/grup-sohbetleri/:grupId?" element={<GroupChatsPage />} />
        <Route path="/kategori/:slug" element={<CategoryPage />} />
        <Route path="/topluluk-kurallari" element={<CommunityRulesPage />} />
        <Route path="/hakkimizda" element={<HakkimizdaPage />} />
        <Route path="/account/profile" element={<ProfilePage />} />
        <Route path="/account/likes" element={<LikesPage />} />
        <Route path="/account/saved" element={<SavedQuestionsPage />} />
        <Route path="/account/guvenlik-gizlilik" element={<SecurityPrivacyPage />} />
        <Route path="/dm" element={<DirectMessagesPage />} />
      </Routes>
    </PageTransition>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

