import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ObservacaoForm from "../components/ObservacaoForm";

const NIVEL_BADGE = {
  saudavel: "bg-green-100 text-green-700",
  ajustes: "bg-yellow-100 text-yellow-700",
  risco: "bg-red-100 text-red-700",
};

const NIVEL_LABEL = {
  saudavel: "Saudável",
  ajustes: "Ajustes",
  risco: "Risco",
};

export default function Observacoes() {
  const [obs, setObs] = useState([]);
  const [extensoes, setExtensoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterExt, setFilterExt] = useState("all");
  const [filterNivel, setFilterNivel] = useState("all");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [ext, o] = await Promise.all([
      base44.entities.Extensao.list(),
      base44.entities.ObservacaoPastoral.list("-data", 200),
    ]);
    setExtensoes(ext.filter(e => e.status !== "inativa"));
    setObs(o);
    setLoading(false);
  }

  async function handleSave(data) {
    const ext = extensoes.find(e => e.id === data.extensao_id);
    await base44.entities.ObservacaoPastoral.create({
      ...data,
      extensao_nome: ext?.nome || "",
    });
    setDialogOpen(false);
    loadData();
  }

  const filtered = obs.filter(o => {
    if (filterExt !== "all" && o.extensao_id !== filterExt) return false;
    if (filterNivel !== "all" && o.nivel_atencao !== filterNivel) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Observações Pastorais</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhamento das extensões</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Observação
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterExt} onValueChange={setFilterExt}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Extensão" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {extensoes.map(ext => (
              <SelectItem key={ext.id} value={ext.id}>{ext.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterNivel} onValueChange={setFilterNivel}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Nível" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            <SelectItem value="saudavel">Saudável</SelectItem>
            <SelectItem value="ajustes">Ajustes</SelectItem>
            <SelectItem value="risco">Risco</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filtered.map(o => (
          <div key={o.id} className="bg-card rounded-xl border p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{o.extensao_nome}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${NIVEL_BADGE[o.nivel_atencao]}`}>
                    {NIVEL_LABEL[o.nivel_atencao]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(o.data).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
            <p className="text-sm mt-3">{o.observacao}</p>
            {o.encaminhamento && (
              <div className="mt-3 bg-muted rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground">Encaminhamento</p>
                <p className="text-sm mt-1">{o.encaminhamento}</p>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma observação encontrada.
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Observação Pastoral</DialogTitle>
            <DialogDescription>Registre uma observação sobre a extensão.</DialogDescription>
          </DialogHeader>
          <ObservacaoForm extensoes={extensoes} onSave={handleSave} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}