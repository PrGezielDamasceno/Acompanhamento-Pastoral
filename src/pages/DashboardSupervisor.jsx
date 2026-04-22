import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, Church, Users, AlertTriangle, TrendingUp, Activity, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function formatData(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

function classificar(total) {
  if (total === 0) return { label: "Inativa", color: "bg-gray-100 text-gray-600", bar: "#d1d5db" };
  if (total <= 3) return { label: "Baixa", color: "bg-yellow-100 text-yellow-700", bar: "#fbbf24" };
  if (total <= 7) return { label: "Moderada", color: "bg-blue-100 text-blue-700", bar: "#3b82f6" };
  return { label: "Consistente", color: "bg-green-100 text-green-700", bar: "#22c55e" };
}

export default function DashboardSupervisor({ user }) {
  const [atendimentos, setAtendimentos] = useState([]);
  const [extensoes, setExtensoes] = useState([]);
  const [pessoas, setPessoas] = useState([]);
  const [loading, setLoading] = useState(true);

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const hoje = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadData();
    const unsub = base44.entities.Atendimento.subscribe(() => loadData());
    return unsub;
  }, []);

  async function loadData() {
    const [a, e, p] = await Promise.all([
      base44.entities.Atendimento.list("-data_atendimento", 1000),
      base44.entities.Extensao.list(),
      base44.entities.Pessoa.list("-created_date", 500),
    ]);
    setAtendimentos(a);
    setExtensoes(e.filter(ext => ext.status !== "inativa"));
    setPessoas(p);
    setLoading(false);
  }

  const pastores = useMemo(() => {
    const set = new Set(atendimentos.map(a => a.pastor).filter(Boolean));
    return Array.from(set).sort();
  }, [atendimentos]);

  const produtividade = useMemo(() => {
    return pastores.map(pastor => {
      const mes = atendimentos.filter(a =>
        a.pastor === pastor &&
        ["realizado", "concluido"].includes(a.status) &&
        a.data_atendimento >= inicioMes
      );
      const total = mes.length;
      const classi = classificar(total);
      const ultimo = atendimentos
        .filter(a => a.pastor === pastor && ["realizado", "concluido"].includes(a.status))
        .sort((a, b) => b.data_atendimento.localeCompare(a.data_atendimento))[0];
      return { pastor, total, classi, ultimoAtend: ultimo?.data_atendimento };
    }).sort((a, b) => b.total - a.total);
  }, [atendimentos, pastores, inicioMes]);

  const unidades = useMemo(() => {
    return extensoes.map(ext => {
      const mes = atendimentos.filter(a =>
        a.extensao_id === ext.id &&
        ["realizado", "concluido"].includes(a.status) &&
        a.data_atendimento >= inicioMes
      );
      const pendentes = atendimentos.filter(a =>
        a.extensao_id === ext.id &&
        ["agendado", "em_aberto"].includes(a.status)
      );
      return { ...ext, realizadosMes: mes.length, pendentes: pendentes.length };
    }).sort((a, b) => b.realizadosMes - a.realizadosMes);
  }, [atendimentos, extensoes, inicioMes]);

  const alertas = useMemo(() => {
    const items = [];
    const seiteDias = new Date();
    seiteDias.setDate(seiteDias.getDate() - 7);
    const seiteDiasStr = seiteDias.toISOString().split("T")[0];

    produtividade.filter(p => p.total === 0).forEach(p => {
      items.push({ tipo: "atencao", msg: `${p.pastor} sem atendimentos este mês` });
    });

    extensoes.forEach(ext => {
      const recente = atendimentos.find(a => a.extensao_id === ext.id && a.data_atendimento >= seiteDiasStr);
      if (!recente) {
        items.push({ tipo: "critico", msg: `${ext.nome} sem atividade nos últimos 7 dias` });
      }
    });

    const semConfirmacao = atendimentos.filter(a =>
      a.status === "agendado" && a.data_atendimento <= hoje
    );
    if (semConfirmacao.length > 0) {
      items.push({ tipo: "atencao", msg: `${semConfirmacao.length} atendimento(s) agendado(s) sem confirmação` });
    }

    return items;
  }, [produtividade, extensoes, atendimentos, hoje]);

  const resumo = useMemo(() => {
    const realizados = atendimentos.filter(a =>
      ["realizado", "concluido"].includes(a.status) && a.data_atendimento >= inicioMes
    ).length;
    const pendentes = atendimentos.filter(a => ["agendado", "em_aberto"].includes(a.status)).length;
    const ativos = produtividade.filter(p => p.total > 0).length;
    const inativos = produtividade.filter(p => p.total === 0).length;
    const visitantesMes = pessoas.filter(p => p.data_visita >= inicioMes).length;
    const conversoesMes = pessoas.filter(p => p.data_conversao >= inicioMes).length;
    const semAcompanhamento = pessoas.filter(p => {
      if (p.etapa_cia === "integrado") return false;
      const ref = p.data_ultimo_contato || p.data_visita;
      if (!ref) return true;
      const dias = Math.floor((new Date() - new Date(ref)) / (1000 * 60 * 60 * 24));
      return dias >= 7;
    }).length;
    const emConsolidacao = pessoas.filter(p => ["novo_convertido", "em_consolidacao"].includes(p.etapa_cia)).length;
    return { realizados, pendentes, ativos, inativos, visitantesMes, conversoesMes, semAcompanhamento, emConsolidacao };
  }, [atendimentos, produtividade, inicioMes, pessoas]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Painel do Supervisor</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral da produtividade e unidades</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: CheckCircle, label: "Realizados no mês", value: resumo.realizados, color: "text-green-600" },
          { icon: Activity, label: "Pendentes", value: resumo.pendentes, color: "text-yellow-600" },
          { icon: Users, label: "Pastores ativos", value: resumo.ativos, color: "text-primary" },
          { icon: XCircle, label: "Pastores inativos", value: resumo.inativos, color: "text-red-500" },
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

      {/* CIA resumo */}
      <div className="bg-card border rounded-xl p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Acompanhamento CIA — Este mês</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Visitantes", value: resumo.visitantesMes, color: "text-blue-600" },
            { label: "Conversões", value: resumo.conversoesMes, color: "text-green-600" },
            { label: "Em Consolidação", value: resumo.emConsolidacao, color: "text-orange-500" },
            { label: "Sem Acompanhamento", value: resumo.semAcompanhamento, color: "text-red-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center p-3 rounded-lg bg-muted/30">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-yellow-700">
            <AlertTriangle className="h-4 w-4" />
            Alertas ({alertas.length})
          </h2>
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${a.tipo === "critico" ? "bg-red-50 border-red-200 text-red-800" : "bg-yellow-50 border-yellow-200 text-yellow-800"}`}>
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {a.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Produtividade por pastor */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Produtividade — Este mês
          </h2>
          {produtividade.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado disponível.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={produtividade.slice(0, 8)} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="pastor" tick={{ fontSize: 10 }} tickFormatter={v => v.split(" ")[0]} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [v, "Atendimentos"]} labelFormatter={l => l} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {produtividade.slice(0, 8).map((p, i) => (
                      <Cell key={i} fill={p.classi.bar} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {produtividade.slice(0, 6).map(p => (
                  <div key={p.pastor} className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[160px]">{p.pastor}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{p.total} atend.</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.classi.color}`}>{p.classi.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Unidades */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Church className="h-4 w-4 text-primary" />
            Unidades — Este mês
          </h2>
          {unidades.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma unidade ativa.</p>
          ) : (
            <div className="space-y-3">
              {unidades.map(ext => (
                <div key={ext.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                  <div>
                    <p className="font-medium text-sm">{ext.nome}</p>
                    <p className="text-xs text-muted-foreground">{ext.cidade}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-green-600">{ext.realizadosMes}</p>
                      <p className="text-xs text-muted-foreground">realizados</p>
                    </div>
                    {ext.pendentes > 0 && (
                      <div className="text-center">
                        <p className="font-bold text-yellow-600">{ext.pendentes}</p>
                        <p className="text-xs text-muted-foreground">pendentes</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}