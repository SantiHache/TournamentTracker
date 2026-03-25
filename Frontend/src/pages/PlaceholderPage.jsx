export default function PlaceholderPage({ title }) {
  return (
    <section className="card p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-slate-600">
        Este modulo se completa en el siguiente bloque. La navegacion global ya esta activa.
      </p>
    </section>
  );
}
