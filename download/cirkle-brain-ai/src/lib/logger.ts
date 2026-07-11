type LogLevel = "info" | "warn" | "error" | "debug";
const isDev = process.env.NODE_ENV !== "production";
function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = { level, message, timestamp: new Date().toISOString(), ...meta };
  if (isDev) {
    const prefix = `[${entry.timestamp}] ${level.toUpperCase()}`;
    if (level === "error") console.error(prefix, message, meta || "");
    else if (level === "warn") console.warn(prefix, message, meta || "");
    else console.log(prefix, message, meta || "");
  }
  if (!isDev && level === "error") process.stderr.write(JSON.stringify(entry) + "\n");
}
export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => { if (isDev) log("debug", msg, meta); },
};
