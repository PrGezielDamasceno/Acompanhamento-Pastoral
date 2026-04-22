import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Plus, Search, Phone, Calendar, ChevronRight, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const ETAPAS = [
  { key: "visitante", label: "Visitante", color: "bg-gray-100 text-gray-700", next: "primeiro_contato" },
  { key: "primeiro_contato", label: "1º Contato", color: "bg-blue-100 text-blue-700", next: "novo_convertido" },
  { key: "novo_convertido", label: "Novo Convertido", color: "bg-yellow-100 text-yellow-700", next: "em_consolidacao" },
  { key: "em_consolidacao", label: "Em Consolidação", color: "bg-orange-100 text-orange-700", next: "integrado" },
  { key: "integrado", label: "Integrado", color: "bg-green-100 text-green-700", next: null },
];

const ETAPA_MAP = Object.fromEntries(ETAPAS.map(e => [e.key, e]));

function diasSemContato(pessoa) {
  const ref = pessoa.data_ultimo_contato || pessoa.data_visita;
  if (!ref) return null;
  return Math.floor((new Date() - new Date(ref)) / (1000 * 60 * 60 * 24));
}

function formatData(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

const EMPTY = { nome: "", telefone: "", email: "", origem: "", extensao_id: "", etapa_cia: "visitante", responsavel: "", data_visita: "", observacoes: "" };

export default function Pessoas() {
  const [pessoas, setPessoas] = useState([]);
  const [extensoes, setExtensoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("todas");
  const [filtroExtensao, setFiltroExtensao] = useState("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [detalhe, setDetalhe] = useState(null);

  const hoje = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [p, e] = await Promise.all([
      base44.entities.Pessoa.list("-created_date", 500),
      base44.entities.Extensao.filter({ status: "ativa" }),
    ]);
    setPessoas(p);
    setExtensoes(e);
    setLoading(false);
  }

  const filtradas = useMemo(() => {
    return pessoas.filter(p => {
      if (busca && !p.nome?.toLowerCase().includes(busca.toLowerCase()) && !p.telefone?.includes(busca)) return false;
      if (filtroEtapa !== "todas" && p.etapa_cia !== filtroEtapa) return false;
      if (filtroExtensao !== "todas" && p.extensao_id !== filtroExtensao) return false;
      return true;
    });
  }, [pessoas, busca, filtroEtapa, filtroExtensao]);

  const semContato = useMemo(() =>
    pessoas.filter(p => !["integrado"].includes(p.etapa_cia) && (diasSemContato(p) || 0) >= 7),
    [pessoas]);

  function abrirNovo() {
    setEditando(null);
    setForm({ ...EMPTY, data_visita: hoje });
    setDialogOpen(true);
  }

  function abrirEditar(p) {
    setEditando(p);
    setForm({ nome: p.nome || "", telefone: p.telefone || "", email: p.email || "", origem: p.origem || "", extensao_id: p.extensao_id || "", etapa_cia: p.etapa_cia || "visitante", responsavel: p.responsavel || "", data_visita: p.data_visita || "", observacoes: p.observacoes || "" });
    setDialogOpen(true);
  }

  async function salvar() {
    setSaving(true);
    const ext = extensoes.find(e => e.id === form.extensao_id);
    const data = { ...form, extensao_nome: ext?.nome || "" };
    if (editando) {
      await base44.entities.Pessoa.update(editando.id, data);
    } else {
      await base44.entities.Pessoa.create(data);
    }
    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

  async function avancarEtapa(pessoa) {
    const etapaAtual = ETAPA_MAP[pessoa.etapa_cia];
    if (!etapaAtual?.next) return;
    const updates = { etapa_cia: etapaAtual.next, data_ultimo_contato: hoje };
    if (etapaAtual.next === "novo_convertido") updates.data_conversao = hoje;
    await base44.entities.Pessoa.update(pessoa.id, updates);
    loadData();
  }

  async function registrarContato(pessoa) {
    await base44.entities.Pessoa.update(pessoa.id, { data_ultimo_contato: hoje });
    loadData();
  }

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
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Pessoas</h1>
            <p className="text-sm text-muted-foreground">Fluxo CIA — {pessoas.length} pessoas cadastradas</p>
          </div>
        </div>
        <Button className="gap-2" onClick={abrirNovo}><Plus className="h-4 w-4" /> Nova Pessoa</Button>
      </div>

      {/* Alerta sem contato */}
      {semContato.length > 0 && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-yellow-800 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span><strong>{semContato.length} pessoa(s)</strong> sem contato há 7+ dias</span>
        </div>
      )}

      {/* Funil CIA */}
      <div className="grid grid-cols-5 gap-2">
        {ETAPAS.map(e => {
          const count = pessoas.filter(p => p.etapa_cia === e.key).length;
          return (
            <div key={e.key} className="bg-card border rounded-xl p-3 text-center cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFiltroEtapa(filtroEtapa === e.key ? "todas" : e.key)}>
              <p className={`text-xs font-medium px-2 py-1 rounded-full inline-block mb-2 ${e.color}`}>{e.label}</p>
              <p className="text-2xl font-bold text-foreground">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar nome ou telefone..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={filtroEtapa} onValueChange={setFiltroEtapa}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Etapa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as etapas</SelectItem>
            {ETAPAS.map(e => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroExtensao} onValueChange={setFiltroExtensao}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Extensão" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {extensoes.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtradas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">Nenhuma pessoa encontrada.</div>
        ) : filtradas.map(p => {
          const etapa = ETAPA_MAP[p.etapa_cia];
          const dias = diasSemContato(p);
          const alerta = dias !== null && dias >= 7 && p.etapa_cia !== "integrado";
          return (
            <div key={p.id} className={`bg-card border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow ${alerta ? "border-yellow-300" : ""}`}>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">{p.nome?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{p.nome}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${etapa?.color}`}>{etapa?.label}</span>
                  {alerta && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{dias}d sem contato</span>}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                  {p.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.telefone}</span>}
                  {p.extensao_nome && <span>{p.extensao_nome}</span>}
                  {p.responsavel && <span>Resp: {p.responsavel}</span>}
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Visita: {formatData(p.data_visita)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => registrarContato(p)}>Contato</Button>
                {etapa?.next && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => avancarEtapa(p)}>
                    <ArrowRight className="h-3 w-3" />
                    {ETAPA_MAP[etapa.next]?.label}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => abrirEditar(p)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Pessoa" : "Nova Pessoa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Telefone</label>
                <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Data da Visita</label>
                <Input type="date" value={form.data_visita} onChange={e => setForm(f => ({ ...f, data_visita: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Extensão *</label>
                <Select value={form.extensao_id} onValueChange={v => setForm(f => ({ ...f, extensao_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{extensoes.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Etapa CIA</label>
                <Select value={form.etapa_cia} onValueChange={v => setForm(f => ({ ...f, etapa_cia: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ETAPAS.map(e => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Responsável pelo Acompanhamento</label>
                <Input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do pastor/obreiro" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Como chegou / Origem</label>
                <Input value={form.origem} onChange={e => setForm(f => ({ ...f, origem: e.target.value }))} placeholder="Ex: convite, redes sociais, culto..." />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Observações</label>
                <Input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Notas gerais" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving || !form.nome || !form.extensao_id}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}