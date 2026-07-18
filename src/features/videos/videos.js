// Curated "Watch" library for Unhook — restorative videos that help redirect
// a craving into something calming, motivating, or grounding.
//
// IMPORTANT: we never embed guessed YouTube IDs (broken embeds look terrible).
// Every card links out via a YouTube *search* URL built from title + channel,
// which is guaranteed to resolve to real results. See searchUrl() below.

/** The five curated lanes. Order here is the default display order. */
export const CATEGORIES = [
  'Screen time & focus',
  'Quitting nicotine/vaping',
  'Craving & urge-surfing',
  'Motivation & identity',
  'Calm & breathing',
]

/**
 * Curated, real, high-signal talks and guided practices.
 * Each item: { title, channel, category, minutes, blurb }.
 */
export const VIDEOS = [
  // ── Screen time & focus ─────────────────────────────────────────────
  {
    title: 'Why you should quit social media',
    channel: 'Cal Newport · TEDxTysons',
    category: 'Screen time & focus',
    minutes: 14,
    blurb: 'A computer scientist reframes the feed as an engineered slot machine — and why walking away sharpens your mind.',
  },
  {
    title: 'Your attention didn’t collapse. It was stolen',
    channel: 'Johann Hari · TED',
    category: 'Screen time & focus',
    minutes: 13,
    blurb: 'The forces designed to fracture your focus, and small daily moves to win it back.',
  },
  {
    title: 'How to break up with your phone',
    channel: 'Catherine Price · Talks at Google',
    category: 'Screen time & focus',
    minutes: 47,
    blurb: 'A practical, judgment-free plan to loosen the grip of compulsive scrolling one habit at a time.',
  },

  // ── Quitting nicotine/vaping ────────────────────────────────────────
  {
    title: 'Nicotine’s effects on the brain & body',
    channel: 'Huberman Lab',
    category: 'Quitting nicotine/vaping',
    minutes: 22,
    blurb: 'The neuroscience of the nicotine hit — and evidence-based tools that make quitting stick.',
  },
  {
    title: 'What happens to your body when you quit smoking',
    channel: 'Cleveland Clinic',
    category: 'Quitting nicotine/vaping',
    minutes: 6,
    blurb: 'A timeline of the repair that begins minutes after your last one. Proof the urge is worth riding out.',
  },
  {
    title: 'The truth about vaping and your brain',
    channel: 'TED-Ed',
    category: 'Quitting nicotine/vaping',
    minutes: 5,
    blurb: 'How vapes rewire reward circuits fast — a clear-eyed look that makes the next skip easier.',
  },

  // ── Craving & urge-surfing ──────────────────────────────────────────
  {
    title: 'A simple way to break a bad habit',
    channel: 'Judson Brewer · TED',
    category: 'Craving & urge-surfing',
    minutes: 10,
    blurb: 'A psychiatrist shows how curious attention dissolves a craving faster than willpower ever could.',
  },
  {
    title: 'Urge surfing: riding out a craving',
    channel: 'Portland Psychotherapy',
    category: 'Craving & urge-surfing',
    minutes: 8,
    blurb: 'A guided practice: watch the urge rise, crest, and pass like a wave — without acting on it.',
  },
  {
    title: 'Guided urge surfing meditation for cravings',
    channel: 'Great Meditation',
    category: 'Craving & urge-surfing',
    minutes: 11,
    blurb: 'Ten calm minutes to sit beside a craving instead of feeding it. Press play when the pull hits.',
  },

  // ── Motivation & identity ───────────────────────────────────────────
  {
    title: 'Atomic Habits: how tiny changes rewire who you are',
    channel: 'James Clear',
    category: 'Motivation & identity',
    minutes: 20,
    blurb: 'Stop chasing outcomes; become the kind of person who doesn’t need the habit. Identity-first change.',
  },
  {
    title: 'How to stop screwing yourself over',
    channel: 'Mel Robbins · TEDxSF',
    category: 'Motivation & identity',
    minutes: 22,
    blurb: 'A blunt, funny push on closing the gap between what you intend and what you actually do.',
  },
  {
    title: 'The power of believing that you can improve',
    channel: 'Carol Dweck · TED',
    category: 'Motivation & identity',
    minutes: 10,
    blurb: 'The “not yet” mindset that turns a relapse into data instead of a verdict.',
  },

  // ── Calm & breathing ────────────────────────────────────────────────
  {
    title: 'Reduce anxiety in real time with the physiological sigh',
    channel: 'Huberman Lab',
    category: 'Calm & breathing',
    minutes: 4,
    blurb: 'The fastest known way to down-shift stress — two inhales, one long exhale. Do it before you decide.',
  },
  {
    title: '5-minute breathing exercise to calm the nervous system',
    channel: 'Great Meditation',
    category: 'Calm & breathing',
    minutes: 5,
    blurb: 'A short guided reset for the moment the craving spikes. Follow the breath, let the wave pass.',
  },
  {
    title: 'Box breathing: a Navy SEAL technique for calm focus',
    channel: 'Sunnybrook Hospital',
    category: 'Calm & breathing',
    minutes: 5,
    blurb: 'Four-count in, hold, out, hold. A simple square to steady your hands and your mind.',
  },
]

/**
 * Build a guaranteed-working YouTube search link for a video.
 * Never fabricate video IDs — searching the exact title + channel is robust.
 */
export function searchUrl(video) {
  const q = encodeURIComponent(`${video.title} ${video.channel}`)
  return `https://www.youtube.com/results?search_query=${q}`
}

/**
 * Map a user's habit (free text) to the most relevant category, or null.
 * Used to surface a "Recommended for you" lane at the top.
 */
export function categoryForHabit(habit) {
  if (!habit) return null
  const h = habit.toLowerCase()
  const has = (...words) => words.some((w) => h.includes(w))

  if (has('smok', 'cigar', 'vap', 'nicotine', 'tobacco', 'juul')) return 'Quitting nicotine/vaping'
  if (has('phone', 'social', 'scroll', 'screen', 'instagram', 'tiktok', 'reddit', 'youtube', 'doomscroll', 'feed'))
    return 'Screen time & focus'
  if (has('porn', 'gambl', 'shop', 'snack', 'sugar', 'binge', 'drink', 'alcohol', 'weed', 'crav'))
    return 'Craving & urge-surfing'
  return null
}
