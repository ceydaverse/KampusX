import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./MainLayout/MainLayout";
import AuthPage from "./features/auth/pages/AuthPage";
import CategoryPage from "./features/categories/CategoryPage";
import CommunityRulesPage from "./features/pages/CommunityRulesPage";
import HakkimizdaPage from "./features/pages/HakkimizdaPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/kategori/:slug" element={<CategoryPage />} />
        <Route path="/topluluk-kurallari" element={<CommunityRulesPage />} />
        <Route path="/hakkimizda" element={<HakkimizdaPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

