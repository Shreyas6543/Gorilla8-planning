import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { FinancePage } from "./pages/FinancePage";
import { LedgerPage } from "./pages/LedgerPage";
import { MarketingPage } from "./pages/MarketingPage";
import { FloorPlanPage } from "./pages/FloorPlanPage";
import { DesignPage } from "./pages/DesignPage";
import { WalkthroughPage } from "./pages/WalkthroughPage";
import { QrScansPage } from "./pages/QrScansPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { TeamAccessPage } from "./pages/TeamAccessPage";
import { WalletPage } from "./pages/WalletPage";
import { RedeemPage } from "./pages/RedeemPage";
import { Gate } from "./components/Gate";
import { FurnitureLayoutProvider } from "./state/furnitureLayout";
import { AdminProvider } from "./state/adminAuth";
import { ViewerProvider } from "./state/viewerAuth";

function App() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <ViewerProvider>
          <FurnitureLayoutProvider>
            <Routes>
              {/* Internal/business pages — gated, see components/Gate.tsx */}
              <Route path="/" element={<Gate><HomePage /></Gate>} />
              <Route path="/expenses" element={<Gate><ExpensesPage /></Gate>} />
              <Route path="/ledger" element={<Gate><LedgerPage /></Gate>} />
              <Route path="/finance" element={<Gate><FinancePage /></Gate>} />
              <Route path="/marketing" element={<Gate><MarketingPage /></Gate>} />
              <Route path="/floorplan" element={<Gate><FloorPlanPage /></Gate>} />
              <Route path="/design" element={<Gate><DesignPage /></Gate>} />
              <Route path="/walkthrough" element={<Gate><WalkthroughPage /></Gate>} />
              <Route path="/qr-scans" element={<Gate><QrScansPage /></Gate>} />
              {/* Gate-wrapped (need at least viewer), admin check happens inside the page itself */}
              <Route path="/redeem" element={<Gate><RedeemPage /></Gate>} />

              {/* Public — no Gate */}
              <Route path="/coming-soon" element={<ComingSoonPage />} />
              <Route path="/team" element={<TeamAccessPage />} />
              <Route path="/wallet/:token" element={<WalletPage />} />
            </Routes>
          </FurnitureLayoutProvider>
        </ViewerProvider>
      </AdminProvider>
    </BrowserRouter>
  );
}

export default App;
