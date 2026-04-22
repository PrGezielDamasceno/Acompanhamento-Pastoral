import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, Clock, Users, CheckCircle, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const STATUS_LABEL = {
  agendado: { label: "Agendado", color: "bg-blue-100 text-blue-700" },
  realizado: { label: "Realizado", color: "bg-green-100 text-green-700" },
  concluido: { label: "Concluído", color: "bg-green-100 text-green-700" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-700" },
  faltou: { label: "Faltou", color: "bg-red-100 text-red-700" },
  reagendado: { label: "Reagendado", color: "bg-orange-100 text-orange-700" },
  em_aberto: { label: "Em aberto", color: "bg-gray-100 text-gray-600" },
};

function formatData(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

export default function DashboardPastor({ user }) {
  const [atendimentos, setAtendimentos] = useState([]);
  const [loading, setLoading] = useState(true);

  const hoje = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadData();
    const unsub = base44.entities.Atendimento.subscribe(() => loadData());
    return unsub;
  }, [user]);

  async function loadData() {
    const all = await base44.entities.Atendimento.filter({ pastor: user.full_name }, "-data_atendimento", 300);
    setAtendimentos(all);
    setLoading(false);
  }

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const agendaHoje = atendimentos.filter(a => a.data_atendimento === hoje && !["cancelado"].includes(a.status));
  const pendentes = atendimentos.filter(a => ["agendado", "em_aberto"].includes(a.status));
  const realizadosMes = atendimentos.filter(a => a.data_atendimento >= inicioMes && ["realizado", "concluido"].includes(a.status));

  const pessoas = [...new Set(atendimentos.map(a => a.pessoa_atendida).filter(Boolean))];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Olá, {user.full_name?.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Sua agenda e atividades pastorais</p>
        </div>
        <Link to="/atendimentos/novo">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Atendimento</Button>
        </Link>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Calendar, label: "Hoje", value: agendaHoje.length, color: "text-primary" },
          { icon: AlertTriangle, label: "Pendentes", value: pendentes.length, color: "text-yellow-600" },
          { icon: CheckCircle, label: "Realizados no mês", value: realizadosMes.length, color: "text-green-600" },
          { icon: Users, label: "Pessoas atendidas", value: pessoas.length, color: "text-blue-600" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Agenda do dia */}
      <div className="bg-card border rounded-xl p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Agenda de hoje — {formatData(hoje)}
        </h2>
        {agendaHoje.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum atendimento agendado para hoje.</p>
        ) : (
          <div className="space-y-3">
            {agendaHoje.map(a => {
              const s = STATUS_LABEL[a.status] || STATUS_LABEL.em_aberto;
              return (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                  <div>
                    <p className="font-medium text-sm">{a.pessoa_atendida || "—"}</p>
                    <p className="text-xs text-muted-foreground">{a.motivo || "Sem motivo especificado"}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${s.color}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pendências */}
      {pendentes.length > 0 && (
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-yellow-700">
            <AlertTriangle className="h-4 w-4" />
            Pendências ({pendentes.length})
          </h2>
          <div className="space-y-3">
            {pendentes.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                <div>
                  <p className="font-medium text-sm">{a.pessoa_atendida || "—"}</p>
                  <p className="text-xs text-muted-foreground">{formatData(a.data_atendimento)}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_LABEL[a.status]?.color || ""}`}>
                  {STATUS_LABEL[a.status]?.label || a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pessoas atendidas */}
      <div className="bg-card border rounded-xl p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          Pessoas que atendeu
        </h2>
        {pessoas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro encontrado.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {pessoas.slice(0, 12).map(p => (
              <div key={p} className="p-2 rounded-lg border bg-background text-sm font-medium truncate">{p}</div>
            ))}
            {pessoas.length > 12 && (
              <div className="p-2 rounded-lg border bg-muted text-sm text-muted-foreground text-center">+{pessoas.length - 12} mais</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}