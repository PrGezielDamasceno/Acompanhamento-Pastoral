import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import DashboardPastor from "./DashboardPastor";
import DashboardUnidade from "./DashboardUnidade";
import DashboardSupervisor from "./DashboardSupervisor";
import { Church, Users, Baby, UserPlus, Heart, FileText, TrendingUp, AlertTriangle } from "lucide-react";
import StatCard from "../components/StatCard";
import AlertCard from "../components/AlertCard";
import DashboardCharts from "../components/DashboardCharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dashboard() {
  const [relatorios, setRelatorios] = useState([]);
  const [extensoes, setExtensoes] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodoFilter, setPeriodoFilter] = useState("30");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [u, ext, rel] = await Promise.all([
      base44.auth.me(),
      base44.entities.Extensao.list(),
      base44.entities.Relatorio.list("-data_culto", 500),
    ]);
    setUser(u);
    setExtensoes(ext.filter(e => e.status !== "inativa"));
    setRelatorios(rel);
    setLoading(false);
  }

  const filteredRelatorios = useMemo(() => {
    const days = parseInt(periodoFilter);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    let filtered = relatorios.filter(r => new Date(r.data_culto) >= cutoff);
    if (user?.role === "lider" && user?.extensao_id) {
      filtered = filtered.filter(r => r.extensao_id === user.extensao_id);
    }
    return filtered;
  }, [relatorios, periodoFilter, user]);

  const stats = useMemo(() => {
    const totalAdultos = filteredRelatorios.reduce((s, r) => s + (r.adultos || 0), 0);
    const totalCriancas = filteredRelatorios.reduce((s, r) => s + (r.criancas || 0), 0);
    const totalVisitantes = filteredRelatorios.reduce((s, r) => s + (r.visitantes || 0), 0);
    const totalConversoes = filteredRelatorios.reduce((s, r) => s + (r.conversoes || 0), 0);
    return { totalAdultos, totalCriancas, totalVisitantes, totalConversoes };
  }, [filteredRelatorios]);

  const alerts = useMemo(() => {
    const items = [];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    extensoes.forEach(ext => {
      const extReports = relatorios.filter(r => r.extensao_id === ext.id);
      const recentReports = extReports.filter(r => new Date(r.data_culto) >= oneWeekAgo);
      if (recentReports.length === 0 && extReports.length > 0) {
        items.push({ type: "warning", title: `${ext.nome} sem relatório`, message: "Nenhum relatório registrado na última semana." });
      }
    });
    if (filteredRelatorios.length > 0 && stats.totalConversoes === 0) {
      items.push({ type: "info", title: "Sem conversões no período", message: "Nenhuma conversão registrada nos últimos " + periodoFilter + " dias." });
    }
    return items;
  }, [extensoes, relatorios, filteredRelatorios, stats, periodoFilter]);

  // Roteamento por perfil (todos os hooks já foram chamados)
  if (!loading && user?.role === "pastor") return <DashboardPastor user={user} />;
  if (!loading && user?.role === "lider") return <DashboardUnidade user={user} />;
  if (!loading && user?.role === "supervisor") return <DashboardSupervisor user={user} />;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão geral das extensões
          </p>
        </div>
        <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Church} label="Extensões Ativas" value={extensoes.length} />
        <StatCard icon={FileText} label="Cultos" value={filteredRelatorios.length} />
        <StatCard icon={Users} label="Adultos" value={stats.totalAdultos} />
        <StatCard icon={Baby} label="Crianças" value={stats.totalCriancas} />
        <StatCard icon={UserPlus} label="Visitantes" value={stats.totalVisitantes} />
        <StatCard icon={Heart} label="Conversões" value={stats.totalConversoes} />
      </div>

      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Alertas
          </h2>
          {alerts.map((alert, i) => (
            <AlertCard key={i} {...alert} />
          ))}
        </div>
      )}

      <DashboardCharts relatorios={filteredRelatorios} extensoes={extensoes} />
    </div>
  );
}