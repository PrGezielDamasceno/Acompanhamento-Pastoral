import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function EditarRelatorio() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const reportId = window.location.pathname.split("/").pop();
  const [extensoes, setExtensoes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [ext, rels] = await Promise.all([
      base44.entities.Extensao.list(),
      base44.entities.Relatorio.list("-data_culto", 500),
    ]);
    setExtensoes(ext.filter(e => e.status !== "inativa"));
    const report = rels.find(r => r.id === reportId);
    if (report) {
      setForm({
        extensao_id: report.extensao_id || "",
        data_culto: report.data_culto || "",
        tipo_reuniao: report.tipo_reuniao || "",
        turno: report.turno || "",
        adultos: String(report.adultos || 0),
        criancas: String(report.criancas || 0),
        visitantes: String(report.visitantes || 0),
        conversoes: String(report.conversoes || 0),
        pregador: report.pregador || "",
        santa_ceia: report.santa_ceia || false,
        houve_apelo: report.houve_apelo || false,
        visita_pastoral: report.visita_pastoral || false,
        observacoes: report.observacoes || "",
      });
    }
    setLoading(false);
  }

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const ext = extensoes.find(x => x.id === form.extensao_id);
    setSaving(true);
    await base44.entities.Relatorio.update(reportId, {
      ...form,
      extensao_nome: ext?.nome || "",
      adultos: parseInt(form.adultos) || 0,
      criancas: parseInt(form.criancas) || 0,
      visitantes: parseInt(form.visitantes) || 0,
      conversoes: parseInt(form.conversoes) || 0,
    });
    setSaving(false);
    navigate("/relatorios");
  }

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Editar Relatório</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-card rounded-xl border p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Extensão *</Label>
            <Select value={form.extensao_id} onValueChange={v => update("extensao_id", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {extensoes.map(ext => (
                  <SelectItem key={ext.id} value={ext.id}>{ext.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data do Culto *</Label>
            <Input type="date" value={form.data_culto} onChange={e => update("data_culto", e.target.value)} required />
          </div>
          <div>
            <Label>Tipo de Reunião *</Label>
            <Select value={form.tipo_reuniao} onValueChange={v => update("tipo_reuniao", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Input type="number" min="0" value={form.adultos} onChange={e => update("adultos", e.target.value)} required />
          </div>
          <div>
            <Label>Crianças *</Label>
            <Input type="number" min="0" value={form.criancas} onChange={e => update("criancas", e.target.value)} required />
          </div>
          <div>
            <Label>Visitantes *</Label>
            <Input type="number" min="0" value={form.visitantes} onChange={e => update("visitantes", e.target.value)} required />
          </div>
          <div>
            <Label>Conversões *</Label>
            <Input type="number" min="0" value={form.conversoes} onChange={e => update("conversoes", e.target.value)} required />
          </div>
        </div>
        <div className="border-t pt-4 space-y-4">
          <div>
            <Label>Pregador</Label>
            <Input value={form.pregador} onChange={e => update("pregador", e.target.value)} />
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
            <Textarea value={form.observacoes} onChange={e => update("observacoes", e.target.value)} rows={3} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate("/relatorios")}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </form>
    </div>
  );
}