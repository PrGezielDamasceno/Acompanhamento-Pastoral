import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function ObservacaoForm({ extensoes, onSave, onCancel }) {
  const [form, setForm] = useState({
    extensao_id: "",
    data: new Date().toISOString().split("T")[0],
    nivel_atencao: "",
    observacao: "",
    encaminhamento: "",
  });
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Extensão *</Label>
        <Select value={form.extensao_id} onValueChange={v => update("extensao_id", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {extensoes.map(ext => (
              <SelectItem key={ext.id} value={ext.id}>{ext.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Data *</Label>
          <Input type="date" value={form.data} onChange={e => update("data", e.target.value)} required />
        </div>
        <div>
          <Label>Nível de Atenção *</Label>
          <Select value={form.nivel_atencao} onValueChange={v => update("nivel_atencao", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="saudavel">Saudável</SelectItem>
              <SelectItem value="ajustes">Ajustes</SelectItem>
              <SelectItem value="risco">Risco</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Observação *</Label>
        <Textarea value={form.observacao} onChange={e => update("observacao", e.target.value)} rows={4} required placeholder="Descreva a observação pastoral..." />
      </div>
      <div>
        <Label>Encaminhamento</Label>
        <Textarea value={form.encaminhamento} onChange={e => update("encaminhamento", e.target.value)} rows={2} placeholder="Ações recomendadas..." />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving || !form.extensao_id || !form.nivel_atencao}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}