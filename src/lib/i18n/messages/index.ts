import type { Locale } from "../config";
import { ptBR } from "./pt-BR";
import { en } from "./en";

/** Shape of every dictionary. pt-BR is the source of truth; other locales must match it. */
export type Messages = typeof ptBR;

const dictionaries: Record<Locale, Messages> = { "pt-BR": ptBR, en };

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}
