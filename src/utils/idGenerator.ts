/** Generates short, human-friendly codes (student codes, school codes) that are not guessable secrets. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid ambiguity

export function generateCode(length = 6, prefix = ''): string {
  let out = prefix
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return out
}
