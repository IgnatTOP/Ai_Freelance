export type CommandPaletteScope = "orders" | "users" | "chats";

export type CommandPaletteItem = {
  id: string;
  scope: CommandPaletteScope;
  title: string;
  subtitle?: string;
  href: string;
};
