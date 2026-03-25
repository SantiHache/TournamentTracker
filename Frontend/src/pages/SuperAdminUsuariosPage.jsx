import { useEffect, useRef, useState } from "react";
import api from "../api";
import { useAuthStore } from "../store/authStore";

const ROLES = ["admin", "asistente", "superadmin"];

function RoleBadge({ role }) {
  const styles = {
    superadmin: "bg-violet-100 text-violet-700",
    admin: "bg-blue-100 text-blue-700",
    asistente: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${styles[role] || styles.asistente}`}>
      {role}
    </span>
  );
}

export default function SuperAdminUsuariosPage() {
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    nombre: "",
    role: "admin",
    activo: true,
  });
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const pushToast = (type, message) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  };

  const load = async () => {
    try {
      const { data } = await api.get("/usuarios");
      setUsers(data || []);
    } catch {
      pushToast("error", "No se pudieron cargar los usuarios");
    }
  };

  useEffect(() => { load(); }, []);

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await api.post("/usuarios", {
        username: createForm.username,
        password: createForm.password,
        nombre: createForm.nombre,
        role: createForm.role,
        activo: createForm.activo,
      });
      setShowCreate(false);
      setCreateForm({ username: "", password: "", nombre: "", role: "admin", activo: true });
      pushToast("success", "Usuario creado");
      load();
    } catch (err) {
      pushToast("error", err.response?.data?.error || "No se pudo crear el usuario");
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditForm({ nombre: user.nombre, role: user.role, activo: Boolean(user.activo), password: "" });
  };

  const saveEdit = async (userId) => {
    try {
      const payload = { nombre: editForm.nombre, role: editForm.role, activo: editForm.activo };
      if (editForm.password) payload.password = editForm.password;
      await api.put(`/usuarios/${userId}`, payload);
      setEditingId(null);
      pushToast("success", "Usuario actualizado");
      load();
    } catch (err) {
      pushToast("error", err.response?.data?.error || "No se pudo actualizar el usuario");
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("¿Confirmas eliminar este usuario? Esta acción no se puede deshacer.")) return;
    try {
      await api.delete(`/usuarios/${userId}`);
      pushToast("success", "Usuario eliminado");
      load();
    } catch (err) {
      pushToast("error", err.response?.data?.error || "No se pudo eliminar el usuario");
    }
  };

  const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brandViolet/30";

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
            <p className="mt-1 text-sm text-slate-500">SuperAdmin · Todos los usuarios del sistema</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => { setShowCreate((v) => !v); setEditingId(null); }}
          >
            {showCreate ? "Cancelar" : "+ Nuevo usuario"}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={createUser} className="mt-5 space-y-4 border-t border-slate-100 pt-5">
            <h3 className="font-semibold text-slate-700">Nuevo usuario</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Username</label>
                <input
                  className={inputClass}
                  value={createForm.username}
                  onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
                  required
                  minLength={3}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Nombre completo</label>
                <input
                  className={inputClass}
                  value={createForm.nombre}
                  onChange={(e) => setCreateForm((p) => ({ ...p, nombre: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Contraseña</label>
                <input
                  className={inputClass}
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Rol</label>
                <select
                  className={inputClass}
                  value={createForm.role}
                  onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="create-activo"
                  checked={createForm.activo}
                  onChange={(e) => setCreateForm((p) => ({ ...p, activo: e.target.checked }))}
                />
                <label htmlFor="create-activo" className="text-sm">Activo</label>
              </div>
            </div>
            <button type="submit" className="btn-primary">Crear usuario</button>
          </form>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-bold text-lg">Usuarios ({users.length})</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl border border-slate-200 p-4">
              {editingId === u.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Nombre</label>
                      <input
                        className={inputClass}
                        value={editForm.nombre}
                        onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Rol</label>
                      <select
                        className={inputClass}
                        value={editForm.role}
                        onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Nueva contraseña (opcional)</label>
                      <input
                        className={inputClass}
                        type="password"
                        value={editForm.password}
                        onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                        placeholder="Dejar vacío para no cambiar"
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <input
                        type="checkbox"
                        id={`activo-${u.id}`}
                        checked={editForm.activo}
                        onChange={(e) => setEditForm((p) => ({ ...p, activo: e.target.checked }))}
                      />
                      <label htmlFor={`activo-${u.id}`} className="text-sm">Activo</label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={() => saveEdit(u.id)}>Guardar</button>
                    <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold">{u.nombre}</span>
                    <span className="ml-2 text-sm text-slate-400">@{u.username}</span>
                    <RoleBadge role={u.role} />
                    {!u.activo && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Inactivo</span>
                    )}
                    {u.id === me?.id && (
                      <span className="ml-2 text-xs text-slate-400">(tú)</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary py-1 px-3 text-sm"
                      onClick={() => startEdit(u)}
                    >
                      Editar
                    </button>
                    {u.id !== me?.id && (
                      <button
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100"
                        onClick={() => deleteUser(u.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
              t.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
