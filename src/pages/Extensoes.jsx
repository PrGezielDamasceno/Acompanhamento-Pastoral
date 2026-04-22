import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, Church, MapPin, MoreVertical, Eye, Edit, Trash2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import ExtensaoForm from "../components/ExtensaoForm";

const STATUS_BADGE = {
  ativa: "bg-green-100 text-green-700",
  implantacao: "bg-blue-100 text-blue-700",
  pausada: "bg-yellow-100 text-yellow-700",
  inativa: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL = {
  ativa: "Ativa",
  implantacao: "Implantação",
  pausada: "Pausada",
  inativa: "Inativa",
};

export default function Extensoes() {
  const [extensoes, setExtensoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteMode, setDeleteMode] = useState("inativar");
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [u, ext] = await Promise.all([
      base44.auth.me(),
      base44.entities.Extensao.list(),
    ]);
    setUser(u);
    setExtensoes(ext);
    setLoading(false);
  }

  async function handleSave(data) {
    if (editing) {
      await base44.entities.Extensao.update(editing.id, data);
    } else {
      await base44.entities.Extensao.create(data);
    }
    setDialogOpen(false);
    setEditing(null);
    loadData();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (deleteMode === "excluir") {
      setDeleteLoading(true);
      setDeleteError("");
      // Check linked data
      const relatorios = await base44.entities.Relatorio.filter({ extensao_id: deleteTarget.id });
      if (relatorios.length > 0) {
        setDeleteError(`Não é possível excluir: esta extensão possui ${relatorios.length} relatório(s) vinculado(s).`);
        setDeleteLoading(false);
        return;
      }
      await base44.entities.Extensao.delete(deleteTarget.id);
      setDeleteLoading(false);
      setDeleteTarget(null);
      setConfirmText("");
      toast.success("Extensão excluída com sucesso!");
    } else {
      await base44.entities.Extensao.update(deleteTarget.id, { status: "inativa" });
      setDeleteTarget(null);
      toast.success("Extensão inativada.");
    }
    loadData();
  }

  function handleCloseDelete() {
    setDeleteTarget(null);
    setConfirmText("");
    setDeleteError("");
  }

  const canManage = user?.role === "admin" || user?.role === "supervisor";
  const visibleExtensoes = extensoes.filter(e => e.status !== "inativa" || user?.role === "admin");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Extensões</h1>
          <p className="text-muted-foreground text-sm mt-1">{visibleExtensoes.length} extensões cadastradas</p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Extensão
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleExtensoes.map(ext => (
          <div key={ext.id} className="bg-card rounded-xl border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Church className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{ext.nome}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {ext.cidade}
                  </div>
                </div>
              </div>
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/extensao/${ext.id}`}>
                        <Eye className="h-4 w-4 mr-2" /> Ver Detalhes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setEditing(ext); setDialogOpen(true); }}>
                      <Edit className="h-4 w-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setDeleteMode("inativar"); setDeleteTarget(ext); }}>
                      <Trash2 className="h-4 w-4 mr-2" /> Inativar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => { setDeleteMode("excluir"); setDeleteTarget(ext); }}>
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_BADGE[ext.status]}`}>
                {STATUS_LABEL[ext.status]}
              </span>
              {ext.responsavel && (
                <span className="text-xs text-muted-foreground">{ext.responsavel}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Extensão" : "Nova Extensão"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados da extensão." : "Cadastre uma nova extensão."}
            </DialogDescription>
          </DialogHeader>
          <ExtensaoForm initial={editing} onSave={handleSave} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Inativar dialog */}
      <AlertDialog open={!!deleteTarget && deleteMode === "inativar"} onOpenChange={handleCloseDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar extensão?</AlertDialogTitle>
            <AlertDialogDescription>
              A extensão "{deleteTarget?.nome}" será inativada. Ela não aparecerá mais nas listas. O histórico será preservado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excluir dialog com confirmação */}
      <Dialog open={!!deleteTarget && deleteMode === "excluir"} onOpenChange={handleCloseDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir extensão
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-foreground">
                <p>Tem certeza que deseja excluir <strong>"{deleteTarget?.nome}"</strong>?</p>
                <p className="text-muted-foreground">Esta ação não pode ser desfeita.</p>
                <p className="text-muted-foreground">Extensões com dados vinculados não poderão ser excluídas.</p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">Digite <strong className="text-foreground">CONFIRMAR</strong> para prosseguir:</p>
            <Input
              placeholder="CONFIRMAR"
              value={confirmText}
              onChange={e => { setConfirmText(e.target.value); setDeleteError(""); }}
              className="font-mono"
            />
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDelete}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "CONFIRMAR" || deleteLoading}
              onClick={handleDelete}
            >
              {deleteLoading ? "Excluindo..." : "Excluir definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}