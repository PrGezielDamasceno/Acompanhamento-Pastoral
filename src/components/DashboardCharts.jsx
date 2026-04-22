import { useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const TIPO_LABELS = {
  domingo_manha: "Dom. Manhã",
  domingo_noite: "Dom. Noite",
  quinta: "Quinta",
  especial: "Especial",
  outro: "Outro",
};

export default function DashboardCharts({ relatorios, extensoes }) {
  const frequenciaPorMes = useMemo(() => {
    const map = {};
    relatorios.forEach(r => {
      const month = r.data_culto?.slice(0, 7);
      if (!month) return;
      if (!map[month]) map[month] = { mes: month, adultos: 0, criancas: 0, visitantes: 0, conversoes: 0 };
      map[month].adultos += r.adultos || 0;
      map[month].criancas += r.criancas || 0;
      map[month].visitantes += r.visitantes || 0;
      map[month].conversoes += r.conversoes || 0;
    });
    return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [relatorios]);

  const frequenciaPorExtensao = useMemo(() => {
    const map = {};
    relatorios.forEach(r => {
      const nome = r.extensao_nome || "Sem nome";
      if (!map[nome]) map[nome] = { nome, adultos: 0, cultos: 0 };
      map[nome].adultos += r.adultos || 0;
      map[nome].cultos += 1;
    });
    return Object.values(map).map(e => ({
      ...e,
      media: e.cultos > 0 ? Math.round(e.adultos / e.cultos) : 0
    })).sort((a, b) => b.media - a.media);
  }, [relatorios]);

  const formatMonth = (m) => {
    if (!m) return "";
    const [y, mo] = m.split("-");
    const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${months[parseInt(mo) - 1]}/${y.slice(2)}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-xl border p-5">
        <h3 className="text-sm font-semibold mb-4">Frequência Mensal (Adultos)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={frequenciaPorMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tickFormatter={formatMonth} fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip labelFormatter={formatMonth} />
            <Line type="monotone" dataKey="adultos" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} name="Adultos" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h3 className="text-sm font-semibold mb-4">Visitantes por Mês</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={frequenciaPorMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tickFormatter={formatMonth} fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip labelFormatter={formatMonth} />
            <Bar dataKey="visitantes" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Visitantes" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h3 className="text-sm font-semibold mb-4">Conversões por Mês</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={frequenciaPorMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tickFormatter={formatMonth} fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip labelFormatter={formatMonth} />
            <Bar dataKey="conversoes" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Conversões" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h3 className="text-sm font-semibold mb-4">Média de Adultos por Extensão</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={frequenciaPorExtensao} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" fontSize={12} />
            <YAxis dataKey="nome" type="category" fontSize={11} width={100} />
            <Tooltip />
            <Bar dataKey="media" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} name="Média Adultos" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}