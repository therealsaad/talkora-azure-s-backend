export interface ExistingEpisode {
  id: string
  digitalType: string
}

export interface EpisodePlan {
  digitalType: string
  order: number
  existingId?: string
}

const NEW_EPISODE_TYPES = new Set([
  'EXACT_LINE_ROLE_SWAP',
  'CHILD_LEADS_CHAT',
  'EXPANDED_FAVOURITES',
  'BADGE_REWARD',
])

const LEGACY_ALIASES: Record<string, string[]> = {
  CHILD_LEADS_CHAT: ['EXACT_LINE_ROLE_SWAP'],
  EXACT_LINE_ROLE_SWAP: ['CHILD_LEADS_CHAT'],
}

export function planUnit1Migration(existing: ExistingEpisode[], authoredTypes: string[]): EpisodePlan[] {
  const byType = new Map<string, string>()
  for (const episode of existing) {
    const type = String(episode.digitalType || '').trim()
    if (!type) continue
    if (byType.has(type)) throw new Error(`Level 1 contains duplicate episode type: ${type}`)
    byType.set(type, episode.id)
  }

  const used = new Set<string>()
  const plan = authoredTypes.map((rawType, index) => {
    const digitalType = String(rawType || '').trim()
    if (!digitalType) throw new Error(`Authored Level 1 episode ${index + 1} is missing digitalType`)

    const candidateTypes = [digitalType, ...(LEGACY_ALIASES[digitalType] || [])]
    let existingId: string | undefined
    for (const candidate of candidateTypes) {
      const id = byType.get(candidate)
      if (id && !used.has(id)) {
        existingId = id
        break
      }
    }

    if (!existingId && !NEW_EPISODE_TYPES.has(digitalType)) {
      throw new Error(`Existing Level 1 episode is missing: ${digitalType}`)
    }
    if (existingId) used.add(existingId)
    return { digitalType, order: index + 1, existingId }
  })

  // Never silently delete an old activity that cannot be mapped. This protects
  // existing ActivityAttempt/Progress references during a curriculum migration.
  const unmapped = existing.filter((episode) => !used.has(episode.id))
  if (unmapped.length) {
    throw new Error(`Level 1 contains episodes not covered by the syllabus migration: ${unmapped.map((e) => e.digitalType || e.id).join(', ')}`)
  }

  return plan
}
