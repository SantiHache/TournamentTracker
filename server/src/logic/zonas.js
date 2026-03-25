function getZonesCount(totalPairs) {
  if (totalPairs >= 6 && totalPairs <= 8) return 2;
  if (totalPairs >= 9 && totalPairs <= 11) return 3;
  if (totalPairs >= 12 && totalPairs <= 16) return 4;
  if (totalPairs === 17 || totalPairs === 20) return 5;
  if ((totalPairs >= 18 && totalPairs <= 19) || (totalPairs >= 21 && totalPairs <= 24)) return 6;
  throw new Error("Cantidad de parejas invalida");
}

function buildZoneDistribution(totalPairs) {
  const zones = getZonesCount(totalPairs);
  const distribution = [];
  let remaining = totalPairs;

  for (let i = 0; i < zones; i += 1) {
    const zonesLeft = zones - i;
    const useFour = remaining - 4 >= (zonesLeft - 1) * 3;
    distribution.push(useFour ? 4 : 3);
    remaining -= useFour ? 4 : 3;
  }

  return distribution;
}

function calcClasificados(tournament, distribution) {
  return distribution.reduce((acc, size) => {
    if (size === 3) return acc + tournament.clasifican_de_zona_3;
    return acc + tournament.clasifican_de_zona_4;
  }, 0);
}

function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function calcTorneo(tournament) {
  const distribution = buildZoneDistribution(tournament.planned_pairs);
  const totalClasificados = calcClasificados(tournament, distribution);
  const bracketSize = nextPowerOfTwo(totalClasificados);
  return {
    distribution,
    totalClasificados,
    bracketSize,
    byes: bracketSize - totalClasificados,
  };
}

module.exports = {
  getZonesCount,
  buildZoneDistribution,
  calcClasificados,
  nextPowerOfTwo,
  calcTorneo,
};
