import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { CreatePage } from "@/features/create/CreatePage";
import { EditorPage } from "@/features/editor/EditorPage";
import { HomePage } from "@/features/home/HomePage";
import { JoinPage } from "@/features/join/JoinPage";
import { RoomPage } from "@/features/room/RoomPage";
import { RulesPage } from "@/features/rules/RulesPage";
import { useProfile } from "@/store/profile";
import { ConfirmHost, Toaster } from "@/ui/feedback";

/**
 * Hash-based routing: GitHub Pages serves a single index.html, so `#/lobby` style URLs work
 * on reload and in shared invite links without any server configuration.
 */
export function App() {
  const language = useProfile((s) => s.language);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/room" element={<RoomPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <ConfirmHost />
    </HashRouter>
  );
}
