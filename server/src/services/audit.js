const { db } = require("../db/connection");

function logAudit({ actorUserId, action, entity, entityId = null, before = null, after = null }) {
  db.prepare(
    `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, before_json, after_json)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    actorUserId || null,
    action,
    entity,
    entityId,
    before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) : null
  );
}

module.exports = { logAudit };
