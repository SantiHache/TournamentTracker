const express = require("express");
const cors = require("cors");
const { config } = require("./config");
const { requireAuth } = require("./middleware/auth");
const { errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const paymentMethodsRoutes = require("./routes/paymentMethods");
const globalClubsRoutes = require("./routes/globalClubs");
const globalCourtsRoutes = require("./routes/globalCourts");
const tournamentsRoutes = require("./routes/tournaments");
const matchesRoutes = require("./routes/matches");
const superadminRoutes = require("./routes/superadmin");
const playersRoutes = require("./routes/players");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/public/app-config", (req, res) => {
	res.json({
		installationMode: config.installationMode,
		circuitEnabled: config.circuitEnabled,
		modeLabel: config.isCircuitMode ? "Circuit Mode" : "Club Mode",
	});
});
app.get("/api/jugadores/debug", (req, res) => {
	// Debug endpoint - NO auth required
	const { db } = require("./db/connection");
	try {
		const playerCount = db.prepare("SELECT COUNT(*) as total FROM players").get().total;
		const columnCheck = db.pragma("table_info(players)").map(c => c.name);
		res.json({
			debug: true,
			playerCount,
			columns: columnCheck,
			message: "Debug OK",
			circuitMode: config.isCircuitMode
		});
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
});

app.use("/api/auth", authRoutes);

app.use("/api", requireAuth);
app.use("/api/usuarios", usersRoutes);
app.use("/api/medios-pago", paymentMethodsRoutes);
app.use("/api/clubs-globales", globalClubsRoutes);
app.use("/api/canchas-globales", globalCourtsRoutes);
app.use("/api/torneos", tournamentsRoutes);
app.use("/api/partidos", matchesRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/jugadores", playersRoutes);

app.use(errorHandler);

module.exports = { app };
