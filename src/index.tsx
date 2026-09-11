import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/manrope/latin-800.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "./App.css";
import App from "./App";

const container = document.getElementById("root");
if (!container) throw new Error("The root element is missing");
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
