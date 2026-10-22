import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/luminous.css";

const fonts = document.createElement("link");
fonts.rel = "stylesheet";
fonts.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap";
document.head.appendChild(fonts);

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
