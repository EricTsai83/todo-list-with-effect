type LogLevel = "debug" | "info" | "warn" | "error";

export type Logger = {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (
    message: string,
    error?: unknown,
    context?: Record<string, unknown>,
  ) => void;
  timer: (
    name: string,
    context?: Record<string, unknown>,
  ) => (
    success?: boolean,
    error?: unknown,
    extraContext?: Record<string, unknown>,
  ) => void;
};

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const mask = (
  obj: Record<string, unknown> | undefined,
  keys: string[],
): Record<string, unknown> | undefined => {
  if (!obj) return obj;
  const out: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      out[key] = keys.includes(key) ? "[REDACTED]" : (obj as any)[key];
    }
  }
  return out;
};

export const createLogger = (options?: {
  level?: LogLevel;
  redactKeys?: string[];
}): Logger => {
  const minPriority = levelPriority[options?.level ?? "info"];
  const redactKeys = options?.redactKeys ?? [];
  const log = (
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: unknown,
  ) => {
    if (levelPriority[level] < minPriority) return;
    const payload = mask(context, redactKeys);
    const method =
      level === "error"
        ? console.error
        : level === "warn"
        ? console.warn
        : level === "info"
        ? console.info
        : console.debug;
    error
      ? method(message, { ...(payload ?? {}), error })
      : method(message, payload);
  };
  return {
    debug: (message, context) => log("debug", message, context),
    info: (message, context) => log("info", message, context),
    warn: (message, context) => log("warn", message, context),
    error: (message, error, context) => log("error", message, context, error),
    timer: (name, context) => {
      const start = Date.now();
      return (success = true, error, extraContext) => {
        const durationMs = Date.now() - start;
        const contextToLog = {
          durationMs,
          ...(context ?? {}),
          ...(extraContext ?? {}),
        };
        success
          ? log("info", `${name} completed`, contextToLog)
          : log("error", `${name} failed`, contextToLog, error);
      };
    },
  };
};
