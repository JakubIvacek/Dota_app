// Steam64 ID = Dota account_id + 76561197960265728 (the 32-bit Steam account
// number offset into the 64-bit SteamID). See
// https://developer.valvesoftware.com/wiki/SteamID
const STEAM64_OFFSET = 76561197960265728n

/**
 * Recognizes a raw account ID, or an account ID embedded in a pasted
 * Steam/Dotabuff/OpenDota/Stratz profile link (or this app's own /player
 * URL), and returns the Dota account_id as a string — or null if `input`
 * doesn't look like any of those, so it should go through name search instead.
 */
export function extractAccountId(input: string): string | null {
  const trimmed = input.trim()
  if (/^\d+$/.test(trimmed)) return trimmed

  const steam64Match = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/)
  if (steam64Match) {
    const steam64 = BigInt(steam64Match[1])
    return steam64 > STEAM64_OFFSET ? (steam64 - STEAM64_OFFSET).toString() : null
  }

  const knownSiteMatch = trimmed.match(/(?:dotabuff\.com|opendota\.com|stratz\.com)\/players\/(\d+)/)
  if (knownSiteMatch) return knownSiteMatch[1]

  const ownProfileMatch = trimmed.match(/\/player\/(\d+)/)
  if (ownProfileMatch) return ownProfileMatch[1]

  return null
}
