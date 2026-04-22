export const normalizePhone = (raw: string): string => raw.replace(/\D/g, "");

export const formatRuPhoneMask = (raw: string): string => {
  const digits = normalizePhone(raw);
  const value = digits.startsWith("7") || digits.startsWith("8") ? digits.slice(1) : digits;
  const d = value.slice(0, 10);

  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 8);
  const p4 = d.slice(8, 10);

  if (!d.length) return "";
  if (d.length <= 3) return `+7 (${p1}`;
  if (d.length <= 6) return `+7 (${p1}) ${p2}`;
  if (d.length <= 8) return `+7 (${p1}) ${p2}-${p3}`;
  return `+7 (${p1}) ${p2}-${p3}-${p4}`;
};

export const isValidPhone = (raw: string): boolean => {
  const digits = normalizePhone(raw);
  if (digits.length === 10) return true;
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) return true;
  return false;
};
