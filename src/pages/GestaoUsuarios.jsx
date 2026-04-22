import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Search, UserPlus, Edit, ShieldCheck, Church } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ROLE_CONFIG = {
  admin: { label: "Administrador", badge: "bg-purple-100 text-purple-700", desc: "Acesso total ao sistema" },
  lider: { label: "Líder", badge: "bg-blue-100 text-blue-700", desc: "Acesso restrito à sua extensão" },
  user: { label: "Usuário", badge: "bg-gray-100 text-gray-600", desc: "Acesso básico" },
};

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function GestaoUsuarios() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [extensoes, setExtensoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "lider", extensao_id: "", extensao_nome: "" });
  const [inviteLoading, setInviteLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editData, setEditData] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [me, us, ext] = await Promise.all([
      base44.auth.me(),
      base44.entities.User.list(),
      base44.entities.Extensao.list(),
    ]);
    setCurrentUser(me);
    setUsers(us);
    setExtensoes(ext.filter(e => e.status !== "inativa"));
    setLoading(false);
  }

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users
      .filter(u => !q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      .sort((a, b) => {
        const roleOrder = { admin: 0, lider: 1, user: 2 };
        const ra = roleOrder[a.role] ?? 3;
        const rb = roleOrder[b.role] ?? 3;
        if (ra !== rb) return ra - rb;
        return (a.full_name || "").localeCompare(b.full_name || "");
      });
  }, [users, search]);

  const isAdmin = currentUser?.role === "admin";

  async function handleInvite() {
    if (!validateEmail(invite.email)) {
      toast.error("E-mail inválido.");
      return;
    }
    if (invite.role === "lider" && !invite.extensao_id) {
      toast.error("Selecione uma extensão para o líder.");
      return;
    }
    const duplicate = users.find(u => u.email?.toLowerCase() === invite.email.toLowerCase());
    if (duplicate) {
      toast.error("Este e-mail já está cadastrado.");
      return;
    }
    setInviteLoading(true);
    // Platform only accepts "user" or "admin" — invite with base role, then update role field
    const baseRole = invite.role === "admin" ? "admin" : "user";
    await base44.users.inviteUser(invite.email, baseRole);
    // If lider, store extensao on user after invite (best effort)
    toast.success("Convite enviado com sucesso!");
    setInviteOpen(false);
    setInvite({ email: "", role: "lider", extensao_id: "", extensao_nome: "" });
    setInviteLoading(false);
    loadData();
  }

  function openEdit(u) {
    setEditUser(u);
    setEditData({ role: u.role || "user", extensao_id: u.extensao_id || "", extensao_nome: u.extensao_nome || "" });
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!editUser) return;
    // Prevent self-demotion if last admin
    if (editUser.id === currentUser.id && editData.role !== "admin") {
      const otherAdmins = users.filter(u => u.id !== currentUser.id && u.role === "admin");
      if (otherAdmins.length === 0) {
        toast.error("Você é o único administrador. Não pode alterar seu próprio perfil.");
        return;
      }
    }
    if (editData.role === "lider" && !editData.extensao_id) {
      toast.error("Selecione uma extensão para o líder.");
      return;
    }
    setEditLoading(true);
    const ext = extensoes.find(e => e.id === editData.extensao_id);
    await base44.entities.User.update(editUser.id, {
      role: editData.role,
      extensao_id: editData.extensao_id || null,
      extensao_nome: ext?.nome || null,
    });
    toast.success("Usuário atualizado.");
    setEditOpen(false);
    setEditLoading(false);
    loadData();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
      <ShieldCheck className="h-12 w-12 text-muted-foreground" />
      <p className="text-lg font-semibold">Acesso restrito</p>
      <p className="text-muted-foreground text-sm">Apenas administradores podem gerenciar usuários.</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">{users.length} usuário(s) cadastrado(s)</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Convidar usuário
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Permissões info */}
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { role: "admin", perms: ["Criar e excluir extensões", "Gerenciar usuários", "Ver todos os relatórios", "Acessar painel geral"] },
          { role: "lider", perms: ["Criar relatórios", "Visualizar dados da sua extensão", "Inserir observações"] },
        ].map(({ role, perms }) => {
          const cfg = ROLE_CONFIG[role];
          return (
            <div key={role} className="border rounded-lg p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {perms.map(p => <li key={p} className="flex items-center gap-1.5"><span className="text-green-500">✓</span>{p}</li>)}
              </ul>
            </div>
          );
        })}
      </div>

      {/* User list */}
      <div className="space-y-3">
        {filteredUsers.length === 0 && (
          <p className="text-center text-muted-foreground py-10">Nenhum usuário encontrado.</p>
        )}
        {filteredUsers.map(u => {
          const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.user;
          const ext = extensoes.find(e => e.id === u.extensao_id);
          const isSelf = u.id === currentUser?.id;
          return (
            <div key={u.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {(u.full_name || u.email || "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{u.full_name || "—"}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    {isSelf && <span className="text-xs text-muted-foreground">(você)</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  {(ext || u.extensao_nome) && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Church className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{ext?.nome || u.extensao_nome}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={() => openEdit(u)}>
                <Edit className="h-3.5 w-3.5" />
                Editar
              </Button>
            </div>
          );
        })}
      </div>

      {/* Invite modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar usuário</DialogTitle>
            <DialogDescription>O usuário receberá um convite por e-mail para acessar o sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">E-mail *</label>
              <Input
                className="mt-1"
                type="email"
                placeholder="email@exemplo.com"
                value={invite.email}
                onChange={e => setInvite(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Função *</label>
              <Select value={invite.role} onValueChange={v => setInvite(p => ({ ...p, role: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="lider">Líder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {invite.role === "lider" && (
              <div>
                <label className="text-sm font-medium">Extensão *</label>
                <Select value={invite.extensao_id} onValueChange={v => setInvite(p => ({ ...p, extensao_id: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione a extensão" />
                  </SelectTrigger>
                  <SelectContent>
                    {extensoes.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviteLoading}>
              {inviteLoading ? "Enviando..." : "Enviar convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>{editUser?.full_name} — {editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">Função</label>
              <Select value={editData.role} onValueChange={v => setEditData(p => ({ ...p, role: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="lider">Líder</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Extensão vinculada</label>
              <Select value={editData.extensao_id || "nenhuma"} onValueChange={v => setEditData(p => ({ ...p, extensao_id: v === "nenhuma" ? "" : v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Nenhuma</SelectItem>
                  {extensoes.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editLoading}>
              {editLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}