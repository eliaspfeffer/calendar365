import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { VibeKanbanWebCompanion } from "vibe-kanban-web-companion";

createRoot(document.getElementById("root")!).render(
  <>
    <VibeKanbanWebCompanion />
    <App />
  </>,
);
