export const retry = async <T>(action: () => Promise<T>, retries = 3, intervalMs = 500): Promise<T> => {
  let lastErr: unknown;
  for (let i = 0; i < retries; i += 1) {
    try {
      return await action();
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
  }
  throw lastErr;
};
