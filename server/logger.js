import fs from "fs";
import os from "os";
import path from "path";

const logPath = process.env.FARM_CHORES_LOG || process.env.APP_LOG;
const service = process.env.SERVICE_NAME || "farm_chores";
const hostname = os.hostname();

function redact(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redact);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      /(password|secret|token|key|authorization|cookie)/i.test(key) ? "[redacted]" : redact(entry),
    ]),
  );
}

export function logEvent(event, fields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    service,
    hostname,
    event,
    ...redact(fields),
  };
  const line = JSON.stringify(payload);

  if (logPath) {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `${line}\n`, "utf8");
  }

  process.stdout.write(`${line}\n`);
}

export function serializeError(error) {
  return {
    name: error?.name || "Error",
    message: error?.message || String(error),
    stack: error?.stack,
  };
}
