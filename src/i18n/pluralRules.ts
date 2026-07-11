import type { PluralizationRule } from 'vue-i18n'

/**
 * Russian/Ukrainian pluralization (one/few/many/other) — classic Slavic rule:
 * n%10===1 && n%100!==11 → one; n%10 in 2..4 && n%100 not in 12..14 → few;
 * else → many. Message strings must supply exactly these 3 forms in order.
 */
export const slavicEastPluralRule: PluralizationRule = (choice) => {
  const n = Math.abs(choice)
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 0
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 1
  return 2
}

/**
 * Slovak/Czech pluralization (one/few/many) — simpler than ru/uk, no
 * teen-number exception: 1 → one; 2-4 → few; else → many.
 */
export const slovakPluralRule: PluralizationRule = (choice) => {
  const n = Math.abs(choice)
  if (n === 1) return 0
  if (n >= 2 && n <= 4) return 1
  return 2
}

/** Chinese/Filipino/Turkish have no grammatical plural — always the same form. */
export const noPluralRule: PluralizationRule = () => 0
