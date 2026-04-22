import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ExtensaoForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    nome: initial?.nome || "",
    cidade: initial?.cidade || "",
    responsavel: initial?.responsavel || "",
    telefone: initial?.telefone || "",
    data_inicio: initial?.data_inicio || "",
    status: initial?.status || "ativa",
    observacoes: initial?.observacoes || "",
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Nome *</Label>
          <Input value={form.nome} onChange={e => update("nome", e.target.value)} required />
        </div>
        <div>
          <Label>Cidade *</Label>
          <Input value={form.cidade} onChange={e => update("cidade", e.target.value)} required />
        </div>
        <div>
          <Label>Responsável</Label>
          <Input value={form.responsavel} onChange={e => update("responsavel", e.target.value)} />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={form.telefone} onChange={e => update("telefone", e.target.value)} />
        </div>
        <div>
          <Label>Data de Início</Label>
          <Input type="date" value={form.data_inicio} onChange={e => update("data_inicio", e.target.value)} />
        </div>
        <div>
          <Label>Status *</Label>
          <Select value={form.status} onValueChange={v => update("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="implantacao">Implantação</SelectItem>
              <SelectItem value="pausada">Pausada</SelectItem>
              <SelectItem value="inativa">Inativa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Observações</Label>
        <Textarea value={form.observacoes} onChange={e => update("observacoes", e.target.value)} rows={3} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}