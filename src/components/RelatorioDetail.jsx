import { CheckCircle, XCircle } from "lucide-react";

const TIPO_LABELS = {
  domingo_manha: "Domingo Manhã",
  domingo_noite: "Domingo Noite",
  quinta: "Quinta-feira",
  especial: "Especial",
  outro: "Outro",
};

const TURNO_LABELS = { manha: "Manhã", noite: "Noite" };

function BoolItem({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      {value ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="text-sm">{label}</span>
    </div>
  );
}

export default function RelatorioDetail({ relatorio: r }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Extensão</p>
          <p className="font-medium">{r.extensao_nome}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Data</p>
          <p className="font-medium">{new Date(r.data_culto).toLocaleDateString("pt-BR")}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Tipo</p>
          <p className="font-medium">{TIPO_LABELS[r.tipo_reuniao] || r.tipo_reuniao}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Turno</p>
          <p className="font-medium">{TURNO_LABELS[r.turno] || r.turno}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Adultos", value: r.adultos },
          { label: "Crianças", value: r.criancas },
          { label: "Visitantes", value: r.visitantes },
          { label: "Conversões", value: r.conversoes },
        ].map(item => (
          <div key={item.label} className="bg-muted rounded-lg p-3 text-center">
            <p className="text-lg font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      {r.pregador && (
        <div className="text-sm">
          <p className="text-muted-foreground">Pregador</p>
          <p className="font-medium">{r.pregador}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <BoolItem label="Santa Ceia" value={r.santa_ceia} />
        <BoolItem label="Houve Apelo" value={r.houve_apelo} />
        <BoolItem label="Visita Pastoral" value={r.visita_pastoral} />
      </div>

      {r.observacoes && (
        <div className="text-sm">
          <p className="text-muted-foreground">Observações</p>
          <p className="mt-1 bg-muted rounded-lg p-3">{r.observacoes}</p>
        </div>
      )}
    </div>
  );
}