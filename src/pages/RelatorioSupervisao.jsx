import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileBarChart, Loader2, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";

const SYSTEM_PROMPT = `Você é responsável por gerar relatórios de supervisão pastoral com base em dados de cultos.
Seu objetivo é produzir um relatório analítico, visual e comparativo, adequado para apresentação à liderança.

REGRAS DE ANÁLISE:
1. NUNCA misturar tipos de culto. Compare sempre: Quinta com quinta | Domingo manhã com domingo manhã | Domingo noite com domingo noite
2. Calcular média histórica por tipo de culto: média de adultos, visitantes, conversões, crianças
3. Comparar com o culto mais recente de cada tipo. Gerar tabela: | Indicador | Média | Atual | Status | Índice | onde Status: até 5% = dentro | 5-20% = acima/abaixo | >20% = muito acima/abaixo. Índice = percentual de variação.
4. Gerar blocos separados para: Quinta-feira | Domingo manhã | Domingo noite | Especial (se houver)
5. Panorama geral (obrigatório): | Indicador | Média Geral | Atual | Status | Índice |
6. Diagnóstico obrigatório: crescimento/estabilidade/queda | problema geral ou localizado | qual culto está impactando
7. CIA (obrigatório): Se não houver dados de consolidação, integração e acompanhamento, incluir: "A ausência de informações sobre a CIA impede avaliar retenção, consolidação e desenvolvimento espiritual."
8. Direcionamentos: ações práticas concretas

FORMATO DO RELATÓRIO:
1. Título
2. Identificação
3. Quadros por tipo de culto (use tabelas markdown)
4. Panorama geral
5. Diagnóstico
6. Observação sobre CIA
7. Direcionamentos

TOM: direto, pastoral, objetivo, sem generalizações, sem linguagem vaga.
REGRA FINAL: Nunca tirar conclusões com base em comparação incorreta entre tipos de culto. Sempre identificar se o problema é geral ou específico.`;

export default function RelatorioSupervisao() {
  const [extensoes, setExtensoes] = useState([]);
  const [extensaoId, setExtensaoId] = useState("");
  const [periodo, setPeriodo] = useState("30");
  const [relatorio, setRelatorio] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.entities.Extensao.list().then(setExtensoes).catch(() => {});
  }, []);

  const gerarRelatorio = async () => {
    if (!extensaoId) return;
    setLoading(true);
    setRelatorio("");

    const extensao = extensoes.find(e => e.id === extensaoId);
    const todos = await base44.entities.Relatorio.filter({ extensao_id: extensaoId }, "-data_culto", 200);

    if (!todos.length) {
      setRelatorio("Nenhum relatório encontrado para esta extensão.");
      setLoading(false);
      return;
    }

    // Dados para o prompt
    const dadosJson = JSON.stringify(todos.map(r => ({
      data: r.data_culto,
      dia_semana: r.dia_semana,
      tipo: r.tipo_reuniao,
      turno: r.turno,
      adultos: r.adultos,
      criancas: r.criancas,
      visitantes: r.visitantes,
      conversoes: r.conversoes,
      pregador: r.pregador,
      santa_ceia: r.santa_ceia,
      houve_apelo: r.houve_apelo,
      observacoes: r.observacoes,
    })), null, 2);

    const prompt = `${SYSTEM_PROMPT}

---
EXTENSÃO: ${extensao?.nome} — ${extensao?.cidade}
RESPONSÁVEL: ${extensao?.responsavel}
DATA DE GERAÇÃO: ${new Date().toLocaleDateString("pt-BR")}
TOTAL DE CULTOS NA BASE: ${todos.length}

DADOS DOS CULTOS (JSON):
${dadosJson}

---
Gere agora o Relatório de Supervisão Ministerial completo seguindo todas as regras acima.`;

    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: "claude_sonnet_4_6",
    });

    setRelatorio(typeof resultado === "string" ? resultado : JSON.stringify(resultado));
    setLoading(false);
  };

  const copiarRelatorio = () => {
    navigator.clipboard.writeText(relatorio);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileBarChart className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Relatório de Supervisão</h1>
          <p className="text-sm text-muted-foreground">Análise pastoral automatizada por extensão</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground">Configurar Relatório</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Extensão</label>
            <Select value={extensaoId} onValueChange={setExtensaoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma extensão..." />
              </SelectTrigger>
              <SelectContent>
                {extensoes.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nome} — {e.cidade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={gerarRelatorio}
          disabled={!extensaoId || loading}
          className="gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBarChart className="h-4 w-4" />}
          {loading ? "Gerando relatório..." : "Gerar Relatório"}
        </Button>
        {loading && (
          <p className="text-xs text-muted-foreground">
            Analisando dados e gerando relatório pastoral... Isso pode levar alguns segundos.
          </p>
        )}
      </div>

      {relatorio && (
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Relatório Gerado</h2>
            <Button variant="outline" size="sm" onClick={copiarRelatorio} className="gap-2">
              <Download className="h-4 w-4" />
              Copiar
            </Button>
          </div>
          <div className="prose prose-sm max-w-none text-foreground
            [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
            [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:border [&_th]:border-border
            [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-border
            [&_tr:nth-child(even)]:bg-muted/40
            [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-2
            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-primary
            [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1
            [&_p]:my-2 [&_ul]:my-2 [&_li]:my-1
            [&_strong]:font-semibold">
            <ReactMarkdown>{relatorio}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}