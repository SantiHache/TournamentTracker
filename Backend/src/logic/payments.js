function pairPaymentWarning(payments) {
  return payments.some((p) => p.estado !== "pagado");
}

function normalizeEstadoForTransactions(total) {
  if (total <= 0) return "sin_pago";
  return "parcial";
}

module.exports = { pairPaymentWarning, normalizeEstadoForTransactions };
