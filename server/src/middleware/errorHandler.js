function errorHandler(err, req, res, next) {
  if (err && err.name === "ZodError") {
    return res.status(400).json({ error: "Validacion", details: err.issues });
  }

  console.error(err);
  return res.status(500).json({ error: "Error interno" });
}

module.exports = { errorHandler };
