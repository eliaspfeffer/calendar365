import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSystemColorScheme } from "./lib/systemColorScheme";

initSystemColorScheme();
createRoot(document.getElementById("root")!).render(<App />);
