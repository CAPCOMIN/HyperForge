export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.info(`[HyperForge] ${message}`, meta ?? {});
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(`[HyperForge] ${message}`, meta ?? {});
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(`[HyperForge] ${message}`, meta ?? {});
  }
};
