import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Printer, AlertTriangle, TrendingUp, TrendingDown, Minus, Info, ChevronDown, ChevronUp, FileDown } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

function pad(n) { return String(n).padStart(2, "0"); }

function formatMonth(m) {
  if (!m) return "";
  const [y, mo] = m.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[parseInt(mo) - 1]}/${y.slice(2)}`;
}

function nomeMesAno(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function calcVariacao(atual, baseline) {
  if (baseline == null || baseline === 0) return null;
  return Math.round(((atual - baseline) / baseline) * 100);
}

function classificarVariacao(pct) {
  if (pct === null) return { label: "Sem histórico", cor: "text-gray-400", bg: "bg-gray-50", icon: Minus };
  if (pct > 20) return { label: "Acima da média", cor: "text-green-700", bg: "bg-green-50", icon: TrendingUp };
  if (pct >= -10) return { label: "Estável", cor: "text-blue-600", bg: "bg-blue-50", icon: Minus };
  if (pct >= -20) return { label: "Abaixo da média", cor: "text-orange-600", bg: "bg-orange-50", icon: TrendingDown };
  return { label: "Muito abaixo", cor: "text-red-700", bg: "bg-red-50", icon: TrendingDown };
}

const TIPO_LABEL = {
  domingo_manha: "Domingo Manhã",
  domingo_noite: "Domingo Noite",
  domingo: "Domingo (todos)",
  quinta: "Quinta-feira",
  especial: "Especial",
  outro: "Outro",
};

function matchTipo(r, selectedTipo) {
  if (selectedTipo === "todos") return true;
  if (selectedTipo === "domingo_noite") {
    return (r.tipo_reuniao === "domingo_noite") ||
           (r.tipo_reuniao === "domingo" && r.turno === "noite");
  }
  if (selectedTipo === "domingo_manha") {
    return (r.tipo_reuniao === "domingo_manha") ||
           (r.tipo_reuniao === "domingo" && r.turno === "manha");
  }
  if (selectedTipo === "domingo") {
    return r.tipo_reuniao === "domingo" || r.tipo_reuniao === "domingo_noite" || r.tipo_reuniao === "domingo_manha";
  }
  return r.tipo_reuniao === selectedTipo;
}

const BASELINE_OPTIONS = [
  { value: "1", label: "Último mês" },
  { value: "3", label: "Média últimos 3 meses" },
  { value: "6", label: "Média últimos 6 meses" },
  { value: "12", label: "Média últimos 12 meses" },
];

export default function PainelSupervisao() {
  const [relatorios, setRelatorios] = useState([]);
  const [extensoes, setExtensoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}`);
  const [selectedExtensao, setSelectedExtensao] = useState("todas");
  const [selectedTipo, setSelectedTipo] = useState("todos");
  const [baselinePeriod, setBaselinePeriod] = useState("6");
  const [showBaselineDetail, setShowBaselineDetail] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Relatorio.list("-data_culto", 3000),
      base44.entities.Extensao.list(),
    ]).then(([rel, ext]) => {
      setRelatorios(rel);
      setExtensoes(ext.filter(e => e.status !== "inativa"));
      setLoading(false);
    });
  }, []);

  const monthOptions = useMemo(() => {
    const opts = [];
    const d = new Date();
    for (let i = 0; i < 24; i++) {
      const y = d.getFullYear();
      const m = pad(d.getMonth() + 1);
      opts.push({ value: `${y}-${m}`, label: nomeMesAno(`${y}-${m}`) });
      d.setMonth(d.getMonth() - 1);
    }
    return opts;
  }, []);

  const sum = (arr, key) => arr.reduce((s, r) => s + (r[key] || 0), 0);

  function getMonthData(ym) {
    return relatorios.filter(r => {
      if (!r.data_culto?.startsWith(ym)) return false;
      if (selectedExtensao !== "todas" && r.extensao_id !== selectedExtensao) return false;
      if (!matchTipo(r, selectedTipo)) return false;
      return true;
    });
  }

  // Current period
  const current = useMemo(() => getMonthData(selectedMonth), [relatorios, selectedMonth, selectedExtensao, selectedTipo]);

  const totCurrent = useMemo(() => {
    const cultos = current.length;
    const avgPC = (key) => cultos > 0 ? Math.round(sum(current, key) / cultos) : 0;
    return {
      cultos,
      adultos: sum(current, "adultos"),
      criancas: sum(current, "criancas"),
      visitantes: sum(current, "visitantes"),
      conversoes: sum(current, "conversoes"),
      adultosPorCulto: avgPC("adultos"),
      criancasPorCulto: avgPC("criancas"),
      visitantesPorCulto: avgPC("visitantes"),
      conversoesPorCulto: avgPC("conversoes"),
    };
  }, [current]);

  // Baseline calculation — média aritmética simples: soma / N (meses sem dados = 0)
  const baseline = useMemo(() => {
    const n = parseInt(baselinePeriod);
    const [y, m] = selectedMonth.split("-").map(Number);
    const monthsData = [];

    for (let i = 1; i <= n; i++) {
      const d = new Date(y, m - 1 - i, 1);
      const ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const data = relatorios.filter(r => {
        if (!r.data_culto?.startsWith(ym)) return false;
        if (selectedExtensao !== "todas" && r.extensao_id !== selectedExtensao) return false;
        if (!matchTipo(r, selectedTipo)) return false;
        return true;
      });
      monthsData.push({
        ym,
        hasData: data.length > 0,
        cultos: data.length,
        adultos: sum(data, "adultos"),
        criancas: sum(data, "criancas"),
        visitantes: sum(data, "visitantes"),
        conversoes: sum(data, "conversoes"),
      });
    }

    const validCount = monthsData.filter(d => d.hasData).length;
    if (validCount < 3) return { valid: validCount, data: null, perCulto: null, months: monthsData };

    // Média mensal (para gráficos e número de cultos)
    const avg = (key) => Math.round(monthsData.reduce((s, d) => s + d[key], 0) / n);

    // Média por culto: soma total ÷ total de cultos no período
    const totalCultos = monthsData.reduce((s, d) => s + d.cultos, 0);
    const avgPC = (key) => totalCultos > 0
      ? Math.round(monthsData.reduce((s, d) => s + d[key], 0) / totalCultos)
      : 0;

    return {
      valid: validCount,
      months: monthsData,
      totalCultos,
      data: { // totais/médias mensais (para linhas de referência nos gráficos)
        cultos: avg("cultos"),
        adultos: avg("adultos"),
        criancas: avg("criancas"),
        visitantes: avg("visitantes"),
        conversoes: avg("conversoes"),
      },
      perCulto: { // média por culto (para indicadores)
        adultos: avgPC("adultos"),
        criancas: avgPC("criancas"),
        visitantes: avgPC("visitantes"),
        conversoes: avgPC("conversoes"),
      },
    };
  }, [relatorios, selectedMonth, selectedExtensao, selectedTipo, baselinePeriod]);

  // Trend data for charts (last 8 months for context)
  const trendData = useMemo(() => {
    const months = [];
    const d = new Date(selectedMonth + "-01");
    for (let i = 7; i >= 0; i--) {
      const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const ym = `${dd.getFullYear()}-${pad(dd.getMonth() + 1)}`;
      const filtered = relatorios.filter(r => {
        if (!r.data_culto?.startsWith(ym)) return false;
        if (selectedExtensao !== "todas" && r.extensao_id !== selectedExtensao) return false;
        if (!matchTipo(r, selectedTipo)) return false;
        return true;
      });
      months.push({
        mes: ym,
        cultos: filtered.length,
        adultos: sum(filtered, "adultos"),
        criancas: sum(filtered, "criancas"),
        visitantes: sum(filtered, "visitantes"),
        conversoes: sum(filtered, "conversoes"),
        taxa: filtered.length > 0 && sum(filtered, "visitantes") > 0
          ? Math.round((sum(filtered, "conversoes") / sum(filtered, "visitantes")) * 100) : 0,
      });
    }
    return months;
  }, [relatorios, selectedMonth, selectedExtensao, selectedTipo]);

  // Indicadores — usa média por culto para comparar de forma justa
  const indicadores = useMemo(() => {
    const b = baseline.perCulto;
    const bd = baseline.data;
    return [
      { label: "Adultos/culto", value: totCurrent.adultosPorCulto, baselineVal: b ? b.adultos : null },
      { label: "Crianças/culto", value: totCurrent.criancasPorCulto, baselineVal: b ? b.criancas : null },
      { label: "Visitantes/culto", value: totCurrent.visitantesPorCulto, baselineVal: b ? b.visitantes : null },
      { label: "Conversões/culto", value: totCurrent.conversoesPorCulto, baselineVal: b ? b.conversoes : null },
      { label: "Total Cultos", value: totCurrent.cultos, baselineVal: bd ? bd.cultos : null },
    ];
  }, [totCurrent, baseline]);

  // Alertas baseados em baseline (usa média por culto)
  const alertas = useMemo(() => {
    const items = [];
    const b = baseline.perCulto;
    const bd = baseline.data;

    if (b) {
      const checks = [
        { label: "freq. de adultos/culto", val: totCurrent.adultosPorCulto, base: b.adultos },
        { label: "visitantes/culto", val: totCurrent.visitantesPorCulto, base: b.visitantes },
        { label: "conversões/culto", val: totCurrent.conversoesPorCulto, base: b.conversoes },
        { label: "número de cultos", val: totCurrent.cultos, base: bd?.cultos },
      ];
      checks.forEach(({ label, val, base }) => {
        const pct = calcVariacao(val, base);
        if (pct === null) return;
        if (pct < -20) {
          items.push({ tipo: "critico", msg: `${label.charAt(0).toUpperCase() + label.slice(1)} ${Math.abs(pct)}% abaixo da média histórica (${BASELINE_OPTIONS.find(o=>o.value===baselinePeriod)?.label?.toLowerCase()})` });
        } else if (pct > 20) {
          items.push({ tipo: "positivo", msg: `${label.charAt(0).toUpperCase() + label.slice(1)} acima da média histórica (+${pct}%)` });
        }
      });
    } else if (baseline.valid < 3) {
      items.push({ tipo: "info", msg: `Dados históricos insuficientes para análise comparativa (${baseline.valid} mês/meses com dados, mínimo: 3)` });
    }

    // Sem relatórios recentes por extensão
    if (selectedExtensao === "todas") {
      const cutoffDate = new Date(selectedMonth + "-01");
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      const cutoffStr = `${cutoffDate.getFullYear()}-${pad(cutoffDate.getMonth() + 1)}`;
      extensoes.forEach(ext => {
        const hasRecent = relatorios.some(r => r.extensao_id === ext.id && r.data_culto >= cutoffStr + "-01");
        if (!hasRecent) items.push({ tipo: "atencao", msg: `Sem relatórios recentes: ${ext.nome}` });
      });
    }

    return items;
  }, [totCurrent, baseline, extensoes, relatorios, selectedMonth, selectedExtensao, baselinePeriod]);

  const dataGeracao = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const extensaoNome = selectedExtensao === "todas" ? "Todas as extensões" : extensoes.find(e => e.id === selectedExtensao)?.nome || selectedExtensao;
  const tipoNome = selectedTipo === "todos" ? "Todos os tipos" : (TIPO_LABEL[selectedTipo] || selectedTipo);
  const baselineLabel = BASELINE_OPTIONS.find(o => o.value === baselinePeriod)?.label || "";

  function exportToExcel() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Indicadores
    const indRows = [
      ["Indicador", "Valor Atual", `Média (${baselineLabel})`, "Variação (%)", "Situação"],
      ...indicadores.map(({ label, value, baselineVal }) => {
        const pct = calcVariacao(value, baselineVal);
        const cls = classificarVariacao(pct);
        return [label, value, baselineVal ?? "—", pct !== null ? `${pct > 0 ? "+" : ""}${pct}%` : "—", cls.label];
      }),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(indRows), "Indicadores");

    // Sheet 2: Dados brutos do período
    const cols = ["Data", "Extensão", "Tipo", "Turno", "Adultos", "Crianças", "Visitantes", "Conversões", "Pregador"];
    const rawRows = [
      cols,
      ...current.map(r => [
        r.data_culto, r.extensao_nome || r.extensao_id, r.tipo_reuniao, r.turno,
        r.adultos || 0, r.criancas || 0, r.visitantes || 0, r.conversoes || 0, r.pregador || ""
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rawRows), "Dados Brutos");

    // Sheet 3: Evolução histórica
    const histCols = ["Mês", "Cultos", "Adultos", "Crianças", "Visitantes", "Conversões", "Taxa Conv. (%)"];
    const histRows = [histCols, ...trendData.map(d => [d.mes, d.cultos, d.adultos, d.criancas, d.visitantes, d.conversoes, d.taxa])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(histRows), "Evolução Histórica");

    // Sheet 4: Baseline (se disponível)
    if (baseline.months) {
      const blCols = ["Mês", "Com Dados", "Cultos", "Adultos", "Crianças", "Visitantes", "Conversões"];
      const blRows = [blCols, ...baseline.months.map(d => [d.ym, d.hasData ? "Sim" : "Não", d.cultos, d.adultos, d.criancas, d.visitantes, d.conversoes])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(blRows), "Baseline");
    }

    XLSX.writeFile(wb, `painel-supervisao-${selectedMonth}-${extensaoNome.replace(/\s+/g, "-")}.xlsx`);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; font-size: 11pt; }
          .print-block { break-inside: avoid; page-break-inside: avoid; }
          .print-break { page-break-before: always; }
          @page { size: A4; margin: 18mm 15mm; }
        }
      `}</style>

      {/* CONTROLS */}
      <div className="no-print mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Painel Visual de Supervisão</h1>
            <p className="text-muted-foreground text-sm mt-1">Análise com baseline histórico — Mais de Cristo</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToExcel} variant="outline" className="gap-2">
              <FileDown className="h-4 w-4" />
              Exportar Excel
            </Button>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir / PDF
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedExtensao} onValueChange={setSelectedExtensao}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Todas as extensões" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as extensões</SelectItem>
              {extensoes.sort((a, b) => a.nome.localeCompare(b.nome)).map(e => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedTipo} onValueChange={setSelectedTipo}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(TIPO_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={baselinePeriod} onValueChange={setBaselinePeriod}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BASELINE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* PRINTABLE */}
      <div className="space-y-6">

        {/* CABEÇALHO */}
        <div className="print-block border-b-2 border-gray-800 pb-4 text-center">
          <p className="text-xs uppercase tracking-widest text-gray-500">Supervisão de Campo — Mais de Cristo</p>
          <h2 className="text-2xl font-bold mt-1">Painel Visual Consolidado</h2>
          <p className="text-base mt-1 capitalize text-gray-700">{nomeMesAno(selectedMonth)}</p>
          <p className="text-xs text-gray-400 mt-1">Comparação: {baselineLabel} · Gerado em: {dataGeracao}</p>
        </div>

        {/* FILTROS */}
        <div className="print-block bg-gray-50 border rounded-lg px-5 py-3">
          <p className="text-xs font-bold uppercase text-gray-500 mb-2">Filtros Aplicados</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
            <span><strong>Período:</strong> {nomeMesAno(selectedMonth)}</span>
            <span><strong>Extensão:</strong> {extensaoNome}</span>
            <span><strong>Tipo:</strong> {tipoNome}</span>
            <span><strong>Comparação:</strong> {baselineLabel}</span>
          </div>
        </div>

        {/* INDICADORES */}
        <div className="print-block">
          <h3 className="font-bold text-base border-b pb-2 mb-3">Indicadores do Período</h3>
          {baseline.valid < 3 && (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-3">
              <Info className="h-4 w-4 flex-shrink-0" />
              Dados insuficientes para análise comparativa ({baseline.valid} mês(es) com dados, mínimo: 3). Mostrando apenas valores atuais.
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {indicadores.map(({ label, value, baselineVal }) => {
              const pct = calcVariacao(value, baselineVal);
              const cls = classificarVariacao(pct);
              const Icon = cls.icon;
              return (
                <div key={label} className={`border rounded-lg p-3 text-center print-block ${cls.bg}`}>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
                  {baselineVal !== null && (
                    <p className="text-xs text-gray-400 mt-1">
                      Méd/culto: <span className="font-semibold text-gray-600">{baselineVal}</span>
                    </p>
                  )}
                  <div className={`flex items-center justify-center gap-1 mt-1 text-xs font-semibold ${cls.cor}`}>
                    <Icon className="h-3 w-3" />
                    {pct !== null ? `${pct > 0 ? "+" : ""}${pct}%` : "—"}
                  </div>
                  <p className={`text-xs mt-0.5 ${cls.cor}`}>{cls.label}</p>
                </div>
              );
            })}
          </div>

          {/* Transparência: meses utilizados no cálculo */}
          {baseline.data && baseline.months && (
            <div className="no-print mt-4">
              <button
                onClick={() => setShowBaselineDetail(v => !v)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
              >
                {showBaselineDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showBaselineDetail ? "Ocultar" : "Ver"} os {baseline.months.length} meses utilizados na média
              </button>
              {showBaselineDetail && (
                <div className="mt-2 overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left px-3 py-2 border-b border-gray-200 font-semibold">Mês</th>
                        <th className="text-right px-3 py-2 border-b border-gray-200 font-semibold">Adultos</th>
                        <th className="text-right px-3 py-2 border-b border-gray-200 font-semibold">Crianças</th>
                        <th className="text-right px-3 py-2 border-b border-gray-200 font-semibold">Visitantes</th>
                        <th className="text-right px-3 py-2 border-b border-gray-200 font-semibold">Conversões</th>
                        <th className="text-right px-3 py-2 border-b border-gray-200 font-semibold">Cultos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...baseline.months].reverse().map((row, i) => (
                        <tr key={row.ym} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${!row.hasData ? "text-gray-400 italic" : ""}`}>
                          <td className="px-3 py-1.5 border-b border-gray-100">
                            {formatMonth(row.ym)}{!row.hasData ? " (sem dados)" : ""}
                          </td>
                          <td className="px-3 py-1.5 border-b border-gray-100 text-right">{row.adultos}</td>
                          <td className="px-3 py-1.5 border-b border-gray-100 text-right">{row.criancas}</td>
                          <td className="px-3 py-1.5 border-b border-gray-100 text-right">{row.visitantes}</td>
                          <td className="px-3 py-1.5 border-b border-gray-100 text-right">{row.conversoes}</td>
                          <td className="px-3 py-1.5 border-b border-gray-100 text-right">{row.cultos}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-200 font-semibold text-gray-700">
                        <td className="px-3 py-2">Média mensal ({baseline.months.length} meses)</td>
                        <td className="px-3 py-2 text-right">{baseline.data.adultos}</td>
                        <td className="px-3 py-2 text-right">{baseline.data.criancas}</td>
                        <td className="px-3 py-2 text-right">{baseline.data.visitantes}</td>
                        <td className="px-3 py-2 text-right">{baseline.data.conversoes}</td>
                        <td className="px-3 py-2 text-right">{baseline.data.cultos}</td>
                      </tr>
                      <tr className="bg-blue-50 font-bold text-blue-800">
                        <td className="px-3 py-2">Média por culto ({baseline.totalCultos} cultos)</td>
                        <td className="px-3 py-2 text-right">{baseline.perCulto.adultos}</td>
                        <td className="px-3 py-2 text-right">{baseline.perCulto.criancas}</td>
                        <td className="px-3 py-2 text-right">{baseline.perCulto.visitantes}</td>
                        <td className="px-3 py-2 text-right">{baseline.perCulto.conversoes}</td>
                        <td className="px-3 py-2 text-right">—</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-400 px-3 py-1.5">* Meses sem dados são tratados como zero na divisão.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ALERTAS */}
        {alertas.length > 0 && (
          <div className="print-block border-2 border-orange-400 rounded-lg p-4">
            <h3 className="font-bold text-base flex items-center gap-2 mb-3 text-orange-700">
              <AlertTriangle className="h-4 w-4" />
              ALERTAS DO PERÍODO ({alertas.length})
            </h3>
            <div className="space-y-2">
              {alertas.map((a, i) => (
                <div key={i} className={`flex items-start gap-2 text-sm p-2 rounded ${
                  a.tipo === "critico" ? "bg-red-50 text-red-700 border border-red-200" :
                  a.tipo === "positivo" ? "bg-green-50 text-green-700 border border-green-200" :
                  a.tipo === "info" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                  "bg-yellow-50 text-yellow-800 border border-yellow-200"
                }`}>
                  {a.tipo === "positivo"
                    ? <TrendingUp className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    : a.tipo === "info"
                    ? <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    : <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  }
                  {a.msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GRÁFICOS */}
        <div className="print-break print-block">
          <h3 className="font-bold text-base border-b pb-2 mb-4">Evolução Histórica — Últimos 8 meses</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {[
              { key: "adultos", label: "Frequência de Adultos", color: "#1e40af", type: "line", baseKey: "adultos" },
              { key: "visitantes", label: "Visitantes", color: "#047857", type: "bar", baseKey: "visitantes" },
              { key: "conversoes", label: "Conversões", color: "#7c3aed", type: "bar", baseKey: "conversoes" },
              { key: "criancas", label: "Crianças", color: "#db2777", type: "bar", baseKey: "criancas" },
              { key: "cultos", label: "Número de Cultos", color: "#374151", type: "bar", baseKey: "cultos" },
              { key: "taxa", label: "Taxa de Conversão (% visitantes)", color: "#b45309", type: "line", unit: "%" },
            ].map(({ key, label, color, type, baseKey, unit }) => {
              const baselineValue = baseKey && baseline.data ? baseline.data[baseKey] : null;
              return (
                <div key={key} className="print-block border rounded-lg p-4">
                  <p className="text-sm font-semibold mb-1">{label}</p>
                  {baselineValue !== null && baseline.valid >= 3 && (
                    <p className="text-xs text-gray-400 mb-2">
                      Média histórica ({baselineLabel.toLowerCase()}): <span className="font-semibold text-gray-600">{baselineValue}{unit || ""}</span>
                    </p>
                  )}
                  <ResponsiveContainer width="100%" height={190}>
                    {type === "line" ? (
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="mes" tickFormatter={formatMonth} fontSize={10} />
                        <YAxis fontSize={10} unit={unit || ""} />
                        <Tooltip labelFormatter={formatMonth} formatter={(v) => [`${v}${unit || ""}`, label]} />
                        {baselineValue !== null && baseline.valid >= 3 && (
                          <ReferenceLine y={baselineValue} stroke="#9ca3af" strokeDasharray="4 2" label={{ value: "Média", position: "right", fontSize: 10, fill: "#9ca3af" }} />
                        )}
                        <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2.5} dot={{ r: 3 }} name={label} />
                      </LineChart>
                    ) : (
                      <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="mes" tickFormatter={formatMonth} fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip labelFormatter={formatMonth} />
                        {baselineValue !== null && baseline.valid >= 3 && (
                          <ReferenceLine y={baselineValue} stroke="#9ca3af" strokeDasharray="4 2" label={{ value: "Média", position: "right", fontSize: 10, fill: "#9ca3af" }} />
                        )}
                        <Bar dataKey={key} fill={color} radius={[3,3,0,0]} name={label} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="print-block border-t-2 border-gray-300 pt-3 mt-6 text-xs text-gray-400 flex justify-between">
          <span>Supervisão de Campo — Mais de Cristo</span>
          <span>Gerado em: {dataGeracao}</span>
        </div>
      </div>
    </div>
  );
}