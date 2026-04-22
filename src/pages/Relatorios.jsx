import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, Search, Eye, Edit, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import RelatorioDetail from "../components/RelatorioDetail";

const TIPO_LABELS = {
  domingo_manha: "Dom. Manhã",
  domingo_noite: "Dom. Noite",
  quinta: "Quinta",
  especial: "Especial",
  outro: "Outro",
};

export default function Relatorios() {
  const [relatorios, setRelatorios] = useState([]);
  const [extensoes, setExtensoes] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterExt, setFilterExt] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [searchPregador, setSearchPregador] = useState("");
  const [viewItem, setViewItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [u, ext, rel] = await Promise.all([
      base44.auth.me(),
      base44.entities.Extensao.list(),
      base44.entities.Relatorio.list("-data_culto", 500),
    ]);
    setUser(u);
    setExtensoes(ext);
    setRelatorios(rel);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let items = relatorios;
    if (user?.role === "lider" && user?.extensao_id) {
      items = items.filter(r => r.extensao_id === user.extensao_id);
    }
    if (filterExt !== "all") items = items.filter(r => r.extensao_id === filterExt);
    if (filterTipo !== "all") items = items.filter(r => r.tipo_reuniao === filterTipo);
    if (searchPregador) items = items.filter(r => r.pregador?.toLowerCase().includes(searchPregador.toLowerCase()));
    return items;
  }, [relatorios, filterExt, filterTipo, searchPregador, user]);

  async function handleDelete() {
    if (!deleteTarget) return;
    await base44.entities.Relatorio.delete(deleteTarget.id);
    setDeleteTarget(null);
    loadData();
  }

  const canDelete = user?.role === "admin";
  const canEdit = (r) => {
    if (user?.role === "admin") return true;
    const daysSince = (new Date() - new Date(r.created_date)) / (1000 * 60 * 60 * 24);
    return daysSince <= 7 && r.created_by === user?.email;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} relatórios encontrados</p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/relatorio/novo">
            <Plus className="h-4 w-4" />
            Novo Relatório
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterExt} onValueChange={setFilterExt}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Extensão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas extensões</SelectItem>
            {extensoes.filter(e => e.status !== "inativa").map(ext => (
              <SelectItem key={ext.id} value={ext.id}>{ext.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="domingo_manha">Domingo Manhã</SelectItem>
            <SelectItem value="domingo_noite">Domingo Noite</SelectItem>
            <SelectItem value="quinta">Quinta-feira</SelectItem>
            <SelectItem value="especial">Especial</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pregador..."
            className="pl-9"
            value={searchPregador}
            onChange={e => setSearchPregador(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-left px-4 py-3 font-medium">Extensão</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Tipo</th>
                <th className="text-right px-4 py-3 font-medium">Adultos</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Crianças</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Visit.</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Conv.</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(r.data_culto).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">{r.extensao_nome}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs bg-secondary px-2 py-1 rounded-full">{TIPO_LABELS[r.tipo_reuniao] || r.tipo_reuniao}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{r.adultos}</td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">{r.criancas}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">{r.visitantes}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">{r.conversoes}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit(r) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link to={`/relatorio/editar/${r.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(r)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    Nenhum relatório encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Relatório</DialogTitle>
            <DialogDescription>Informações completas do culto.</DialogDescription>
          </DialogHeader>
          {viewItem && <RelatorioDetail relatorio={viewItem} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}