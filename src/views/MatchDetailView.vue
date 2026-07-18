<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ACCOUNT_ID } from '../config'
import {
  abilityIconUrl,
  gameModeName,
  getAbilityMap,
  getHeroMap,
  getItemMap,
  getMatch,
  heroIconUrl,
  isRadiantSlot,
  itemImageUrl,
  requestMatchParse,
} from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { formatDate, formatDuration } from '../utils/format'
import { cssVar } from '../utils/theme'
import { useAppLocale } from '../composables/useAppLocale'
import Breadcrumb from '../components/Breadcrumb.vue'
import HeroIcon from '../components/HeroIcon.vue'
import LineChart from '../components/LineChart.vue'
import TeamGlyph from '../components/TeamGlyph.vue'
import Skeleton from '../components/Skeleton.vue'
import type { AbilityConstant, MatchPlayer } from '../types/opendota'

const route = useRoute()
const { t, intlLocale } = useAppLocale()

// Zvýrazni hráča, z ktorého profilu sme prišli (?player=), inak vlastný.
const highlightId = computed(() => String(route.query.player ?? ACCOUNT_ID))

// Späť na Matches tab hráča, z ktorého profilu sme prišli; bez ?player= a bez
// nastaveného ACCOUNT_ID (napr. priamo otvorený zdieľaný odkaz) padni na domov,
// nech odkaz nikdy nesmeruje na /player//matches.
const backTarget = computed(() => (highlightId.value ? `/player/${highlightId.value}/matches` : '/'))

const breadcrumbItems = computed(() => [
  { label: t('player.tabMatches'), to: backTarget.value },
  { label: `Match #${data.value?.match.match_id ?? route.params.id}` },
])

const { data, loading, error } = useAsync(async () => {
  const matchId = String(route.params.id)
  const [match, heroMap, itemMap, abilityMap] = await Promise.all([
    getMatch(matchId),
    getHeroMap(),
    getItemMap(),
    getAbilityMap(),
  ])
  return { match, heroMap, itemMap, abilityMap }
})

const ITEM_SLOTS = ['item_0', 'item_1', 'item_2', 'item_3', 'item_4', 'item_5'] as const

// Poradie skillovania — len ordering (viď OPENDOTA_API_NOTES.md), žiadny
// timestamp ani skutočný level: `ability_upgrades_arr` obsahuje len abilities,
// ktoré hráč reálne minul, v poradí, a mlčky vynecháva levely, kde si hráč
// bod na skill nechal na neskôr (v Dote úplne legálne). Skúšali sme talenty
// (viazané na skutočné levely 10/15/20/25) použiť ako kotvy a dopočítať
// zvyšok — výsledok bol technicky presnejší pre talenty, ale prázdne
// medzery/"osamotené" ikony pôsobili zavádzajúco, keďže level medzi kotvami
// aj tak len hádame. Radšej ukázať presne to, čo dáta hovoria: poradie
// pickov, nie level.
function skillBuild(p: MatchPlayer) {
  if (!p.ability_upgrades_arr?.length) return []
  return p.ability_upgrades_arr.map((abilityId, i) => ({
    level: i + 1,
    ability: data.value?.abilityMap.get(abilityId),
  }))
}

function playerRow(p: MatchPlayer) {
  return {
    ...p,
    hero: data.value?.heroMap.get(p.hero_id),
    items: ITEM_SLOTS.map((slot) => data.value?.itemMap.get(p[slot])).filter(Boolean),
    isMe: p.account_id != null && String(p.account_id) === highlightId.value,
    skillBuild: skillBuild(p),
  }
}

// MVP = najvyšší hero_damage na víťaznom tíme; nezávislé od "isMe" (identita vs. výkon).
function withMvp<T extends { hero_damage: number }>(players: T[], isWinner: boolean) {
  if (!isWinner) return players.map((p) => ({ ...p, isMvp: false }))
  const best = players.reduce((max, p) => (p.hero_damage > max ? p.hero_damage : max), -1)
  return players.map((p) => ({ ...p, isMvp: p.hero_damage === best }))
}

const radiant = computed(() =>
  withMvp(
    (data.value?.match.players ?? []).filter((p) => isRadiantSlot(p.player_slot)).map(playerRow),
    data.value?.match.radiant_win ?? false,
  ),
)
const dire = computed(() =>
  withMvp(
    (data.value?.match.players ?? []).filter((p) => !isRadiantSlot(p.player_slot)).map(playerRow),
    data.value?.match.radiant_win === false,
  ),
)

const anySkillBuild = computed(() =>
  (data.value?.match.players ?? []).some((p) => p.ability_upgrades_arr?.length),
)

// Dotabuff-style hover card pre skill-build ikony — rovnaký vzor ako
// hoveredMarkerKey v LineChart.vue (jeden zdieľaný element, key-based lookup).
// Na rozdiel od kill-marker tooltipu (child divu vnútri chart-scroll) je táto
// karta Teleport-nutá do <body> a polohovaná cez position: fixed — skill-grid
// sedí v .table-scroll s overflow-x: auto, čo si vynucuje aj overflow-y: auto
// (CSS spec: "visible" na jednej osi sa zmení na "auto", keď druhá nie je
// "visible"), takže child-element by sa orezával o výšku/šírku toho tímového
// tabu namiesto prekrytia celej stránky.
const hoveredSkillKey = ref<string | null>(null)
const skillCardPos = ref({ left: 0, top: 0, above: false, mobile: false })
const skillPipKey = (playerSlot: number, level: number) => `${playerSlot}-${level}`

// Card výška je premenlivá (desc/attrib/lore), preto flip rozhoduje reálny
// priestor pod pipom vo viewporte namiesto statickej heuristiky.
const SKILL_CARD_EST_HEIGHT = 320
const SKILL_CARD_WIDTH = 260
const VIEWPORT_MARGIN = 8

// Pod týmto viewport width je pip-anchored karta nepoužiteľná — na malej
// obrazovke sa oveľa ľahšie otvorí bližšie k spodku/kraju než je jej výška/
// šírka, takže by sa vždy odrezala. Namiesto dolaďovania anchor-offsetov ju
// na mobile radšej vycentrujeme na celú obrazovku (position: fixed, vlastný
// scroll), nech je vždy celá viditeľná bez ohľadu na to, ktorý pip sa ťukol.
const MOBILE_BREAKPOINT = 640

const hoveredAbility = computed<AbilityConstant | undefined>(() => {
  if (!hoveredSkillKey.value) return undefined
  for (const p of [...radiant.value, ...dire.value]) {
    const entry = p.skillBuild.find((e) => e && skillPipKey(p.player_slot, e.level) === hoveredSkillKey.value)
    if (entry?.ability && !entry.ability.isTalent && !entry.ability.isAttributeBonus) return entry.ability
  }
  return undefined
})

function onSkillPipEnter(playerSlot: number, level: number, event: MouseEvent) {
  hoveredSkillKey.value = skillPipKey(playerSlot, level)

  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    skillCardPos.value = { left: 0, top: 0, above: false, mobile: true }
    return
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const above = window.innerHeight - rect.bottom < SKILL_CARD_EST_HEIGHT
  const centerLeft = rect.left + rect.width / 2
  const halfWidth = SKILL_CARD_WIDTH / 2
  skillCardPos.value = {
    left: Math.min(
      Math.max(centerLeft, halfWidth + VIEWPORT_MARGIN),
      window.innerWidth - halfWidth - VIEWPORT_MARGIN,
    ),
    top: above ? rect.top - 8 : rect.bottom + 8,
    above,
    mobile: false,
  }
}

function onSkillPipLeave() {
  hoveredSkillKey.value = null
}

// Touch devices don't fire mouseenter/mouseleave, so hover alone leaves the
// card unreachable on mobile — tap the pip to toggle it open/closed, and tap
// anywhere else to dismiss it (see onDocumentClick below).
function onSkillPipClick(playerSlot: number, level: number, event: MouseEvent) {
  const key = skillPipKey(playerSlot, level)
  if (hoveredSkillKey.value === key) {
    hoveredSkillKey.value = null
    return
  }
  onSkillPipEnter(playerSlot, level, event)
}

function onDocumentClick(event: MouseEvent) {
  // The mobile card has pointer-events: auto (so it's touch-scrollable), so
  // taps landing on the card itself must not count as "outside" — otherwise
  // scrolling/tapping the open card would immediately dismiss it.
  const target = event.target as HTMLElement
  if (!target.closest('.skill-pip') && !target.closest('.skill-card')) {
    hoveredSkillKey.value = null
  }
}

// The pip-anchored (desktop) card's position is captured once
// (getBoundingClientRect at hover time) and painted with position: fixed —
// it doesn't track the pip during scroll, so dismiss it rather than leaving
// it drifted away from its icon. The mobile card is centered on the
// viewport regardless of page scroll, so it doesn't need this.
function onWindowScroll() {
  if (!skillCardPos.value.mobile) hoveredSkillKey.value = null
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('scroll', onWindowScroll, { passive: true, capture: true })
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('scroll', onWindowScroll, { capture: true })
})

// `generated: true` atribúty (cast range/point, odvodené hodnoty) sú na
// Dotabuffe zväčša skryté — menej užitočné pre hráča než ručne autorované
// hodnoty ako damage/radius. Bez viditeľného `header` niet čo zobraziť.
function visibleAttribs(ability: AbilityConstant | undefined) {
  return (ability?.attrib ?? []).filter((a) => a.header && !a.generated)
}

function formatAttribValue(value: string | string[]) {
  return Array.isArray(value) ? value.join(' / ') : value
}

/**
 * Auto-parse: nesparsovaný match → pošli OpenDote parse request a každú
 * minútu skús graf doťiahnuť. Replaye expirujú (~2–4 týždne), staré matche
 * preto ani neskúšame.
 */
const REPLAY_EXPIRY_DAYS = 30
const POLL_MS = 60_000
const MAX_POLLS = 8

type ParseState = 'idle' | 'polling' | 'expired' | 'gave_up'
const parseState = ref<ParseState>('idle')

// Dedup v rámci života komponentu; prípadný duplicitný request po remounte OpenDote nevadí.
const alreadyRequested = new Set<string>()

let pollTimer: number | undefined
let polls = 0

function stopPolling() {
  if (pollTimer != null) window.clearInterval(pollTimer)
  pollTimer = undefined
}

async function startAutoParse(matchId: string) {
  parseState.value = 'polling'
  polls = 0
  if (!alreadyRequested.has(matchId)) {
    alreadyRequested.add(matchId)
    // Aj keby request zlyhal (rate limit…), poll má zmysel — parse mohol vyžiadať niekto iný.
    await requestMatchParse(matchId).catch(() => {})
  }
  pollTimer = window.setInterval(async () => {
    polls++
    const fresh = await getMatch(matchId, { fresh: true }).catch(() => null)
    if (fresh?.radiant_gold_adv?.length && data.value) {
      stopPolling()
      data.value = { ...data.value, match: fresh }
    } else if (polls >= MAX_POLLS) {
      stopPolling()
      parseState.value = 'gave_up'
    }
  }, POLL_MS)
}

watch(
  () => data.value?.match,
  (match) => {
    stopPolling()
    if (!match) return
    if (match.radiant_gold_adv?.length) {
      parseState.value = 'idle'
      return
    }
    const ageDays = (Date.now() / 1000 - match.start_time) / 86_400
    if (ageDays > REPLAY_EXPIRY_DAYS) {
      parseState.value = 'expired'
      return
    }
    startAutoParse(String(match.match_id))
  },
)

function retryParse() {
  const match = data.value?.match
  if (!match) return
  alreadyRequested.delete(String(match.match_id))
  startAutoParse(String(match.match_id))
}

onBeforeUnmount(stopPolling)

const advantage = computed(() => {
  const m = data.value?.match
  if (!m?.radiant_gold_adv?.length) return null
  return {
    labels: m.radiant_gold_adv.map((_, i) => formatDuration(i * 60)),
    gold: m.radiant_gold_adv,
    xp: m.radiant_xp_adv ?? [],
  }
})

const formatK = (v: number) => `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`

// Kill markers pre advantage graf — len ak je match sparsovaný (rovnaká brána ako
// radiant_gold_adv). `kills_log` je per-hráč log killov, ktoré tento hráč získal;
// `key` je NPC meno OBETE, treba ho dohľadať v heroMape podľa `.name`. Bez gold-per-kill
// (nie je v tomto poli) a bez Radiant/Dire summary listu — viď OPENDOTA_API_NOTES.md.
const killMarkers = computed(() => {
  const match = data.value?.match
  if (!match?.radiant_gold_adv?.length) return []
  const heroByNpcName = new Map(
    Array.from(data.value!.heroMap.values()).map((h) => [h.name, h]),
  )
  return match.players
    .flatMap((p) =>
      (p.kills_log ?? []).map((k) => ({
        time: k.time,
        isRadiant: isRadiantSlot(p.player_slot),
        hero: heroByNpcName.get(k.key),
      })),
    )
    .filter((e): e is typeof e & { hero: NonNullable<typeof e.hero> } => e.hero != null)
    .sort((a, b) => a.time - b.time)
    .map((e) => ({
      time: e.time,
      isRadiant: e.isRadiant,
      iconUrl: heroIconUrl(e.hero),
      title: t('matchDetail.killTooltip', {
        hero: e.hero.localized_name,
        time: formatDuration(e.time),
      }),
    }))
})

// Per-player timeline card: vyber hráča klikom na ikonu, default prvý Radiant hráč.
const selectedSlot = ref<number | null>(null)
const allPlayers = computed(() => [
  ...radiant.value.map((p) => ({ ...p, isRadiant: true })),
  ...dire.value.map((p) => ({ ...p, isRadiant: false })),
])
const selectedPlayer = computed(() => {
  const slot = selectedSlot.value ?? radiant.value[0]?.player_slot
  return allPlayers.value.find((p) => p.player_slot === slot) ?? null
})
const playerTimeline = computed(() => {
  const p = selectedPlayer.value
  if (!p?.gold_t?.length) return null
  return {
    labels: p.gold_t.map((_, i) => formatDuration(i * 60)),
    gold: p.gold_t,
    xp: p.xp_t ?? [],
  }
})
</script>

<template>
  <section v-if="loading" class="skeleton-stack lg">
    <Skeleton variant="block" height="84px" class="card" />
    <Skeleton variant="block" height="280px" class="card" />
    <Skeleton variant="block" height="280px" class="card" />
  </section>
  <div v-else-if="error" class="error-box">{{ t('matchDetail.errorLoad', { error }) }}</div>

  <template v-else-if="data">
    <Breadcrumb :items="breadcrumbItems" show-back-arrow class="page-breadcrumb" />

    <section class="card match-hero" :class="data.match.radiant_win ? 'radiant' : 'dire'">
      <div class="hero-verdict">
        <TeamGlyph :side="data.match.radiant_win ? 'radiant' : 'dire'" />
        {{ data.match.radiant_win ? 'Radiant' : 'Dire' }} {{ t('matchDetail.victory') }}
      </div>
      <div class="score">
        <span class="side radiant" :class="{ loser: !data.match.radiant_win }">
          {{ data.match.radiant_score }}
        </span>
        <span class="score-sep">—</span>
        <span class="side dire" :class="{ loser: data.match.radiant_win }">
          {{ data.match.dire_score }}
        </span>
      </div>
      <div class="muted hero-meta">
        {{ gameModeName(data.match.game_mode) }} ·
        {{ formatDuration(data.match.duration) }} ·
        {{ formatDate(data.match.start_time, intlLocale) }} ·
        Match {{ data.match.match_id }}
      </div>
    </section>

    <section v-for="team in [
        { name: 'Radiant', players: radiant, won: data.match.radiant_win },
        { name: 'Dire', players: dire, won: !data.match.radiant_win },
      ]" :key="team.name" class="card team" :class="team.name.toLowerCase()">
      <h2 class="team-name">
        <TeamGlyph :side="team.name.toLowerCase() as 'radiant' | 'dire'" />
        {{ team.name }}
        <span v-if="team.won" class="badge win">{{ t('matchDetail.victory') }}</span>
      </h2>
      <div class="table-scroll desktop-table">
        <table class="data">
          <thead>
            <tr>
              <th>Hero</th>
              <th>{{ t('matchDetail.colPlayer') }}</th>
              <th class="num">LVL</th>
              <th>K / D / A</th>
              <th class="num">Net</th>
              <th class="num">GPM / XPM</th>
              <th class="num">LH / DN</th>
              <th class="num">DMG</th>
              <th>{{ t('matchDetail.colItems') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in team.players"
              :key="p.player_slot"
              :class="[team.name.toLowerCase(), { me: p.isMe, mvp: p.isMvp }]"
            >
              <td>
                <HeroIcon :hero="p.hero" :show-name="false" />
              </td>
              <td class="name">
                <RouterLink v-if="p.account_id != null" :to="`/player/${p.account_id}`">
                  {{ p.personaname ?? t('common.playerFallback', { id: p.account_id }) }}
                </RouterLink>
                <span v-else class="muted">{{ t('matchDetail.anonymous') }}</span>
                <span v-if="p.isMvp" class="mvp-tag">★ MVP</span>
              </td>
              <td class="num">{{ p.level }}</td>
              <td class="emphasis">{{ p.kills }} / {{ p.deaths }} / {{ p.assists }}</td>
              <td class="num dim">{{ p.net_worth != null ? formatK(p.net_worth) : '—' }}</td>
              <td class="num emphasis">{{ p.gold_per_min }} / {{ p.xp_per_min }}</td>
              <td class="num dim">{{ p.last_hits }} / {{ p.denies }}</td>
              <td class="num emphasis">{{ formatK(p.hero_damage) }}</td>
              <td>
                <span class="items">
                  <img
                    v-for="(item, i) in p.items"
                    :key="i"
                    :src="itemImageUrl(item)"
                    :alt="item?.dname ?? ''"
                    :title="item?.dname"
                    class="item"
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul class="mobile-players">
        <li
          v-for="p in team.players"
          :key="p.player_slot"
          class="player-card"
          :class="[team.name.toLowerCase(), { me: p.isMe, mvp: p.isMvp }]"
        >
          <div class="player-card-top">
            <HeroIcon :hero="p.hero" :show-name="false" />
            <span class="player-name">
              <RouterLink v-if="p.account_id != null" :to="`/player/${p.account_id}`">
                {{ p.personaname ?? t('common.playerFallback', { id: p.account_id }) }}
              </RouterLink>
              <span v-else class="muted">{{ t('matchDetail.anonymous') }}</span>
            </span>
            <span v-if="p.isMvp" class="mvp-tag">MVP</span>
          </div>
          <div class="player-card-stats">
            <div class="stat">
              <span class="stat-value">{{ p.level }}</span>
              <span class="stat-label">LVL</span>
            </div>
            <div class="stat emphasis">
              <span class="stat-value">{{ p.kills }} / {{ p.deaths }} / {{ p.assists }}</span>
              <span class="stat-label">K / D / A</span>
            </div>
            <div class="stat dim">
              <span class="stat-value">{{ p.net_worth != null ? formatK(p.net_worth) : '—' }}</span>
              <span class="stat-label">Net</span>
            </div>
            <div class="stat emphasis">
              <span class="stat-value">{{ p.gold_per_min }} / {{ p.xp_per_min }}</span>
              <span class="stat-label">GPM / XPM</span>
            </div>
            <div class="stat dim">
              <span class="stat-value">{{ p.last_hits }} / {{ p.denies }}</span>
              <span class="stat-label">LH / DN</span>
            </div>
            <div class="stat emphasis">
              <span class="stat-value">{{ formatK(p.hero_damage) }}</span>
              <span class="stat-label">DMG</span>
            </div>
          </div>
          <div class="items player-card-items">
            <img
              v-for="(item, i) in p.items"
              :key="i"
              :src="itemImageUrl(item)"
              :alt="item?.dname ?? ''"
              :title="item?.dname"
              class="item"
            />
          </div>
        </li>
      </ul>
    </section>

    <section v-if="anySkillBuild" class="card skill-build-card">
      <div
        v-for="team in [
          { name: 'Radiant', players: radiant },
          { name: 'Dire', players: dire },
        ]"
        :key="team.name"
        class="skill-build-team"
      >
        <h3 class="skill-team-name" :class="team.name.toLowerCase()">
          <TeamGlyph :side="team.name.toLowerCase() as 'radiant' | 'dire'" />
          {{ team.name === 'Radiant' ? t('matchDetail.radiantBuilds') : t('matchDetail.direBuilds') }}
        </h3>
        <p v-if="!team.players.some((p) => p.skillBuild.length)" class="muted skill-build-empty">
          {{ t('matchDetail.skillBuildUnavailable') }}
        </p>
        <div v-else class="table-scroll">
          <table class="skill-grid" :class="team.name.toLowerCase()">
            <thead>
              <tr>
                <th class="skill-hero-col">{{ t('matchDetail.colPlayer') }}</th>
                <th v-for="lvl in 25" :key="lvl" class="num" :title="t('matchDetail.skillOrderHint')">#{{ lvl }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in team.players" :key="p.player_slot">
                <td class="skill-hero-col">
                  <span
                    :title="`${p.personaname ?? t('matchDetail.anonymous')} — ${p.hero?.localized_name ?? t('common.unknown')}`"
                  >
                    <HeroIcon :hero="p.hero" :show-name="false" />
                  </span>
                </td>
                <td v-for="lvl in 25" :key="lvl" class="skill-cell">
                  <span
                    v-if="p.skillBuild[lvl - 1]"
                    class="skill-pip"
                    :class="{
                      talent: p.skillBuild[lvl - 1].ability?.isTalent,
                      'attr-bonus': p.skillBuild[lvl - 1].ability?.isAttributeBonus,
                    }"
                    :title="
                      p.skillBuild[lvl - 1].ability?.isTalent
                        ? t('matchDetail.skillTooltip', { name: p.skillBuild[lvl - 1].ability?.dname ?? '?', level: lvl })
                        : p.skillBuild[lvl - 1].ability?.isAttributeBonus
                          ? t('matchDetail.skillTooltip', { name: t('matchDetail.attributeBonus'), level: lvl })
                          : undefined
                    "
                    @mouseenter="
                      !p.skillBuild[lvl - 1].ability?.isTalent &&
                      !p.skillBuild[lvl - 1].ability?.isAttributeBonus &&
                      onSkillPipEnter(p.player_slot, lvl, $event)
                    "
                    @mouseleave="onSkillPipLeave"
                    @click="
                      !p.skillBuild[lvl - 1].ability?.isTalent &&
                      !p.skillBuild[lvl - 1].ability?.isAttributeBonus &&
                      onSkillPipClick(p.player_slot, lvl, $event)
                    "
                  >
                    <img
                      v-if="
                        p.skillBuild[lvl - 1].ability &&
                        !p.skillBuild[lvl - 1].ability?.isTalent &&
                        !p.skillBuild[lvl - 1].ability?.isAttributeBonus
                      "
                      :src="abilityIconUrl(p.skillBuild[lvl - 1].ability)"
                      :alt="p.skillBuild[lvl - 1].ability?.dname ?? ''"
                      class="skill-icon"
                    />
                    <span v-else-if="p.skillBuild[lvl - 1].ability?.isAttributeBonus" class="skill-icon skill-icon-attr-bonus"
                      >+2</span
                    >
                    <span v-else class="skill-icon skill-icon-talent">🍃</span>
                  </span>
                  <span v-else class="skill-cell-empty">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Teleported to <body> (position: fixed) so the card can never be clipped
         by the skill-grid's own overflow-x:auto scroll container — a single
         shared element for all ~250 pips, keyed by hoveredSkillKey. -->
    <Teleport to="body">
      <div
        v-if="hoveredAbility"
        class="skill-card"
        :class="skillCardPos.mobile ? 'mobile' : skillCardPos.above ? 'above' : 'below'"
        :style="skillCardPos.mobile ? {} : { left: `${skillCardPos.left}px`, top: `${skillCardPos.top}px` }"
      >
        <div class="skill-card-header">
          <img :src="abilityIconUrl(hoveredAbility)" :alt="hoveredAbility.dname" class="skill-card-icon" />
          <span class="skill-card-name">{{ hoveredAbility.dname }}</span>
        </div>

        <p v-if="hoveredAbility.desc" class="skill-card-desc">{{ hoveredAbility.desc }}</p>

        <dl class="skill-card-meta">
          <template v-if="hoveredAbility.behavior">
            <dt>{{ t('matchDetail.skillCardAbility') }}</dt>
            <dd>{{ formatAttribValue(hoveredAbility.behavior) }}</dd>
          </template>
          <template v-if="hoveredAbility.dmgType">
            <dt>{{ t('matchDetail.skillCardDamageType') }}</dt>
            <dd>{{ hoveredAbility.dmgType }}</dd>
          </template>
          <template v-if="hoveredAbility.bkbPierce">
            <dt>{{ t('matchDetail.skillCardPierces') }}</dt>
            <dd>{{ hoveredAbility.bkbPierce }}</dd>
          </template>
          <template v-if="hoveredAbility.dispellable">
            <dt>{{ t('matchDetail.skillCardDispellable') }}</dt>
            <dd>{{ hoveredAbility.dispellable }}</dd>
          </template>
        </dl>

        <ul v-if="visibleAttribs(hoveredAbility).length" class="skill-card-attrib">
          <li v-for="a in visibleAttribs(hoveredAbility)" :key="a.key">
            <span class="skill-card-attrib-header">{{ a.header }}</span>
            <span>{{ formatAttribValue(a.value) }}</span>
          </li>
        </ul>

        <p v-if="hoveredAbility.manaCost" class="skill-card-cost">
          {{ t('matchDetail.skillCardMana') }}: {{ hoveredAbility.manaCost.join('/') }}
        </p>
        <p v-if="hoveredAbility.cooldown" class="skill-card-cost">
          {{ t('matchDetail.skillCardCooldown') }}: {{ hoveredAbility.cooldown.join('/') }}s
        </p>

        <p v-if="hoveredAbility.lore" class="skill-card-lore">{{ hoveredAbility.lore }}</p>
      </div>
    </Teleport>

    <section class="card advantage-card">
      <h2>{{ t('matchDetail.goldXpAdvantage') }}</h2>
      <!-- TODO: Roshan/team-wipe/high-ground event markers need OpenDota objectives/teamfights
           data (not in MatchPlayer/types/opendota.ts today) plus LineChart annotation support. -->
      <LineChart
        v-if="advantage"
        :labels="advantage.labels"
        :datasets="[
          { label: 'Gold', data: advantage.gold, color: cssVar('--gold') },
          { label: 'XP', data: advantage.xp, color: cssVar('--accent') },
        ]"
        :y-format="formatK"
        :height="360"
        :team-split="{
          topLabel: 'Radiant',
          bottomLabel: 'Dire',
          topWash: 'rgba(38, 176, 76, 0.07)',
          bottomWash: 'rgba(224, 82, 79, 0.07)',
          topLabelColor: cssVar('--radiant-strong'),
          bottomLabelColor: cssVar('--dire-strong'),
        }"
        :kill-markers="killMarkers"
        :scroll-hint="t('matchDetail.chartScrollHint')"
      />
      <div v-else class="status-note">
        <template v-if="parseState === 'polling'">
          {{ t('matchDetail.parsePolling') }}
        </template>
        <template v-else-if="parseState === 'gave_up'">
          {{ t('matchDetail.parseGaveUp') }}
          <button class="retry" @click="retryParse">{{ t('matchDetail.parseRetry') }}</button>
        </template>
        <template v-else-if="parseState === 'expired'">
          <i18n-t keypath="matchDetail.parseExpired">
            <template #tag><em>Expose Public Match Data</em></template>
          </i18n-t>
        </template>
        <template v-else>
          {{ t('matchDetail.parseUnavailable') }}
        </template>
      </div>
    </section>

    <section class="card">
      <h2>{{ t('matchDetail.playerTimeline') }}</h2>
      <div class="player-strip">
        <button
          v-for="p in allPlayers"
          :key="p.player_slot"
          type="button"
          class="player-icon"
          :class="[p.isRadiant ? 'radiant' : 'dire', { active: p.player_slot === selectedPlayer?.player_slot }]"
          :aria-label="t('matchDetail.viewPlayerTimeline', { name: p.personaname ?? t('common.playerFallback', { id: p.account_id }) })"
          :aria-pressed="p.player_slot === selectedPlayer?.player_slot"
          :title="`${p.personaname ?? t('matchDetail.anonymous')} — ${p.hero?.localized_name ?? t('common.unknown')}`"
          @click="selectedSlot = p.player_slot"
        >
          <HeroIcon :hero="p.hero" :show-name="false" />
        </button>
      </div>

      <LineChart
        v-if="playerTimeline"
        :labels="playerTimeline.labels"
        :datasets="[
          { label: 'Gold', data: playerTimeline.gold, color: cssVar('--gold') },
          { label: 'XP', data: playerTimeline.xp, color: cssVar('--accent') },
        ]"
        :y-format="formatK"
        :height="300"
      />
      <div v-else class="status-note">
        <template v-if="parseState === 'polling'">
          {{ t('matchDetail.parsePolling') }}
        </template>
        <template v-else-if="parseState === 'gave_up'">
          {{ t('matchDetail.parseGaveUp') }}
          <button class="retry" @click="retryParse">{{ t('matchDetail.parseRetry') }}</button>
        </template>
        <template v-else-if="parseState === 'expired'">
          <i18n-t keypath="matchDetail.parseExpired">
            <template #tag><em>Expose Public Match Data</em></template>
          </i18n-t>
        </template>
        <template v-else>
          {{ t('matchDetail.parseUnavailable') }}
        </template>
      </div>
    </section>
  </template>
</template>

<style scoped>
.page-breadcrumb {
  padding-left: var(--space-5);
  margin-bottom: var(--space-3);
}

/* Hero section — the page's primary focal point, given more visual weight
   (glow shadow, larger padding) than the team/graph cards below it. */
.match-hero {
  margin-bottom: var(--space-8);
  padding: var(--space-6) var(--space-5);
  text-align: center;
}

.match-hero.radiant { box-shadow: var(--shadow-glow-radiant), var(--shadow-md); }
.match-hero.dire { box-shadow: var(--shadow-glow-dire), var(--shadow-md); }

.hero-verdict {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  margin-bottom: var(--space-2);
}

.match-hero.radiant .hero-verdict { color: var(--radiant); }
.match-hero.dire .hero-verdict { color: var(--dire); }

/* Score is the page's primary focal point — sized up from the old --text-2xl
   so it reads before the verdict line or any other stat. */
.score {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--weight-bold);
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.score .side.radiant { color: var(--radiant); }
.score .side.dire { color: var(--dire); }
.score .side.loser { opacity: 0.5; }

/* Glow only the winning side's digits — the losing side stays flat via .loser opacity. */
.score .side.radiant:not(.loser) { text-shadow: 0 0 24px rgba(38, 176, 76, 0.45); }
.score .side.dire:not(.loser) { text-shadow: 0 0 24px rgba(224, 82, 79, 0.45); }

.score-sep { color: var(--muted); }

.hero-meta {
  margin-top: var(--space-3);
}

.team {
  margin-bottom: var(--space-6);
  border-top: 2px solid transparent;
}

.advantage-card {
  margin-bottom: var(--space-6);
}

/* Dota konvencia: Radiant zelená, Dire červená — plus jemný farebný wash panelu,
   nech identita tímu nesedí len na jednom pixelovom pruhu. */
.team.radiant {
  border-top-color: var(--radiant);
  background: var(--radiant-wash), linear-gradient(180deg, rgba(255, 255, 255, 0.015), transparent 40%), var(--surface);
}
.team.dire {
  border-top-color: var(--dire);
  background: var(--dire-wash), linear-gradient(180deg, rgba(255, 255, 255, 0.015), transparent 40%), var(--surface);
}

.team.radiant .team-name { color: var(--radiant); }
.team.dire .team-name { color: var(--dire); }

/* Stronger presence than the plain global .badge.win — a soft glow reinforces
   "this team won" as the one thing in this row that should pop. */
.team.radiant .badge.win { box-shadow: var(--shadow-glow-radiant); }
.team.dire .badge.win { box-shadow: var(--shadow-glow-dire); }

.team h2 {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.table-scroll {
  overflow-x: auto;
}

/* Subtle alternating tint + hover instead of hard row borders. */
tbody tr:nth-child(even) td {
  background: rgba(255, 255, 255, 0.015);
}

tbody tr:hover td {
  background: rgba(255, 255, 255, 0.035);
}

/* MVP = highest hero_damage on the team; independent of "me" identity. */
tr.mvp td:first-child {
  box-shadow: inset 3px 0 0 0 var(--radiant);
}

tr.dire.mvp td:first-child {
  box-shadow: inset 3px 0 0 0 var(--dire);
}

/* Subtle gold tint marks the row as elite — wins over .me's accent tint
   even on your own row, since MVP is the rarer, more notable signal. */
tr.mvp td {
  background: var(--gold-soft);
}

tr.mvp:hover td {
  background: rgba(201, 133, 0, 0.22);
}

.mvp-tag {
  display: inline-block;
  margin-left: var(--space-2);
  padding: 0.05rem var(--space-2);
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-wide);
  color: #1a1200;
  background: var(--gold);
  box-shadow: 0 0 0 1px rgba(201, 133, 0, 0.3), 0 4px 12px -4px rgba(201, 133, 0, 0.5);
  vertical-align: middle;
}

.num.dim,
.stat.dim .stat-value {
  opacity: 0.6;
}

/* K/D/A, GPM/XPM, DMG carry the most scan-value — a touch heavier + brighter
   than the default so the eye lands on them first, without going full bold. */
td.emphasis,
.stat.emphasis .stat-value {
  font-weight: var(--weight-semibold);
  color: var(--ink);
}

/* Mobile card list — hidden by default, swapped in for the table below
   720px so per-player stats read top-to-bottom instead of needing a
   horizontal scroll to see net/gpm/xpm/lh-dn/dmg/items. */
.mobile-players {
  display: none;
}

@media (max-width: 720px) {
  .desktop-table {
    display: none;
  }

  .mobile-players {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    list-style: none;
    padding: 0;
    margin: 0;
  }
}

.player-card {
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.player-card.mvp {
  border-left: 3px solid var(--radiant);
  background: var(--gold-soft);
}

.player-card.dire.mvp {
  border-left-color: var(--dire);
}

.player-card-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.player-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-name a {
  color: var(--ink);
}

.player-name a:hover {
  color: var(--accent);
}

.player-card-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.stat-value {
  font-variant-numeric: tabular-nums;
  font-weight: var(--weight-semibold);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name a {
  color: var(--ink);
}

.name a:hover {
  color: var(--accent);
}

.items {
  display: inline-flex;
  gap: var(--space-2);
}

.player-card-items {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.item {
  width: 36px;
  height: 27px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  display: block;
  transition: transform var(--duration-fast) var(--ease-out);
}

.item:hover {
  transform: scale(1.15);
  position: relative;
  z-index: 1;
}

/* Skill build (poradie skillovania) — dedikovaná sekcia inšpirovaná Dotabuff
   skill-build mriežkou (hero riadky × level 1-25 stĺpce), ale odľahčená pod
   naše existujúce farby/radius/tabuľkové konvencie namiesto 1:1 kópie. */
.skill-build-card {
  margin-bottom: var(--space-6);
}

.skill-build-team + .skill-build-team {
  margin-top: var(--space-4);
}

.skill-team-name {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  margin-bottom: var(--space-2);
}

.skill-team-name.radiant { color: var(--radiant); }
.skill-team-name.dire { color: var(--dire); }

.skill-build-empty {
  font-size: var(--text-sm);
}

table.skill-grid {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

table.skill-grid th {
  text-align: center;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-eyebrow);
  font-weight: var(--weight-semibold);
  padding: var(--space-2) 0.15rem;
  border-bottom: 1px solid var(--baseline);
  font-variant-numeric: tabular-nums;
}

/* Stĺpce levelov farebne ladené s tímom — rovnaká konvencia ako .team-name
   (Radiant zelená, Dire červená), nech je hneď jasné, ktorá mriežka patrí kam. */
table.skill-grid.radiant th { color: var(--radiant); }
table.skill-grid.dire th { color: var(--dire); }

table.skill-grid th.skill-hero-col,
table.skill-grid td.skill-hero-col {
  text-align: left;
  padding-left: var(--space-2);
}

table.skill-grid td {
  padding: 2px;
  border-bottom: 1px solid var(--grid);
  text-align: center;
  vertical-align: middle;
}

table.skill-grid tr:last-child td {
  border-bottom: none;
}

table.skill-grid tr:nth-child(even) td {
  background: rgba(255, 255, 255, 0.015);
}

.skill-cell-empty {
  color: var(--muted);
  opacity: 0.35;
}

.skill-pip {
  position: relative;
  display: inline-flex;
}

.skill-icon {
  width: 24px;
  height: 24px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  display: block;
  border: 1px solid var(--border);
  transition: transform var(--duration-fast) var(--ease-out);
}

/* Talenty nemajú ikonu v OpenDota constants (len text dname) — leaf glyph ich
   vizuálne odlíši od Q/W/E/R skillov, podobne ako leaf ikony na Dotabuffe. */
.skill-icon-talent {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--gold);
  background: var(--gold-soft);
}

/* Attribute Bonus (+2 all stats) is a different mechanic than a talent — it's
   not tier-locked and can repeat many times per game, so it needs its own
   look (not the gold talent leaf) to avoid reading as "this hero took N
   talents". Distinct accent color, same size/shape as the other pips. */
.skill-icon-attr-bonus {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: var(--weight-semibold);
  border-radius: var(--radius-sm);
  border: 1px solid var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.skill-pip:hover .skill-icon {
  transform: scale(1.25);
  position: relative;
  z-index: 1;
}

/* Dotabuff-style hover card — Teleport-ed to <body> and positioned with
   position: fixed (left/top set inline from getBoundingClientRect() in
   onSkillPipEnter), so it always paints above the whole page instead of
   being clipped/scrolled by the skill-grid's .table-scroll overflow-x:auto
   container (which forces overflow-y: auto too — see script comment) or
   fighting the Radiant/Dire section's own stacking height.
   pointer-events: none so it can't itself trigger mouseleave. */
.skill-card {
  position: fixed;
  width: 260px;
  z-index: 1000;
  pointer-events: none;
  background: var(--surface-2);
  color: var(--ink);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  box-shadow: var(--shadow-md);
  text-align: left;
  white-space: normal;
  font-variant-numeric: normal;
}

.skill-card.below {
  transform: translateX(-50%);
}

.skill-card.above {
  transform: translate(-50%, -100%);
}

/* Mobile: not anchored to the tapped pip at all — centered on the viewport
   with its own internal scroll, so it's always fully visible regardless of
   where on the page it was opened (see MOBILE_BREAKPOINT comment in script).
   Opened by tap (not hover), so — unlike the desktop card — nothing relies
   on pointer-events: none here; re-enable it so the content is touch-
   scrollable when it's taller than max-height. */
.skill-card.mobile {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: calc(100vw - 2 * var(--space-4));
  max-width: 360px;
  max-height: 80vh;
  overflow-y: auto;
  pointer-events: auto;
  -webkit-overflow-scrolling: touch;
}

.skill-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.skill-card-icon {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.skill-card-name {
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
}

.skill-card-desc {
  margin: 0 0 var(--space-2);
  font-size: var(--text-xs);
  line-height: 1.45;
  color: var(--ink-2);
}

.skill-card-meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px var(--space-2);
  margin: 0 0 var(--space-2);
  font-size: var(--text-xs);
}

.skill-card-meta dt {
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: var(--tracking-eyebrow);
  white-space: nowrap;
}

.skill-card-meta dd {
  margin: 0;
  text-align: right;
  color: var(--ink-2);
}

.skill-card-attrib {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--text-xs);
}

.skill-card-attrib li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
}

.skill-card-attrib-header {
  color: var(--muted);
}

.skill-card-cost {
  margin: 0 0 2px;
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
}

.skill-card-lore {
  margin: var(--space-2) 0 0;
  padding-top: var(--space-2);
  border-top: 1px solid var(--grid);
  font-size: var(--text-xs);
  font-style: italic;
  color: var(--muted);
}

.player-strip {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.player-icon {
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.3rem;
  line-height: 0;
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}

.player-icon.radiant {
  border-color: var(--radiant-soft);
}

.player-icon.dire {
  border-color: var(--dire-soft);
}

.player-icon.radiant.active {
  border-color: var(--radiant);
  box-shadow: var(--shadow-glow-radiant);
}

.player-icon.dire.active {
  border-color: var(--dire);
  box-shadow: var(--shadow-glow-dire);
}

.retry {
  background: var(--accent);
  border: none;
  border-radius: var(--radius-md);
  color: #fff;
  font: inherit;
  font-weight: var(--weight-semibold);
  padding: 0.2rem 0.7rem;
  margin-left: var(--space-2);
  cursor: pointer;
}
</style>
