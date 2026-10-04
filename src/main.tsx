import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Importing the theme store applies the saved theme before the first paint.
import "@/themes/store";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
