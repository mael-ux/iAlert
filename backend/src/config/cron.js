// backend/src/config/cron.js
// Cron desactivado para evitar errores con DATABASE_URL
export const healthCheckJob = {
  start: () => console.log("⏳ Cron job (health) desactivado."),
};

export const photoJob = {
  start: () => console.log("⏳ Cron job (photo) desactivado."),
};
