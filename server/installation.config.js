module.exports = {
  // Tipo por defecto al crear torneos si no se especifica uno.
  defaultTournamentType: "americano",

  // Perfiles definidos a nivel instalacion (no se editan desde frontend).
  tournamentTypes: {
    americano: {
      enabled: true,
      label: "Americano",
      matchFormat: "Un Set",
      playMode: "single_day_single_club",
      description: "Torneo Americano - Inicia y Finaliza el mismo día.",
    },
    largo: {
      enabled: true,
      label: "Largo",
      matchFormat: "Al Mejor de 3 Sets",
      playMode: "multi_day_multi_club",
      description: "No hay restricciones de clubes ni de fechas, ideal para circuitos o torneos con muchos participantes.",
    },
  },
};
