import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles/index.css";
import App from "./App.tsx";
import Demo from "./Demo";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter basename="/sparroWASM">
            <Routes>
                <Route path="/" element={<App />} />
                <Route path="/demo" element={<Demo />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>
);
