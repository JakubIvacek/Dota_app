// Steam Web API — ISteamNews/GetNewsForApp. See
// https://partner.steamgames.com/doc/webapi/ISteamNews
export interface SteamNewsItem {
  gid: string
  title: string
  url: string
  is_external_url: boolean
  author: string
  /** Raw contents — mix of BBCode and HTML from Valve, not safe to render as-is. */
  contents: string
  feedlabel: string
  /** Unix seconds. */
  date: number
  feedname: string
  feed_type: number
  appid: number
  tags?: string[]
}

export interface SteamNewsResponse {
  appnews: {
    appid: number
    newsitems: SteamNewsItem[]
    count: number
  }
}
