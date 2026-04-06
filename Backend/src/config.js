const path = require("path");
const dotenv = require("dotenv");
const installationConfig = require("../installation.config");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const validMatchFormats = new Set(["one_set", "best_of_3", "best_of_3_super_tb"]);
const validInstallationModes = new Set(["club", "circuit"]);

function buildTournamentProfiles(raw) {
  const entries = Object.entries(raw || {}).filter(([, profile]) => profile?.enabled);
  const profiles = {};

  for (const [code, profile] of entries) {
    const matchFormat = validMatchFormats.has(profile.matchFormat)
      ? profile.matchFormat
      : "one_set";

    profiles[code] = {
      code,
      enabled: true,
      label: profile.label || code,
      matchFormat,
      playMode: profile.playMode || "single_day_single_club",
      description: profile.description || "",
    };
  }

  return profiles;
}

const allTournamentProfiles = buildTournamentProfiles(installationConfig.tournamentTypes);

// Filter by ALLOWED_TOURNAMENT_TYPES env var if set
const envAllowedTypes = process.env.ALLOWED_TOURNAMENT_TYPES
  ? process.env.ALLOWED_TOURNAMENT_TYPES.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
  : null;

const tournamentProfiles = envAllowedTypes
  ? Object.fromEntries(Object.entries(allTournamentProfiles).filter(([code]) => envAllowedTypes.includes(code)))
  : allTournamentProfiles;

const allowedTournamentTypes = Object.keys(tournamentProfiles);
const resolvedDefaultTournamentType = allowedTournamentTypes.includes(
  installationConfig.defaultTournamentType
)
  ? installationConfig.defaultTournamentType
  : allowedTournamentTypes[0] || null;

const envMinTournamentPairs = Number(process.env.MIN_TOURNAMENT_PAIRS || 6);
const envMaxTournamentPairs = Number(process.env.MAX_TOURNAMENT_PAIRS || 24);
const minTournamentPairs = Number.isFinite(envMinTournamentPairs)
  ? Math.max(2, Math.floor(envMinTournamentPairs))
  : 6;
const maxTournamentPairs = Number.isFinite(envMaxTournamentPairs)
  ? Math.max(minTournamentPairs, Math.floor(envMaxTournamentPairs))
  : Math.max(minTournamentPairs, 24);

function parseIntegerEnv(name, fallback, min, max) {
  const rawValue = process.env[name];
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

const defaultClasificanDeZona3 = parseIntegerEnv("DEFAULT_CLASIFICAN_ZONA_3", 2, 1, 3);
const defaultClasificanDeZona4 = parseIntegerEnv("DEFAULT_CLASIFICAN_ZONA_4", 3, 1, 4);

const rawInstallationMode = String(process.env.INSTALLATION_MODE || "club").trim().toLowerCase();
const installationMode = validInstallationModes.has(rawInstallationMode)
  ? rawInstallationMode
  : "club";
const circuitEnabled =
  installationMode === "circuit" && String(process.env.CIRCUIT_ENABLED || "false") === "true";

const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "replace_this_secret",
  adminUser: process.env.ADMIN_USER || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  adminName: process.env.ADMIN_NAME || "Administrador",
  superadminUser: process.env.SUPERADMIN_USER || "simpleline",
  superadminPassword: process.env.SUPERADMIN_PASSWORD || null,
  superadminName: process.env.SUPERADMIN_NAME || "Simple Line Solutions",
  minTournamentPairs,
  maxTournamentPairs,
  allowedTournamentTypes,
  defaultTournamentType: resolvedDefaultTournamentType,
  tournamentProfiles,
  defaultClasificanDeZona3,
  defaultClasificanDeZona4,
  installationMode,
  circuitEnabled,
  isClubMode: installationMode === "club",
  isCircuitMode: circuitEnabled,
};

module.exports = { config };
