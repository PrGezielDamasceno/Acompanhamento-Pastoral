import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Users, Heart, AlertTriangle, Clock, BarChart3, Download, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { jsPDF } from "jspdf";

const ETAPAS = [
  { key: "visitante", label: "Visitante", color: "#94a3b8" },
  { key: "primeiro_contato", label: "1º Contato", color: "#3b82f6" },
  { key: "novo_convertido", label: "Novo Convertido", color: "#f59e0b" },
  { key: "em_consolidacao", label: "Em Consolidação", color: "#f97316" },
  { key: "integrado", label: "Integrado", color: "#22c55e" },
];

function formatData(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

function diasSemContato(p) {
  const ref = p.data_ultimo_contato || p.data_visita;
  if (!ref) return 999;
  return Math.floor((new Date() - new Date(ref)) / (1000 * 60 * 60 * 24));
}

export default function RelatorioCIA() {
  const [pessoas, setPessoas] = useState([]);
  const [loading, setLoading] = useState(true);

  const hoje = new Date().toISOString().split("T")[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const [dataInicial, setDataInicial] = useState(inicioMes);
  const [dataFinal, setDataFinal] = useState(hoje);

  useEffect(() => {
    base44.entities.Pessoa.list("-created_date", 1000).then(p => {
      setPessoas(p);
      setLoading(false);
    });
  }, []);

  const visitantesPeriodo = useMemo(() =>
    pessoas.filter(p => p.data_visita >= dataInicial && p.data_visita <= dataFinal),
    [pessoas, dataInicial, dataFinal]);

  const conversoesPeriodo = useMemo(() =>
    pessoas.filter(p => p.data_conversao && p.data_conversao >= dataInicial && p.data_conversao <= dataFinal),
    [pessoas, dataInicial, dataFinal]);

  const taxaConversao = useMemo(() => {
    if (visitantesPeriodo.length === 0) return 0;
    return ((conversoesPeriodo.length / visitantesPeriodo.length) * 100).toFixed(1);
  }, [visitantesPeriodo, conversoesPeriodo]);

  const porEtapa = useMemo(() =>
    ETAPAS.map(e => ({ ...e, value: pessoas.filter(p => p.etapa_cia === e.key).length })),
    [pessoas]);

  const semAcompanhamento = useMemo(() =>
    pessoas.filter(p => !["integrado"].includes(p.etapa_cia) && diasSemContato(p) >= 14),
    [pessoas]);

  const naoConsolidados = useMemo(() =>
    pessoas.filter(p => ["visitante", "primeiro_contato", "novo_convertido"].includes(p.etapa_cia)),
    [pessoas]);

  // Visitantes por mês (últimos 6 meses)
  const visitantesMensais = useMemo(() => {
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const visitantes = pessoas.filter(p => p.data_visita?.startsWith(key)).length;
      const conversoes = pessoas.filter(p => p.data_conversao?.startsWith(key)).length;
      meses.push({ label, visitantes, conversoes });
    }
    return meses;
  }, [pessoas]);

  const exportarCSV = () => {
    const linhas = [
      ["Nome", "Telefone", "Etapa", "Data Visita", "Data Conversão", "Responsável", "Dias sem Contato"],
      ...pessoas.map(p => [p.nome, p.telefone || "", ETAPAS.find(e => e.key === p.etapa_cia)?.label || p.etapa_cia, formatData(p.data_visita), formatData(p.data_conversao), p.responsavel || "", diasSemContato(p)]),
    ];
    const csv = linhas.map(l => l.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio_cia.csv`;
    a.click();
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório CIA — Consolidação, Integração e Acolhimento", 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${formatData(dataInicial)} a ${formatData(dataFinal)}`, 14, 28);
    doc.text(`Visitantes: ${visitantesPeriodo.length} | Conversões: ${conversoesPeriodo.length} | Taxa: ${taxaConversao}%`, 14, 36);
    let y = 50;
    doc.setFontSize(12);
    doc.text("Pessoas por Etapa:", 14, y); y += 8;
    doc.setFontSize(10);
    porEtapa.forEach(e => { doc.text(`${e.label}: ${e.value}`, 20, y); y += 6; });
    y += 6;
    doc.setFontSize(12);
    doc.text(`Sem acompanhamento (14+ dias): ${semAcompanhamento.length}`, 14, y); y += 8;
    doc.text(`Não consolidados: ${naoConsolidados.length}`, 14, y);
    doc.save("relatorio_cia.pdf");
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Relatório CIA</h1>
            <p className="text-sm text-muted-foreground">Consolidação, Integração e Acolhimento</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportarCSV}><FileSpreadsheet className="h-4 w-4" />Excel</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportarPDF}><Download className="h-4 w-4" />PDF</Button>
        </div>
      </div>

      {/* Filtro de período */}
      <div className="bg-card border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Data Inicial</label>
          <Input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Data Final</label>
          <Input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} className="w-44" />
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Visitantes no período", value: visitantesPeriodo.length, color: "text-blue-600" },
          { icon: Heart, label: "Conversões no período", value: conversoesPeriodo.length, color: "text-green-600" },
          { icon: TrendingUp, label: "Taxa de Conversão", value: `${taxaConversao}%`, color: "text-primary" },
          { icon: AlertTriangle, label: "Sem acompanhamento", value: semAcompanhamento.length, color: "text-yellow-600" },
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Funil CIA */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Funil CIA — Total</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porEtapa} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {porEtapa.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Visitantes x Conversões por mês */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Visitantes x Conversões (6 meses)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={visitantesMensais} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="visitantes" name="Visitantes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="conversoes" name="Conversões" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sem acompanhamento */}
      {semAcompanhamento.length > 0 && (
        <div className="bg-card border border-yellow-200 rounded-xl p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-yellow-700">
            <Clock className="h-4 w-4" />
            Sem acompanhamento há 14+ dias ({semAcompanhamento.length})
          </h2>
          <div className="space-y-2">
            {semAcompanhamento.slice(0, 8).map(p => {
              const etapa = ETAPAS.find(e => e.key === p.etapa_cia);
              return (
                <div key={p.id} className="flex items-center justify-between text-sm p-3 rounded-lg border bg-background">
                  <div>
                    <p className="font-medium">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.extensao_nome} · {p.responsavel || "Sem responsável"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{diasSemContato(p)}d sem contato</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: etapa?.color + "20", color: etapa?.color }}>{etapa?.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Não consolidados */}
      <div className="bg-card border rounded-xl p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Não consolidados ({naoConsolidados.length})
        </h2>
        {naoConsolidados.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">🎉 Todos estão consolidados!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-semibold text-muted-foreground">Nome</th>
                  <th className="pb-2 font-semibold text-muted-foreground">Etapa</th>
                  <th className="pb-2 font-semibold text-muted-foreground">Responsável</th>
                  <th className="pb-2 font-semibold text-muted-foreground">Último Contato</th>
                  <th className="pb-2 font-semibold text-muted-foreground">Unidade</th>
                </tr>
              </thead>
              <tbody>
                {naoConsolidados.map(p => {
                  const etapa = ETAPAS.find(e => e.key === p.etapa_cia);
                  return (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{p.nome}</td>
                      <td className="py-2"><span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: (etapa?.color || "#ccc") + "20", color: etapa?.color }}>{etapa?.label}</span></td>
                      <td className="py-2 text-muted-foreground">{p.responsavel || "—"}</td>
                      <td className="py-2 text-muted-foreground">{formatData(p.data_ultimo_contato)}</td>
                      <td className="py-2 text-muted-foreground">{p.extensao_nome}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}