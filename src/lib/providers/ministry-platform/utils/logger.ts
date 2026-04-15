const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  debug: isDev
    ? (...args: unknown[]) => console.log('[MP]', ...args)
    : () => {},
  error: (...args: unknown[]) => console.error('[MP]', ...args),
};
