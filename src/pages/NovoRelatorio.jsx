import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle } from "lucide-react";

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function NovoRelatorio() {
  const navigate = useNavigate();
  const [extensoes, setExtensoes] = useState([]);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [duplicateError, setDuplicateError] = useState(false);

  const [form, setForm] = useState({
    extensao_id: "",
    data_culto: "",
    tipo_reuniao: "",
    turno: "",
    adultos: "",
    criancas: "",
    visitantes: "",
    conversoes: "",
    pregador: "",
    santa_ceia: false,
    houve_apelo: false,
    visita_pastoral: false,
    observacoes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [u, ext] = await Promise.all([
      base44.auth.me(),
      base44.entities.Extensao.list(),
    ]);
    setUser(u);
    const active = ext.filter(e => e.status !== "inativa");
    setExtensoes(active);

    if (u.role === "lider" && u.extensao_id) {
      setForm(prev => ({ ...prev, extensao_id: u.extensao_id }));
    }
  }

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function updateDate(value) {
    const date = new Date(value + "T12:00:00");
    const dia = DIAS_SEMANA[date.getDay()];
    setForm(prev => ({ ...prev, data_culto: value, dia_semana: dia }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setDuplicateError(false);

    const today = new Date().toISOString().split("T")[0];
    if (form.data_culto > today) {
      alert("A data do culto não pode ser futura.");
      return;
    }

    // Validação de duplicidade
    setSaving(true);
    const existentes = await base44.entities.Relatorio.filter({
      extensao_id: form.extensao_id,
      data_culto: form.data_culto,
      tipo_reuniao: form.tipo_reuniao,
      turno: form.turno,
    });
    if (existentes.length > 0) {
      setDuplicateError(true);
      setSaving(false);
      return;
    }

    const ext = extensoes.find(e => e.id === form.extensao_id);
    await base44.entities.Relatorio.create({
      ...form,
      extensao_nome: ext?.nome || "",
      adultos: parseInt(form.adultos) || 0,
      criancas: parseInt(form.criancas) || 0,
      visitantes: parseInt(form.visitantes) || 0,
      conversoes: parseInt(form.conversoes) || 0,
    });
    setSaving(false);
    setSuccess(true);
    setTimeout(() => navigate("/relatorios"), 1500);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <p className="text-lg font-semibold">Relatório salvo com sucesso!</p>
      </div>
    );
  }

  const isLider = user?.role === "lider";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Novo Relatório de Culto</h1>
        <p className="text-muted-foreground text-sm mt-1">Registre os dados do culto</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Extensão *</Label>
            <Select
              value={form.extensao_id}
              onValueChange={v => update("extensao_id", v)}
              disabled={isLider}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {extensoes.map(ext => (
                  <SelectItem key={ext.id} value={ext.id}>{ext.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data do Culto *</Label>
            <Input type="date" value={form.data_culto} onChange={e => updateDate(e.target.value)} required max={new Date().toISOString().split("T")[0]} />
            {form.dia_semana && (
              <p className="text-xs text-muted-foreground mt-1">{form.dia_semana}</p>
            )}
          </div>
          <div>
            <Label>Tipo de Reunião *</Label>
            <Select value={form.tipo_reuniao} onValueChange={v => update("tipo_reuniao", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="domingo_manha">Domingo Manhã</SelectItem>
                <SelectItem value="domingo_noite">Domingo Noite</SelectItem>
                <SelectItem value="quinta">Quinta-feira</SelectItem>
                <SelectItem value="especial">Especial</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Turno *</Label>
            <Select value={form.turno} onValueChange={v => update("turno", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manha">Manhã</SelectItem>
                <SelectItem value="noite">Noite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <Label>Adultos *</Label>
            <Input type="number" min="0" value={form.adultos} onChange={e => update("adultos", e.target.value)} required placeholder="0" />
          </div>
          <div>
            <Label>Crianças *</Label>
            <Input type="number" min="0" value={form.criancas} onChange={e => update("criancas", e.target.value)} required placeholder="0" />
          </div>
          <div>
            <Label>Visitantes *</Label>
            <Input type="number" min="0" value={form.visitantes} onChange={e => update("visitantes", e.target.value)} required placeholder="0" />
          </div>
          <div>
            <Label>Conversões *</Label>
            <Input type="number" min="0" value={form.conversoes} onChange={e => update("conversoes", e.target.value)} required placeholder="0" />
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Campos opcionais</p>
          <div>
            <Label>Pregador</Label>
            <Input value={form.pregador} onChange={e => update("pregador", e.target.value)} placeholder="Nome do pregador" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between bg-muted rounded-lg px-4 py-3">
              <Label className="text-sm">Santa Ceia</Label>
              <Switch checked={form.santa_ceia} onCheckedChange={v => update("santa_ceia", v)} />
            </div>
            <div className="flex items-center justify-between bg-muted rounded-lg px-4 py-3">
              <Label className="text-sm">Houve Apelo</Label>
              <Switch checked={form.houve_apelo} onCheckedChange={v => update("houve_apelo", v)} />
            </div>
            <div className="flex items-center justify-between bg-muted rounded-lg px-4 py-3">
              <Label className="text-sm">Visita Pastoral</Label>
              <Switch checked={form.visita_pastoral} onCheckedChange={v => update("visita_pastoral", v)} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={e => update("observacoes", e.target.value)} rows={3} placeholder="Anotações sobre o culto..." />
          </div>
        </div>

        {duplicateError && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 text-sm">
            ⚠️ Já existe um lançamento para este culto (mesma extensão, data, tipo e turno). Verifique antes de continuar.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate("/relatorios")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !form.extensao_id || !form.data_culto || !form.tipo_reuniao || !form.turno}>
            {saving ? "Salvando..." : "Salvar Relatório"}
          </Button>
        </div>
      </form>
    </div>
  );
}