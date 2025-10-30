import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./styles/index.css";
import App from "./App.tsx";
import Demo from "./Demo";
import IsolationCheck from "./components/IsolationCheck";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <IsolationCheck onReady={() => console.log("Cross-origin isolation ready")}>
            <HashRouter>
                <Routes>
                    <Route path="/" element={<App />} />
                    <Route path="/demo" element={<Demo />} />
                </Routes>
            </HashRouter>
        </IsolationCheck>
    </StrictMode>
);
