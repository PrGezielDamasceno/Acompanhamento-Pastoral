import { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TIPO_LABEL = {
  domingo_manha: "Domingo Manhã",
  domingo_noite: "Domingo Noite",
  quinta: "Quinta-feira",
  especial: "Especial",
  outro: "Outro",
};

const TURNO_LABEL = {
  manha: "Manhã",
  noite: "Noite",
};

function formatDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function RelatorioMensal() {
  const [relatorios, setRelatorios] = useState([]);
  const [extensoes, setExtensoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  const [selectedExtensao, setSelectedExtensao] = useState("todas");

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}`);

  useEffect(() => {
    Promise.all([
      base44.entities.Relatorio.list("-data_culto", 2000),
      base44.entities.Extensao.list(),
    ]).then(([rel, ext]) => {
      setRelatorios(rel);
      setExtensoes(ext);
      setLoading(false);
    });
  }, []);

  const filteredRelatorios = useMemo(() => {
    return relatorios.filter(r => {
      if (!r.data_culto?.startsWith(selectedMonth)) return false;
      if (selectedExtensao !== "todas" && r.extensao_id !== selectedExtensao) return false;
      return true;
    });
  }, [relatorios, selectedMonth, selectedExtensao]);

  const extensoesPorId = useMemo(() => {
    const map = {};
    extensoes.forEach(e => { map[e.id] = e; });
    return map;
  }, [extensoes]);

  const extensoesNoMes = useMemo(() => {
    const ids = [...new Set(filteredRelatorios.map(r => r.extensao_id))];
    return ids
      .map(id => extensoesPorId[id] || { id, nome: filteredRelatorios.find(r => r.extensao_id === id)?.extensao_nome || id })
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  }, [filteredRelatorios, extensoesPorId]);

  const totalGeral = useMemo(() => ({
    cultos: filteredRelatorios.length,
    adultos: filteredRelatorios.reduce((s, r) => s + (r.adultos || 0), 0),
    criancas: filteredRelatorios.reduce((s, r) => s + (r.criancas || 0), 0),
    visitantes: filteredRelatorios.reduce((s, r) => s + (r.visitantes || 0), 0),
    conversoes: filteredRelatorios.reduce((s, r) => s + (r.conversoes || 0), 0),
  }), [filteredRelatorios]);

  const totalAno = useMemo(() => {
    const ano = selectedMonth.split("-")[0];
    const anoRels = relatorios.filter(r => {
      if (!r.data_culto?.startsWith(ano)) return false;
      if (r.data_culto > selectedMonth + "-31") return false;
      if (selectedExtensao !== "todas" && r.extensao_id !== selectedExtensao) return false;
      return true;
    });
    const cultos = anoRels.length;
    if (cultos === 0) return null;
    return {
      cultos,
      adultos: anoRels.reduce((s, r) => s + (r.adultos || 0), 0),
      criancas: anoRels.reduce((s, r) => s + (r.criancas || 0), 0),
      visitantes: anoRels.reduce((s, r) => s + (r.visitantes || 0), 0),
      conversoes: anoRels.reduce((s, r) => s + (r.conversoes || 0), 0),
    };
  }, [relatorios, selectedMonth, selectedExtensao]);

  const ultimoCulto = useMemo(() => {
    if (filteredRelatorios.length === 0) return null;
    return [...filteredRelatorios].sort((a, b) => {
      if (b.data_culto !== a.data_culto) return b.data_culto.localeCompare(a.data_culto);
      return new Date(b.created_date) - new Date(a.created_date);
    })[0];
  }, [filteredRelatorios]);

  const [ano, mes] = selectedMonth.split("-");
  const nomeMes = new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const dataGeracao = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // Generate month options (last 24 months)
  const monthOptions = useMemo(() => {
    const opts = [];
    const d = new Date();
    for (let i = 0; i < 24; i++) {
      const y = d.getFullYear();
      const m = pad(d.getMonth() + 1);
      const label = new Date(y, d.getMonth(), 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      opts.push({ value: `${y}-${m}`, label });
      d.setMonth(d.getMonth() - 1);
    }
    return opts;
  }, []);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body { overflow: visible !important; height: auto !important; }
          body > *, main, [class*="overflow"] { overflow: visible !important; height: auto !important; }
          aside, header, nav, .no-print, [class*="sidebar"] { display: none !important; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 15mm 12mm; }
        }
      `}</style>
      {/* Controls - hidden on print */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Relatório Mensal</h1>
          <p className="text-muted-foreground text-sm mt-1">Relatório consolidado de supervisão de campo</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedExtensao} onValueChange={setSelectedExtensao}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todas as extensões" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as extensões</SelectItem>
              {extensoes.sort((a,b) => a.nome.localeCompare(b.nome)).map(e => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* Printable report */}
      <div ref={printRef} className="bg-white border rounded-xl overflow-hidden print:border-0 print:rounded-none print:shadow-none">
        {/* Header */}
        <div className="bg-blue-900 text-white px-8 py-6">
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-blue-200">Supervisão de Campo — Mais de Cristo</p>
            <h2 className="text-2xl font-bold mt-1">
              {selectedExtensao === "todas" ? "Relatório Consolidado Geral" : `Relatório — ${extensoesPorId[selectedExtensao]?.nome || ""}`}
            </h2>
            <p className="text-lg mt-1 capitalize text-blue-100">{nomeMes}</p>
            <p className="text-xs mt-2 text-blue-300">Gerado em: {dataGeracao}</p>
          </div>
        </div>

        <div className="px-8 py-6 space-y-8 print:px-6 print:py-4">
          {/* Último Lançamento */}
          {ultimoCulto && (
            <section className="bg-blue-800 text-white rounded-xl px-6 py-4">
              <p className="text-xs uppercase tracking-widest text-blue-300 mb-2">Último Lançamento</p>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">
                    {TIPO_LABEL[ultimoCulto.tipo_reuniao] || ultimoCulto.tipo_reuniao} ({ultimoCulto.turno === "manha" ? "Manhã" : "Noite"}) — {formatDate(ultimoCulto.data_culto)}
                  </p>
                  <p className="text-blue-100 text-sm mt-1">
                    {ultimoCulto.adultos || 0} adultos · {ultimoCulto.criancas || 0} crianças · {ultimoCulto.visitantes || 0} visitantes · {ultimoCulto.conversoes || 0} conversões
                  </p>
                  {ultimoCulto.pregador && (
                    <p className="text-blue-200 text-xs mt-1">Pregador: {ultimoCulto.pregador}</p>
                  )}
                </div>
                <div className="flex gap-4 text-center">
                  {[
                    { label: "Ad.", val: ultimoCulto.adultos || 0 },
                    { label: "Cr.", val: ultimoCulto.criancas || 0 },
                    { label: "Vis.", val: ultimoCulto.visitantes || 0 },
                    { label: "Conv.", val: ultimoCulto.conversoes || 0 },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-2xl font-bold">{val}</p>
                      <p className="text-xs text-blue-300">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Resumo geral */}
          <section>
            <h3 className="text-lg font-bold border-b-2 border-blue-900 pb-2 mb-4 text-blue-900 print:text-black">Resumo do Período</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: "Total de Cultos", value: totalGeral.cultos, color: "text-gray-800", bg: "bg-gray-50 border-gray-300" },
                { label: "Adultos", value: totalGeral.adultos, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
                { label: "Crianças", value: totalGeral.criancas, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
                { label: "Visitantes", value: totalGeral.visitantes, color: "text-green-700", bg: "bg-green-50 border-green-200" },
                { label: "Conversões", value: totalGeral.conversoes, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`text-center border rounded-lg p-3 ${bg}`}>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Média por culto */}
          {totalGeral.cultos > 0 && (
            <section className="bg-slate-50 rounded-xl border border-slate-200 px-5 py-4">
              <h3 className="text-lg font-bold border-b border-slate-300 pb-2 mb-4 text-slate-700">Média do Mês (por Culto)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Média de Adultos", value: Math.round(totalGeral.adultos / totalGeral.cultos), color: "text-blue-700", bg: "bg-blue-100 border-blue-200" },
                  { label: "Média de Crianças", value: Math.round(totalGeral.criancas / totalGeral.cultos), color: "text-purple-700", bg: "bg-purple-100 border-purple-200" },
                  { label: "Média de Visitantes", value: Math.round(totalGeral.visitantes / totalGeral.cultos), color: "text-green-700", bg: "bg-green-100 border-green-200" },
                  { label: "Média de Conversões", value: Math.round(totalGeral.conversoes / totalGeral.cultos), color: "text-orange-600", bg: "bg-orange-100 border-orange-200" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`text-center border rounded-lg p-3 ${bg}`}>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className={`text-xs mt-1 font-medium ${color}`}>{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">* Calculado com base em {totalGeral.cultos} culto(s) registrado(s) no período.</p>
            </section>
          )}

          {/* Média do Ano (por Culto) */}
          {totalAno && (
            <section className="bg-amber-50 rounded-xl border border-amber-200 px-5 py-4">
              <h3 className="text-lg font-bold border-b border-amber-300 pb-2 mb-4 text-amber-800">Média do Ano (por Culto) — {selectedMonth.split("-")[0]}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Adultos/culto", mes: totalGeral.cultos > 0 ? Math.round(totalGeral.adultos / totalGeral.cultos) : null, ano: Math.round(totalAno.adultos / totalAno.cultos), color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
                  { label: "Crianças/culto", mes: totalGeral.cultos > 0 ? Math.round(totalGeral.criancas / totalGeral.cultos) : null, ano: Math.round(totalAno.criancas / totalAno.cultos), color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
                  { label: "Visitantes/culto", mes: totalGeral.cultos > 0 ? Math.round(totalGeral.visitantes / totalGeral.cultos) : null, ano: Math.round(totalAno.visitantes / totalAno.cultos), color: "text-green-700", bg: "bg-green-50 border-green-200" },
                  { label: "Conversões/culto", mes: totalGeral.cultos > 0 ? Math.round(totalGeral.conversoes / totalGeral.cultos) : null, ano: Math.round(totalAno.conversoes / totalAno.cultos), color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
                ].map(({ label, mes, ano, color, bg }) => {
                  const pct = mes !== null && ano > 0 ? Math.round(((mes - ano) / ano) * 100) : null;
                  return (
                    <div key={label} className={`text-center border rounded-lg p-3 ${bg}`}>
                      <p className={`text-2xl font-bold ${color}`}>{ano}</p>
                      <p className={`text-xs mt-1 font-medium ${color}`}>{label}</p>
                      {pct !== null && (
                        <p className={`text-xs mt-1 font-semibold ${pct > 0 ? "text-green-700" : pct < 0 ? "text-red-600" : "text-gray-500"}`}>
                          {pct > 0 ? `+${pct}%` : `${pct}%`} {pct > 0 ? "acima" : pct < 0 ? "abaixo" : "igual"} do ano
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-amber-600 mt-2">* Baseado em {totalAno.cultos} culto(s) de jan/{selectedMonth.split("-")[0]} até o mês selecionado.</p>
            </section>
          )}

          {filteredRelatorios.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum relatório encontrado para este período.</p>
            </div>
          ) : (
            extensoesNoMes.map(ext => {
              const cultos = filteredRelatorios
                .filter(r => r.extensao_id === ext.id)
                .sort((a, b) => b.data_culto.localeCompare(a.data_culto));

              const totExt = {
                adultos: cultos.reduce((s, r) => s + (r.adultos || 0), 0),
                criancas: cultos.reduce((s, r) => s + (r.criancas || 0), 0),
                visitantes: cultos.reduce((s, r) => s + (r.visitantes || 0), 0),
                conversoes: cultos.reduce((s, r) => s + (r.conversoes || 0), 0),
              };

              return (
                <section key={ext.id} className="print:break-inside-avoid">
                  {/* Extension header */}
                  <div className="bg-blue-900 text-white rounded-lg px-5 py-3 mb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <h4 className="text-base font-bold text-white print:text-white">{ext.nome}</h4>
                      <div className="flex items-center gap-4 text-sm text-blue-200 print:text-gray-300">
                        <span>{cultos.length} culto(s)</span>
                        <span>{totExt.adultos} adultos</span>
                        <span>{totExt.visitantes} visitantes</span>
                        <span>{totExt.conversoes} conversões</span>
                      </div>
                    </div>
                  </div>

                  {/* Cultos table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-700 text-white">
                          <th className="text-left px-3 py-2 border border-slate-600 print:border-gray-300 font-semibold">Data</th>
                          <th className="text-left px-3 py-2 border border-slate-600 print:border-gray-300 font-semibold">Tipo</th>
                          <th className="text-left px-3 py-2 border border-slate-600 print:border-gray-300 font-semibold">Turno</th>
                          <th className="text-right px-3 py-2 border border-slate-600 print:border-gray-300 font-semibold">Ad.</th>
                          <th className="text-right px-3 py-2 border border-slate-600 print:border-gray-300 font-semibold">Cr.</th>
                          <th className="text-right px-3 py-2 border border-slate-600 print:border-gray-300 font-semibold">Vis.</th>
                          <th className="text-right px-3 py-2 border border-slate-600 print:border-gray-300 font-semibold">Conv.</th>
                          <th className="text-left px-3 py-2 border border-slate-600 print:border-gray-300 font-semibold">Pregador</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cultos.map((r, i) => (
                          <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50 print:bg-gray-50"}>
                            <td className="px-3 py-2 border border-gray-200 print:border-gray-300">{formatDate(r.data_culto)}</td>
                            <td className="px-3 py-2 border border-gray-200 print:border-gray-300">{TIPO_LABEL[r.tipo_reuniao] || r.tipo_reuniao}</td>
                            <td className="px-3 py-2 border border-gray-200 print:border-gray-300">{TURNO_LABEL[r.turno] || r.turno}</td>
                            <td className="px-3 py-2 border border-gray-200 print:border-gray-300 text-right">{r.adultos || 0}</td>
                            <td className="px-3 py-2 border border-gray-200 print:border-gray-300 text-right">{r.criancas || 0}</td>
                            <td className="px-3 py-2 border border-gray-200 print:border-gray-300 text-right">{r.visitantes || 0}</td>
                            <td className="px-3 py-2 border border-gray-200 print:border-gray-300 text-right">{r.conversoes || 0}</td>
                            <td className="px-3 py-2 border border-gray-200 print:border-gray-300 text-muted-foreground">{r.pregador || "—"}</td>
                          </tr>
                        ))}
                        {/* Total row */}
                        <tr className="bg-blue-900 text-white font-semibold">
                          <td colSpan={3} className="px-3 py-2 border border-gray-200 print:border-gray-300">TOTAL</td>
                          <td className="px-3 py-2 border border-gray-200 print:border-gray-300 text-right">{totExt.adultos}</td>
                          <td className="px-3 py-2 border border-gray-200 print:border-gray-300 text-right">{totExt.criancas}</td>
                          <td className="px-3 py-2 border border-gray-200 print:border-gray-300 text-right">{totExt.visitantes}</td>
                          <td className="px-3 py-2 border border-gray-200 print:border-gray-300 text-right">{totExt.conversoes}</td>
                          <td className="px-3 py-2 border border-gray-200 print:border-gray-300"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })
          )}

          {/* Footer */}
          <div className="border-t pt-4 text-xs text-muted-foreground text-center print:text-gray-400">
            Supervisão de Campo — Mais de Cristo · Relatório gerado em {dataGeracao}
          </div>
        </div>
      </div>

    </div>
  );
}