/** URL-safe slug compatible with the organizations.slug constraint. */
export function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return base.length >= 3 ? base : `${base || "empresa"}-${Math.random().toString(36).slice(2, 7)}`;
}
