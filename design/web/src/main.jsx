import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "../../mockup.jsx";
import StagesGallery from "./StagesGallery.jsx";

function Router() {
  const [route, setRoute] = useState(window.location.hash || "#/");

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (route.startsWith("#/stages")) return <StagesGallery />;
  return <App />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
