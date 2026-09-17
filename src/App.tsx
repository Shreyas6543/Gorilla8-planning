import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ComparisonPage } from "./pages/ComparisonPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { FloorPlanPage } from "./pages/FloorPlanPage";
import { DesignPage } from "./pages/DesignPage";
import { WalkthroughPage } from "./pages/WalkthroughPage";
import { FurnitureLayoutProvider } from "./state/furnitureLayout";
import { AdminProvider } from "./state/adminAuth";

function App() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <FurnitureLayoutProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/floorplan" element={<FloorPlanPage />} />
            <Route path="/design" element={<DesignPage />} />
            <Route path="/walkthrough" element={<WalkthroughPage />} />
          </Routes>
        </FurnitureLayoutProvider>
      </AdminProvider>
    </BrowserRouter>
  );
}

export default App;
