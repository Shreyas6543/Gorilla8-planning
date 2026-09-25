import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { LedgerPage } from "./pages/LedgerPage";
import { MarketingPage } from "./pages/MarketingPage";
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
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/marketing" element={<MarketingPage />} />
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
