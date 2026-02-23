import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import MLPredictorPage from "./pages/MLPredictorPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="ml-predictor" element={<MLPredictorPage />} />
          <Route path="ai-assistant" element={<AIAssistantPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
