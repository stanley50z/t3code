/** Reads the Settings textarea: one phrase per line, trimmed, without blanks or repeats. */
export function parseQuickPhrases(text: string): string[] {
  return [...new Set(text.split("\n").map((line) => line.trim()))].filter(Boolean);
}

/** The text to append so a phrase lands on its own line after anything already typed. */
export function quickPhraseSuffix(text: string, phrase: string): string {
  return /\S$/.test(text) ? `\n${phrase}` : phrase;
}
