import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import MainLayout from "./layouts/MainLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Bills from "./pages/Bills";
import CreateBill from "./pages/CreateBill";
import Baskets from "./pages/Baskets";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import PrintInvoice from "./pages/PrintInvoice";
import PrintMultipleBills from "./pages/PrintMultipleBills";
import AuthPage from "./pages/Auth";
import RequireAuth from "./components/auth/RequireAuth";
import PendingApproval from "./pages/PendingApproval";
import AdminUsers from "./pages/AdminUsers";
import SubmitMailbox from "./pages/SubmitMailbox";
import MailboxPage from "./pages/MailboxPage";
import Expenses from "./pages/Expenses";
import Employees from "./pages/Employees";
import EmployeeProfile from "./pages/EmployeeProfile";
import AuditLogs from "./pages/AuditLogs";
import Install from "./pages/Install";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="/install" element={<Install />} />
              <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/bills" element={<Bills />} />
                <Route path="/create" element={<CreateBill />} />
                <Route path="/baskets" element={<Baskets />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />
                <Route path="/admin" element={<AdminUsers />} />
                <Route path="/submit" element={<SubmitMailbox />} />
                <Route path="/mailbox" element={<MailboxPage />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/employee-profile/:id" element={<EmployeeProfile />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="/print/:invoiceId" element={<PrintInvoice />} />
              <Route path="/print-bills" element={<PrintMultipleBills />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
