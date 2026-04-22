import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIPO_LABEL = {
  domingo: "Domingo",
  domingo_manha: "Domingo Manhã",
  domingo_noite: "Domingo Noite",
  quinta: "Quinta-feira",
  especial: "Especial",
  outro: "Outro",
};

const TURNO_LABEL = { manha: "Manhã", noite: "Noite" };

function matchTipo(r, tipo) {
  if (tipo === "domingo_noite") return (r.tipo_reuniao === "domingo_noite") || (r.tipo_reuniao === "domingo" && r.turno === "noite");
  if (tipo === "domingo_manha") return (r.tipo_reuniao === "domingo_manha") || (r.tipo_reuniao === "domingo" && r.turno === "manha");
  return r.tipo_reuniao === tipo;
}

function classificar(pct) {
  if (pct === null) return { label: "Sem histórico", cor: "text-gray-500", bg: "bg-gray-50 border-gray-200", icon: Minus };
  if (pct > 5) return { label: "Crescimento", cor: "text-green-700", bg: "bg-green-50 border-green-200", icon: TrendingUp };
  if (pct >= -5) return { label: "Estabilidade", cor: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Minus };
  return { label: "Queda", cor: "text-red-700", bg: "bg-red-50 border-red-200", icon: TrendingDown };
}

function pct(atual, media) {
  if (!media || media === 0) return null;
  return Math.round(((atual - media) / media) * 100);
}

function formatDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const day = days[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
  return `${d}/${m}/${y} (${day})`;
}

export default function AnaliseUltimoCulto() {
  const [relatorios, setRelatorios] = useState([]);
  const [extensoes, setExtensoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedExtensao, setSelectedExtensao] = useState("");
  const [selectedTipo, setSelectedTipo] = useState("domingo_noite");

  useEffect(() => {
    Promise.all([
      base44.entities.Relatorio.list("-data_culto", 3000),
      base44.entities.Extensao.list(),
    ]).then(([rel, ext]) => {
      const ativas = ext.filter(e => e.status !== "inativa");
      setRelatorios(rel);
      setExtensoes(ativas);
      if (ativas.length > 0) setSelectedExtensao(ativas[0].id);
      setLoading(false);
    });
  }, []);

  // All services matching extension + tipo
  const cultosFiltrados = useMemo(() => {
    if (!selectedExtensao) return [];
    return relatorios.filter(r =>
      r.extensao_id === selectedExtensao && matchTipo(r, selectedTipo)
    ).sort((a, b) => b.data_culto.localeCompare(a.data_culto));
  }, [relatorios, selectedExtensao, selectedTipo]);

  // Historical: Dec 2025 - Mar 2026
  const historico = useMemo(() => {
    return cultosFiltrados.filter(r => r.data_culto >= "2025-12-01" && r.data_culto <= "2026-03-31");
  }, [cultosFiltrados]);

  // Last service (most recent, can be in any month)
  const ultimoCulto = cultosFiltrados[0] || null;

  // Averages
  const media = useMemo(() => {
    if (historico.length === 0) return null;
    const avg = key => Math.round(historico.reduce((s, r) => s + (r[key] || 0), 0) / historico.length);
    return {
      adultos: avg("adultos"),
      criancas: avg("criancas"),
      visitantes: avg("visitantes"),
      conversoes: avg("conversoes"),
      count: historico.length,
    };
  }, [historico]);

  const indicadores = useMemo(() => {
    if (!media || !ultimoCulto) return [];
    return [
      { label: "Adultos", mediaVal: media.adultos, ultimoVal: ultimoCulto.adultos || 0 },
      { label: "Crianças", mediaVal: media.criancas, ultimoVal: ultimoCulto.criancas || 0 },
      { label: "Visitantes", mediaVal: media.visitantes, ultimoVal: ultimoCulto.visitantes || 0 },
      { label: "Conversões", mediaVal: media.conversoes, ultimoVal: ultimoCulto.conversoes || 0 },
    ];
  }, [media, ultimoCulto]);

  const situacaoGeral = useMemo(() => {
    if (!indicadores.length) return null;
    const pcts = indicadores.map(i => pct(i.ultimoVal, i.mediaVal)).filter(p => p !== null);
    if (!pcts.length) return null;
    const media_pct = pcts.reduce((s, p) => s + p, 0) / pcts.length;
    return classificar(media_pct);
  }, [indicadores]);

  const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const extensaoNome = extensoes.find(e => e.id === selectedExtensao)?.nome || "";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { size: A4; margin: 18mm 15mm; }
          aside, header, nav, [class*="sidebar"] { display: none !important; }
          .lg\\:ml-0, main { margin: 0 !important; padding: 0 !important; }
          * { overflow: visible !important; }
          ::-webkit-scrollbar { display: none !important; }
        }
      `}</style>

      {/* Controls */}
      <div className="no-print mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Análise do Último Culto</h1>
            <p className="text-muted-foreground text-sm mt-1">Comparação com média histórica (dez/25–mar/26)</p>
          </div>
          <Button onClick={() => window.print()} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir / PDF
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedExtensao} onValueChange={setSelectedExtensao}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Selecione a extensão" /></SelectTrigger>
            <SelectContent>
              {extensoes.sort((a, b) => a.nome.localeCompare(b.nome)).map(e => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedTipo} onValueChange={setSelectedTipo}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TIPO_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Printable content */}
      <div className="space-y-5">

        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 text-center">
          <p className="text-xs uppercase tracking-widest text-gray-500">Supervisão de Campo — Mais de Cristo</p>
          <h2 className="text-2xl font-bold mt-1">Análise do Último Culto</h2>
          <p className="text-sm text-gray-600 mt-1">
            {extensaoNome} · {TIPO_LABEL[selectedTipo]} · Referência: dez/25–mar/26
          </p>
          <p className="text-xs text-gray-400 mt-1">Gerado em: {now}</p>
        </div>

        {/* Sem dados */}
        {!ultimoCulto && (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            Nenhum culto encontrado para este filtro.
          </div>
        )}

        {ultimoCulto && (
          <>
            {/* Último culto info */}
            <div className="bg-gray-50 border rounded-lg px-5 py-4">
              <p className="text-xs font-bold uppercase text-gray-500 mb-2">Último Culto Registrado</p>
              <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
                <span><strong>Data:</strong> {formatDate(ultimoCulto.data_culto)}</span>
                <span><strong>Tipo:</strong> {TIPO_LABEL[ultimoCulto.tipo_reuniao] || ultimoCulto.tipo_reuniao}</span>
                <span><strong>Turno:</strong> {TURNO_LABEL[ultimoCulto.turno] || ultimoCulto.turno}</span>
                {ultimoCulto.pregador && <span><strong>Pregador:</strong> {ultimoCulto.pregador}</span>}
              </div>
            </div>

            {/* Histórico info */}
            {!media && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-5 py-3 text-sm text-yellow-800">
                Nenhum culto equivalente encontrado no período histórico (dez/25–mar/26). Não é possível calcular a média.
              </div>
            )}

            {media && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 text-sm text-blue-800">
                  Média calculada com base em <strong>{media.count} culto(s)</strong> equivalente(s) no período dez/25–mar/26
                  ({extensaoNome} · {TIPO_LABEL[selectedTipo]}).
                </div>

                {/* Indicadores */}
                <div>
                  <h3 className="font-bold text-base border-b pb-2 mb-3">Comparação por Indicador</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {indicadores.map(({ label, mediaVal, ultimoVal }) => {
                      const diff = ultimoVal - mediaVal;
                      const p = pct(ultimoVal, mediaVal);
                      const cls = classificar(p);
                      const Icon = cls.icon;
                      return (
                        <div key={label} className={`rounded-xl border p-4 ${cls.bg}`}>
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-gray-800">{label}</p>
                            <span className={`flex items-center gap-1 text-sm font-bold ${cls.cor}`}>
                              <Icon className="h-4 w-4" />
                              {cls.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-xl font-bold text-gray-700">{mediaVal}</p>
                              <p className="text-xs text-gray-500 mt-0.5">Média histórica</p>
                            </div>
                            <div>
                              <p className="text-xl font-bold text-gray-900">{ultimoVal}</p>
                              <p className="text-xs text-gray-500 mt-0.5">Último culto</p>
                            </div>
                            <div>
                              <p className={`text-xl font-bold ${diff > 0 ? "text-green-700" : diff < 0 ? "text-red-700" : "text-gray-500"}`}>
                                {diff > 0 ? "+" : ""}{diff}
                              </p>
                              <p className={`text-xs mt-0.5 font-semibold ${diff > 0 ? "text-green-700" : diff < 0 ? "text-red-700" : "text-gray-500"}`}>
                                {p !== null ? `${p > 0 ? "+" : ""}${p}%` : "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resumo final */}
                {situacaoGeral && (
                  <div className={`rounded-xl border-2 p-5 ${situacaoGeral.bg}`}>
                    <h3 className="font-bold text-base mb-3">Resumo Final</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <situacaoGeral.icon className={`h-6 w-6 ${situacaoGeral.cor}`} />
                      <div>
                        <p className={`text-lg font-bold ${situacaoGeral.cor}`}>Situação Geral: {situacaoGeral.label}</p>
                        <p className="text-sm text-gray-600">
                          Comparado com a média de {media.count} culto(s) equivalente(s) em dez/25–mar/26
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 space-y-1 border-t pt-3 mt-2">
                      {indicadores.map(({ label, mediaVal, ultimoVal }) => {
                        const diff = ultimoVal - mediaVal;
                        const p = pct(ultimoVal, mediaVal);
                        return (
                          <p key={label}>
                            <strong>{label}:</strong> {mediaVal} (média) → {ultimoVal} (último culto)
                            {p !== null && <span className={diff >= 0 ? " text-green-700" : " text-red-700"}> {diff >= 0 ? "+" : ""}{diff} ({p >= 0 ? "+" : ""}{p}%)</span>}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Histórico detalhado */}
            {media && historico.length > 0 && (
              <div>
                <h3 className="font-bold text-base border-b pb-2 mb-3">Cultos de Referência (dez/25–mar/26)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left px-3 py-2 border border-gray-200 font-semibold">Data</th>
                        <th className="text-right px-3 py-2 border border-gray-200 font-semibold">Adultos</th>
                        <th className="text-right px-3 py-2 border border-gray-200 font-semibold">Crianças</th>
                        <th className="text-right px-3 py-2 border border-gray-200 font-semibold">Visitantes</th>
                        <th className="text-right px-3 py-2 border border-gray-200 font-semibold">Conversões</th>
                        <th className="text-left px-3 py-2 border border-gray-200 font-semibold">Pregador</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historico.map((r, i) => (
                        <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-2 border border-gray-200">{formatDate(r.data_culto)}</td>
                          <td className="px-3 py-2 border border-gray-200 text-right">{r.adultos || 0}</td>
                          <td className="px-3 py-2 border border-gray-200 text-right">{r.criancas || 0}</td>
                          <td className="px-3 py-2 border border-gray-200 text-right">{r.visitantes || 0}</td>
                          <td className="px-3 py-2 border border-gray-200 text-right">{r.conversoes || 0}</td>
                          <td className="px-3 py-2 border border-gray-200 text-gray-600">{r.pregador || "—"}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-3 py-2 border border-gray-200">MÉDIA</td>
                        <td className="px-3 py-2 border border-gray-200 text-right">{media.adultos}</td>
                        <td className="px-3 py-2 border border-gray-200 text-right">{media.criancas}</td>
                        <td className="px-3 py-2 border border-gray-200 text-right">{media.visitantes}</td>
                        <td className="px-3 py-2 border border-gray-200 text-right">{media.conversoes}</td>
                        <td className="px-3 py-2 border border-gray-200"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        <div className="border-t pt-3 text-xs text-gray-400 flex justify-between">
          <span>Supervisão de Campo — Mais de Cristo</span>
          <span>Gerado em: {now}</span>
        </div>
      </div>
    </div>
  );
}