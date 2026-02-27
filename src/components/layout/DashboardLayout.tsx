import Header from "./Header";
import Sidebar from "./Sidebar";
import { SidebarProvider } from "./SidebarContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
