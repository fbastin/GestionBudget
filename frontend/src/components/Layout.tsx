import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Building2, ChevronRight, CreditCard, TrendingUp, Landmark, Receipt, HandCoins } from "lucide-react";

export function Layout() {
  const location = useLocation();

  const menuItems = [
    { path: "/", label: "Actifs/Passifs", icon: <LayoutDashboard size={20} /> },
    { path: "/depenses", label: "Dépenses", icon: <Receipt size={20} /> },
    { path: "/paiements", label: "Paiements", icon: <HandCoins size={20} /> },
    { path: "/investissements", label: "Investissements", icon: <TrendingUp size={20} /> },
    { path: "/banques", label: "Banques", icon: <Building2 size={20} /> },
    { path: "/credits", label: "Crédits", icon: <CreditCard size={20} /> },
    { path: "/celi", label: "CELI", icon: <TrendingUp size={20} /> },
    { path: "/reer", label: "REER", icon: <Landmark size={20} /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 text-blue-600">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <LayoutDashboard size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">FinanceLib</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                  isActive 
                    ? "bg-blue-50 text-blue-600 font-bold" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight size={16} />}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-900 rounded-2xl p-4 text-white">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Version</p>
            <p className="text-sm font-semibold text-white">v1.2.0-beta</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Nav */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <span className="font-bold text-slate-900">FinanceLib</span>
          <div className="flex gap-4">
            {menuItems.map(item => (
              <Link 
                key={item.path} 
                to={item.path} 
                className={location.pathname === item.path ? "text-blue-600" : "text-slate-400"}
              >
                {item.icon}
              </Link>
            ))}
          </div>
        </header>
        
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
