import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Download, FileSpreadsheet, Users, TrendingUp, UserX, Activity } from "lucide-react";
import { jsPDF } from "jspdf";

const STATUS_VALIDOS = ["realizado", "concluido"];

const TIPO_LOCAL_LABELS = {
  igreja: "Igreja",
  residencia: "Residência",
  hospital: "Hospital",
  online: "Online",
  outro: "Outro",
};

function classificar(total) {
  if (total === 0) return { label: "Inativa", color: "bg-gray-100 text-gray-600" };
  if (total <= 3) return { label: "Baixa", color: "bg-yellow-100 text-yellow-700" };
  if (total <= 7) return { label: "Moderada", color: "bg-blue-100 text-blue-700" };
  return { label: "Consistente", color: "bg-green-100 text-green-700" };
}

function calcularMediaSemanal(total, dataInicial, dataFinal) {
  const inicio = new Date(dataInicial);
  const fim = new Date(dataFinal);
  const dias = Math.max(1, (fim - inicio) / (1000 * 60 * 60 * 24));
  const semanas = dias / 7;
  return (total / semanas).toFixed(1);
}

export default function RelatorioProdutividade() {
  const [atendimentos, setAtendimentos] = useState([]);
  const [extensoes, setExtensoes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const hoje = new Date().toISOString().split("T")[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const [dataInicial, setDataInicial] = useState(inicioMes);
  const [dataFinal, setDataFinal] = useState(hoje);
  const [filtroPastor, setFiltroPastor] = useState("todos");
  const [filtroExtensao, setFiltroExtensao] = useState("todos");
  const [filtroTipoLocal, setFiltroTipoLocal] = useState("todos");

  useEffect(() => {
    Promise.all([
      base44.entities.Atendimento.list("-data_atendimento", 2000),
      base44.entities.Extensao.list(),
    ]).then(([a, e]) => {
      setAtendimentos(a);
      setExtensoes(e);
      setLoading(false);
    });
  }, []);

  const pastores = useMemo(() => {
    const set = new Set(atendimentos.map(a => a.pastor).filter(Boolean));
    return Array.from(set).sort();
  }, [atendimentos]);

  const atendimentosFiltrados = useMemo(() => {
    return atendimentos.filter(a => {
      if (!STATUS_VALIDOS.includes(a.status)) return false;
      if (a.data_atendimento < dataInicial || a.data_atendimento > dataFinal) return false;
      if (filtroExtensao !== "todos" && a.extensao_id !== filtroExtensao) return false;
      if (filtroTipoLocal !== "todos" && a.tipo_local !== filtroTipoLocal) return false;
      return true;
    });
  }, [atendimentos, dataInicial, dataFinal, filtroExtensao, filtroTipoLocal]);

  const dados = useMemo(() => {
    const pastoresFiltrados = filtroPastor !== "todos" ? [filtroPastor] : pastores;

    return pastoresFiltrados.map(pastor => {
      const atend = atendimentosFiltrados.filter(a => a.pastor === pastor);
      const total = atend.length;
      const ultimo = atend.length > 0
        ? atend.sort((a, b) => b.data_atendimento.localeCompare(a.data_atendimento))[0].data_atendimento
        : null;
      const media = calcularMediaSemanal(total, dataInicial, dataFinal);
      const classi = classificar(total);
      return { pastor, total, media, ultimo, classi };
    }).sort((a, b) => b.total - a.total);
  }, [atendimentosFiltrados, pastores, filtroPastor, dataInicial, dataFinal]);

  const resumo = useMemo(() => {
    const totalGeral = dados.reduce((s, d) => s + d.total, 0);
    const ativos = dados.filter(d => d.total > 0).length;
    const semAtendimento = dados.filter(d => d.total === 0).length;
    const mediaGeral = dados.length > 0 ? (totalGeral / dados.length).toFixed(1) : 0;
    return { totalGeral, ativos, semAtendimento, mediaGeral };
  }, [dados]);

  const formatarData = (str) => {
    if (!str) return "—";
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
  };

  const exportarCSV = () => {
    const linhas = [
      ["Pastor", "Total de Atendimentos", "Média Semanal", "Último Atendimento", "Status"],
      ...dados.map(d => [d.pastor, d.total, d.media, formatarData(d.ultimo), d.classi.label]),
    ];
    const csv = linhas.map(l => l.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produtividade_pastoral_${dataInicial}_${dataFinal}.csv`;
    a.click();
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório de Produtividade Pastoral", 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${formatarData(dataInicial)} a ${formatarData(dataFinal)}`, 14, 26);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 32);

    doc.setFontSize(11);
    doc.text(`Total: ${resumo.totalGeral} | Ativos: ${resumo.ativos} | Sem atendimento: ${resumo.semAtendimento} | Média: ${resumo.mediaGeral}`, 14, 42);

    // Tabela manual
    let y = 54;
    doc.setFontSize(9);
    doc.setFillColor(230, 230, 240);
    doc.rect(14, y - 5, 182, 8, "F");
    doc.text("Pastor", 16, y);
    doc.text("Total", 100, y);
    doc.text("Média/Sem.", 120, y);
    doc.text("Último Atend.", 148, y);
    doc.text("Status", 178, y);
    y += 8;

    dados.forEach((d, i) => {
      if (y > 275) { doc.addPage(); y = 20; }
      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 252);
        doc.rect(14, y - 5, 182, 7, "F");
      }
      doc.text(d.pastor.substring(0, 35), 16, y);
      doc.text(String(d.total), 100, y);
      doc.text(d.media, 120, y);
      doc.text(formatarData(d.ultimo), 148, y);
      doc.text(d.classi.label, 178, y);
      y += 7;
    });

    doc.save(`produtividade_pastoral_${dataInicial}_${dataFinal}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Produtividade Pastoral</h1>
            <p className="text-sm text-muted-foreground">Atendimentos realizados por pastor/obreiro</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportarCSV}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportarPDF}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card border rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Data Inicial</label>
          <Input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Data Final</label>
          <Input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Pastor</label>
          <Select value={filtroPastor} onValueChange={setFiltroPastor}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {pastores.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Unidade</label>
          <Select value={filtroExtensao} onValueChange={setFiltroExtensao}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {extensoes.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Tipo de Local</label>
          <Select value={filtroTipoLocal} onValueChange={setFiltroTipoLocal}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(TIPO_LOCAL_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Activity, label: "Total de Atendimentos", value: resumo.totalGeral, color: "text-primary" },
          { icon: Users, label: "Pastores Ativos", value: resumo.ativos, color: "text-green-600" },
          { icon: UserX, label: "Sem Atendimento", value: resumo.semAtendimento, color: "text-red-500" },
          { icon: TrendingUp, label: "Média Geral / Pastor", value: resumo.mediaGeral, color: "text-blue-600" },
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

      {/* Tabela */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-foreground">#</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Pastor / Obreiro</th>
                <th className="text-center px-4 py-3 font-semibold text-foreground">Total</th>
                <th className="text-center px-4 py-3 font-semibold text-foreground">Média Semanal</th>
                <th className="text-center px-4 py-3 font-semibold text-foreground">Último Atendimento</th>
                <th className="text-center px-4 py-3 font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {dados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhum dado encontrado para o período selecionado.
                  </td>
                </tr>
              ) : dados.map((d, i) => (
                <tr key={d.pastor} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{d.pastor}</td>
                  <td className="px-4 py-3 text-center font-bold text-foreground">{d.total}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{d.media}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{formatarData(d.ultimo)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${d.classi.color}`}>
                      {d.classi.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        * Apenas atendimentos com status <strong>Realizado</strong> ou <strong>Concluído</strong> são contabilizados.
      </p>
    </div>
  );
}