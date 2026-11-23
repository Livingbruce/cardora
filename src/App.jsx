import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import AddFunds from "./pages/dashboard/Funds";
import DashboardLayout from "./_layouts/DashboardLayout";
import Dumps from "./pages/dashboard/Dumps";
import Rules from "./pages/dashboard/Rules";
import Faq from "./pages/dashboard/Faq";
import Source1 from "./pages/dashboard/source/source1";
import Source2 from "./pages/dashboard/source/source2";
import Source3 from "./pages/dashboard/source/source3";
import Novbv from "./pages/dashboard/Novbv";
import Tickets from "./pages/dashboard/Tickets";
import NewTicket from "./pages/dashboard/tickets/newTicket";
import Refund from "./pages/dashboard/tickets/refund";
import CcChecker from "./pages/dashboard/checker/ccChecker";
import DumpChecker from "./pages/dashboard/checker/dumpChecker";
import VbvChecker from "./pages/dashboard/checker/3dsvbv";
import BalanceChecker from "./pages/dashboard/checker/balanceChecker";
import AVSChecker from "./pages/dashboard/checker/avsChecker";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<AddFunds />} />
          <Route path="funds" element={<AddFunds />} />

          <Route path="Dumps" element={<Dumps />} />
          <Route path="Rules" element={<Rules />} />
          <Route path="Faq" element={<Faq />} />
          <Route path="source/Source1" element={<Source1 />} />
          <Route path="source/Source2" element={<Source2 />} />
          <Route path="source/Source3" element={<Source3 />} />
          <Route path="Novbv" element={<Novbv />} />
          <Route path="Tickets" element={<Tickets />} />
          <Route path="tickets/newTicket" element={<NewTicket />} />
          <Route path="tickets/refund" element={<Refund />} />
          <Route path="checker/ccChecker" element={<CcChecker />} />
          <Route path="checker/dumpChecker" element={<DumpChecker />} />
          <Route path="checker/3dsvbv" element={<VbvChecker />} />
          <Route path="checker/balanceChecker" element={<BalanceChecker />} />
          <Route path="checker/avsChecker" element={<AVSChecker />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}