/**
 * Structured Logger for the NeuralJEE backend.
 * Replaces raw console.log with FAANG-standard telemetry blocks.
 */
export const logger = {
  info: (action: string, payload: Record<string, unknown> = {}) => {
    console.log(
      JSON.stringify({
        level: 'INFO',
        timestamp: new Date().toISOString(),
        action,
        ...payload,
      })
    );
  },
  warn: (action: string, payload: Record<string, unknown> = {}) => {
    console.warn(
      JSON.stringify({
        level: 'WARN',
        timestamp: new Date().toISOString(),
        action,
        ...payload,
      })
    );
  },
  error: (action: string, error: unknown, payload: Record<string, unknown> = {}) => {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        timestamp: new Date().toISOString(),
        action,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...payload,
      })
    );
  },
};
