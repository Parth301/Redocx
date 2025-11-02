import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage.js";
import FormatPage from "./pages/FormatPage.js";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/format" element={<FormatPage />} />
      </Routes>
    </Router>
  );
}

export default App;