type DebouncedFn<TArgs extends unknown[]> = ((...args: TArgs) => void) & {
  cancel: () => void;
};

export const debounce = <TArgs extends unknown[]>(fn: (...args: TArgs) => void, delayMs: number): DebouncedFn<TArgs> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: TArgs): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  return debounced;
};
