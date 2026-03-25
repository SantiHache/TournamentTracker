const { app } = require("./app");
const { runMigrations } = require("./db/migrate");
const { config } = require("./config");

runMigrations();

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Servidor escuchando en 0.0.0.0:${config.port}`);
});
