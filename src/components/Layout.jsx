import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  LayoutDashboard, Church, FileText, ClipboardList, 
  Eye, Settings, Menu, X, LogOut, User, BarChart2, MonitorCheck, UsersRound, FlaskConical
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/extensoes", icon: Church, label: "Extensões" },
  { to: "/relatorio/novo", icon: FileText, label: "Novo Relatório" },
  { to: "/relatorios", icon: ClipboardList, label: "Relatórios" },
  { to: "/observacoes", icon: Eye, label: "Observações" },
  { to: "/relatorio-mensal", icon: BarChart2, label: "Relatório Mensal" },
  { to: "/painel-supervisao", icon: MonitorCheck, label: "Painel de Supervisão" },
  { to: "/analise-culto", icon: FlaskConical, label: "Análise de Culto" },
  { to: "/usuarios", icon: UsersRound, label: "Usuários" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

function getLinksForRole() {
  return navLinks;
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const links = getLinksForRole(user?.role);

  const handleLogout = () => {
    base44.auth.logout("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-primary text-primary-foreground
        transform transition-transform duration-200 ease-in-out flex flex-col
        print:hidden
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="p-6 border-b border-white/10 flex-shrink-0">
          <h1 className="text-lg font-bold tracking-tight">Supervisão de Campo</h1>
          <p className="text-xs opacity-70 mt-1">Mais de Cristo</p>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${isActive 
                    ? "bg-white/15 text-white" 
                    : "text-white/70 hover:text-white hover:bg-white/10"
                  }
                `}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || "Usuário"}</p>
              <p className="text-xs opacity-60 capitalize">{user?.role || "..."}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-white/70 hover:text-white hover:bg-white/10 justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <header className="sticky top-0 z-30 bg-card border-b px-4 py-3 flex items-center gap-3 lg:px-6 print:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.full_name}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}