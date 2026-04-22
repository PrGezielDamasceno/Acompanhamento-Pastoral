import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Download, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function Configuracoes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setLoading(false); });
  }, []);

  async function handleBackup() {
    setBackupLoading(true);
    const [extensoes, relatorios, observacoes, users] = await Promise.all([
      base44.entities.Extensao.list(),
      base44.entities.Relatorio.list("-data_culto", 5000),
      base44.entities.ObservacaoPastoral.list("-data", 5000),
      base44.entities.User.list(),
    ]);

    const backup = {
      generated_at: new Date().toISOString(),
      generated_by: user?.email,
      data: {
        extensoes,
        relatorios,
        observacoes_pastorais: observacoes,
        usuarios: users,
      }
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}-${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;
    a.href = url;
    a.download = `backup-supervisao-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupLoading(false);
    toast.success("Backup gerado com sucesso!");
  }

  async function handleCleanup() {
    setCleanupLoading(true);
    const [relatorios, observacoes] = await Promise.all([
      base44.entities.Relatorio.list("-data_culto", 5000),
      base44.entities.ObservacaoPastoral.list("-data", 5000),
    ]);

    for (const r of relatorios) {
      await base44.entities.Relatorio.delete(r.id);
    }
    for (const o of observacoes) {
      await base44.entities.ObservacaoPastoral.delete(o.id);
    }

    setCleanupLoading(false);
    setCleanupOpen(false);
    toast.success("Dados de teste removidos com sucesso!");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerenciamento do sistema</p>
      </div>

      <div className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          Backup de Dados
        </h2>
        <p className="text-sm text-muted-foreground">
          Gere um backup completo de todos os dados do sistema em formato JSON.
        </p>
        <Button onClick={handleBackup} disabled={backupLoading} className="gap-2">
          <Download className="h-4 w-4" />
          {backupLoading ? "Gerando backup..." : "Gerar Backup Agora"}
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-destructive/20 p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Limpeza de Dados
        </h2>
        <p className="text-sm text-muted-foreground">
          Remove todos os relatórios e observações pastorais. As extensões e usuários são preservados. 
          Recomendamos gerar um backup antes.
        </p>
        <Button variant="destructive" onClick={() => setCleanupOpen(true)} className="gap-2">
          <Trash2 className="h-4 w-4" />
          Limpar Dados de Teste
        </Button>
      </div>

      <AlertDialog open={cleanupOpen} onOpenChange={setCleanupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todos os dados?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover TODOS os relatórios e observações pastorais. As extensões e usuários serão preservados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCleanup} className="bg-destructive text-destructive-foreground" disabled={cleanupLoading}>
              {cleanupLoading ? "Removendo..." : "Confirmar Limpeza"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}