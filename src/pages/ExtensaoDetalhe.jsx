import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Church, Users, Baby, UserPlus, Heart, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "../components/StatCard";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const NIVEL_BADGE = {
  saudavel: "bg-green-100 text-green-700",
  ajustes: "bg-yellow-100 text-yellow-700",
  risco: "bg-red-100 text-red-700",
};

const NIVEL_LABEL = { saudavel: "Saudável", ajustes: "Ajustes", risco: "Risco" };

export default function ExtensaoDetalhe() {
  const navigate = useNavigate();
  const extId = window.location.pathname.split("/").pop();
  const [extensao, setExtensao] = useState(null);
  const [relatorios, setRelatorios] = useState([]);
  const [observacoes, setObservacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [exts, rels, obs] = await Promise.all([
      base44.entities.Extensao.list(),
      base44.entities.Relatorio.filter({ extensao_id: extId }, "-data_culto", 200),
      base44.entities.ObservacaoPastoral.filter({ extensao_id: extId }, "-data", 50),
    ]);
    setExtensao(exts.find(e => e.id === extId));
    setRelatorios(rels);
    setObservacoes(obs);
    setLoading(false);
  }

  const stats = useMemo(() => {
    const totalAdultos = relatorios.reduce((s, r) => s + (r.adultos || 0), 0);
    const totalCriancas = relatorios.reduce((s, r) => s + (r.criancas || 0), 0);
    const totalVisitantes = relatorios.reduce((s, r) => s + (r.visitantes || 0), 0);
    const totalConversoes = relatorios.reduce((s, r) => s + (r.conversoes || 0), 0);
    const cultos = relatorios.length;
    return {
      cultos,
      mediaAdultos: cultos > 0 ? Math.round(totalAdultos / cultos) : 0,
      mediaCriancas: cultos > 0 ? Math.round(totalCriancas / cultos) : 0,
      totalVisitantes,
      totalConversoes,
    };
  }, [relatorios]);

  const chartData = useMemo(() => {
    const map = {};
    relatorios.forEach(r => {
      const m = r.data_culto?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { mes: m, adultos: 0, count: 0 };
      map[m].adultos += r.adultos || 0;
      map[m].count += 1;
    });
    return Object.values(map)
      .map(d => ({ ...d, media: Math.round(d.adultos / d.count) }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [relatorios]);

  const formatMonth = (m) => {
    if (!m) return "";
    const [y, mo] = m.split("-");
    const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${months[parseInt(mo) - 1]}/${y.slice(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!extensao) {
    return <div className="text-center py-12 text-muted-foreground">Extensão não encontrada.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/extensoes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{extensao.nome}</h1>
          <p className="text-muted-foreground text-sm">{extensao.cidade} • {extensao.responsavel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={FileText} label="Cultos" value={stats.cultos} />
        <StatCard icon={Users} label="Média Adultos" value={stats.mediaAdultos} />
        <StatCard icon={Baby} label="Média Crianças" value={stats.mediaCriancas} />
        <StatCard icon={UserPlus} label="Visitantes" value={stats.totalVisitantes} />
        <StatCard icon={Heart} label="Conversões" value={stats.totalConversoes} />
      </div>

      {chartData.length > 0 && (
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-4">Média de Adultos por Mês</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tickFormatter={formatMonth} fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip labelFormatter={formatMonth} />
              <Line type="monotone" dataKey="media" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} name="Média Adultos" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {observacoes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Observações Pastorais</h2>
          <div className="space-y-3">
            {observacoes.map(o => (
              <div key={o.id} className="bg-card rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${NIVEL_BADGE[o.nivel_atencao]}`}>
                    {NIVEL_LABEL[o.nivel_atencao]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(o.data).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm">{o.observacao}</p>
                {o.encaminhamento && (
                  <p className="text-sm text-muted-foreground mt-2">↳ {o.encaminhamento}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}