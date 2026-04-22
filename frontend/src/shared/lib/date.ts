export const toIso = (date: Date): string => date.toISOString();

export const fromIso = (value: string): Date => new Date(value);
