import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardList, Clock, UserPlus, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const STATUS_LABEL = {
  agendado: { label: "Agendado", color: "bg-blue-100 text-blue-700" },
  realizado: { label: "Realizado", color: "bg-green-100 text-green-700" },
  concluido: { label: "Concluído", color: "bg-green-100 text-green-700" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  faltou: { label: "Faltou", color: "bg-red-100 text-red-700" },
  reagendado: { label: "Reagendado", color: "bg-orange-100 text-orange-700" },
  em_aberto: { label: "Em aberto", color: "bg-gray-100 text-gray-600" },
};

function formatData(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

export default function DashboardUnidade({ user }) {
  const [atendimentos, setAtendimentos] = useState([]);
  const [loading, setLoading] = useState(true);

  const hoje = new Date().toISOString().split("T")[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const inicioSemana = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split("T")[0];
  })();

  useEffect(() => {
    loadData();
    const unsub = base44.entities.Atendimento.subscribe(() => loadData());
    return unsub;
  }, [user]);

  async function loadData() {
    const query = user?.extensao_id ? { extensao_id: user.extensao_id } : {};
    const all = await base44.entities.Atendimento.filter(query, "-data_atendimento", 500);
    setAtendimentos(all);
    setLoading(false);
  }

  const realizadosMes = useMemo(() =>
    atendimentos.filter(a => a.data_atendimento >= inicioMes && ["realizado", "concluido"].includes(a.status)),
    [atendimentos, inicioMes]);

  const pendentes = useMemo(() =>
    atendimentos.filter(a => ["agendado", "em_aberto"].includes(a.status)),
    [atendimentos]);

  const novosContatos = useMemo(() => {
    const semana = atendimentos.filter(a => a.data_atendimento >= inicioSemana);
    const pessoas = [...new Set(semana.map(a => a.pessoa_atendida).filter(Boolean))];
    return pessoas;
  }, [atendimentos, inicioSemana]);

  const agendaHoje = atendimentos.filter(a => a.data_atendimento === hoje && !["cancelado"].includes(a.status));

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel da Unidade</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral dos atendimentos da sua extensão</p>
        </div>
        <Link to="/atendimentos/novo">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Atendimento</Button>
        </Link>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: ClipboardList, label: "Realizados no mês", value: realizadosMes.length, color: "text-primary" },
          { icon: Clock, label: "Pendentes", value: pendentes.length, color: "text-yellow-600" },
          { icon: UserPlus, label: "Novos contatos (semana)", value: novosContatos.length, color: "text-blue-600" },
          { icon: CheckCircle, label: "Hoje", value: agendaHoje.length, color: "text-green-600" },
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
          <ClipboardList className="h-4 w-4 text-primary" />
          Agenda de hoje
        </h2>
        {agendaHoje.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum atendimento agendado para hoje.</p>
        ) : (
          <div className="space-y-3">
            {agendaHoje.map(a => {
              const s = STATUS_LABEL[a.status] || STATUS_LABEL.em_aberto;
              return (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                  <div>
                    <p className="font-medium text-sm">{a.pessoa_atendida || "—"}</p>
                    <p className="text-xs text-muted-foreground">{a.pastor} · {a.motivo || "—"}</p>
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
            Pendências da unidade ({pendentes.length})
          </h2>
          <div className="space-y-3">
            {pendentes.slice(0, 6).map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                <div>
                  <p className="font-medium text-sm">{a.pessoa_atendida || "—"}</p>
                  <p className="text-xs text-muted-foreground">{a.pastor} · {formatData(a.data_atendimento)}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_LABEL[a.status]?.color || ""}`}>
                  {STATUS_LABEL[a.status]?.label || a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Novos contatos */}
      {novosContatos.length > 0 && (
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-600" />
            Novos contatos esta semana
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {novosContatos.map(p => (
              <div key={p} className="p-2 rounded-lg border bg-background text-sm font-medium truncate">{p}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}