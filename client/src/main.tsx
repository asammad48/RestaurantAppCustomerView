import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeColors } from "./lib/colors";

// Initialize color system on app start
initializeColors();

createRoot(document.getElementById("root")!).render(<App />);
