import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Extensoes from './pages/Extensoes';
import ExtensaoDetalhe from './pages/ExtensaoDetalhe';
import NovoRelatorio from './pages/NovoRelatorio';
import EditarRelatorio from './pages/EditarRelatorio';
import Relatorios from './pages/Relatorios';
import Observacoes from './pages/Observacoes';
import Configuracoes from './pages/Configuracoes';
import RelatorioMensal from './pages/RelatorioMensal';
import PainelSupervisao from './pages/PainelSupervisao';
import GestaoUsuarios from './pages/GestaoUsuarios';
import AnaliseUltimoCulto from './pages/AnaliseUltimoCulto';


const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/extensoes" element={<Extensoes />} />
        <Route path="/extensao/:id" element={<ExtensaoDetalhe />} />
        <Route path="/relatorio/novo" element={<NovoRelatorio />} />
        <Route path="/relatorio/editar/:id" element={<EditarRelatorio />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/observacoes" element={<Observacoes />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/relatorio-mensal" element={<RelatorioMensal />} />
        <Route path="/painel-supervisao" element={<PainelSupervisao />} />
        <Route path="/usuarios" element={<GestaoUsuarios />} />
        <Route path="/analise-culto" element={<AnaliseUltimoCulto />} />

        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App