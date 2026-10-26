import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import { App } from "./App";
import "./styles/global.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");
createRoot(container).render(
  <StrictMode><App /></StrictMode>,
);
