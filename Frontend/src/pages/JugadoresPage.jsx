import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api";

const CAT_CABALLEROS = ["C2", "C3", "C4", "C5", "C6", "C7", "C8"];
const CAT_DAMAS      = ["D2", "D3", "D4", "D5", "D6", "D7", "D8"];
const ALL_CATEGORIES = [...CAT_CABALLEROS, ...CAT_DAMAS];

function catTone(code) {
  if (!code) return "slate";
  return code.startsWith("C") ? "green" : "violet";
}

function CatChip({ value, active, onClick }) {
  const tone = catTone(value);
  const activeClass =
    tone === "green"
      ? "bg-emerald-500 border-emerald-500 text-white"
      : "bg-brandViolet border-brandViolet text-white";
  const idleClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition select-none ${active ? activeClass : idleClass}`}
    >
      {value}
    </button>
  );
}

function CatBadge({ type, ordinal, code }) {
  const tone = catTone(code);
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "violet"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : "border-slate-200 bg-slate-50 text-slate-700";
  
  const label = type && ordinal ? `${type.slice(0, 1)}${ordinal}` : "—";
  
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function JugadoresPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros en estado local; el fetch trae todo y filtramos en cliente
  const [query, setQuery] = useState("");
  const [selectedCats, setSelectedCats] = useState(new Set());

  const searchRef = useRef(null);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/jugadores");
      setPlayers(data || []);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudieron cargar los jugadores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  const toggleCat = (cat) => {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedCats(new Set());
    searchRef.current?.focus();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter((p) => {
      if (selectedCats.size > 0 && !selectedCats.has(p.categoria_code)) return false;
      if (q) {
        const full = `${p.apellido} ${p.nombre}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [players, query, selectedCats]);

  const hasFilters = query.trim().length > 0 || selectedCats.size > 0;

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-emerald-50 to-violet-50 px-6 py-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brandViolet">
                Circuit Mode
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">Jugadores</h1>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-2xl font-bold text-slate-900">{players.length}</p>
                <p className="text-xs text-slate-500">registrados</p>
              </div>
              {hasFilters && (
                <div>
                  <p className="text-2xl font-bold text-brandViolet">{filtered.length}</p>
                  <p className="text-xs text-slate-500">filtrados</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra de búsqueda + filtros */}
        <div className="space-y-4 px-6 py-4">
          {/* Buscador */}
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              🔍
            </span>
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar por nombre o apellido..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-brandViolet/30"
            />
            {query && (
              <button
                type="button"
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700"
                onClick={() => setQuery("")}
                aria-label="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros de categoría */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Caballeros
              </span>
              {CAT_CABALLEROS.map((cat) => (
                <CatChip
                  key={cat}
                  value={cat}
                  active={selectedCats.has(cat)}
                  onClick={() => toggleCat(cat)}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Damas&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              </span>
              {CAT_DAMAS.map((cat) => (
                <CatChip
                  key={cat}
                  value={cat}
                  active={selectedCats.has(cat)}
                  onClick={() => toggleCat(cat)}
                />
              ))}
            </div>
          </div>

          {/* Limpiar filtros */}
          {hasFilters && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {filtered.length === 0
                  ? "Sin resultados"
                  : `Mostrando ${filtered.length} de ${players.length} jugadores`}
              </span>
              <button
                type="button"
                className="text-xs text-brandViolet underline underline-offset-2 hover:text-brandViolet/70"
                onClick={clearFilters}
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Tabla de jugadores */}
      <section className="card overflow-hidden">
        {loading && (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            Cargando jugadores...
          </div>
        )}

        {!loading && error && (
          <div className="px-6 py-10 text-center text-sm text-red-500">{error}</div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            {hasFilters
              ? "Ningún jugador coincide con los filtros aplicados."
              : "No hay jugadores registrados en el circuito."}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] uppercase tracking-widest text-slate-400">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Jugador</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">E-mail</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Teléfono</th>
                <th className="hidden px-4 py-3 text-right font-semibold lg:table-cell">
                  Ranking pts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-slate-400">{p.id}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">
                      {p.apellido}, {p.nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CatBadge type={p.categoria_type} ordinal={p.categoria_ordinal} code={p.categoria_code} />
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">
                    {p.email || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                    {p.telefono}
                  </td>
                  <td className="hidden px-4 py-3 text-right font-semibold text-slate-700 lg:table-cell">
                    {p.ranking_points ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}