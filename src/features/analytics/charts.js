// charts.js — pure, unit-testable functions that turn check-in data into chart
// geometry. No Vue, no DOM, no side effects: every function takes plain data and
// returns plain numbers/arrays the SVG template can render directly.
//
// Check-in shape: { day:'YYYY-MM-DD', status:'resisted'|'relapsed', mood:1-5, note }

/** Parse a 'YYYY-MM-DD' key into a local Date at midnight (avoids UTC drift). */
export function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Format a Date back to 'YYYY-MM-DD' (local). */
export function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Index check-ins by day for O(1) lookup. Last write wins on duplicate days. */
export function indexByDay(checkins = []) {
  const map = new Map()
  for (const c of checkins) if (c && c.day) map.set(c.day, c)
  return map
}

/**
 * Headline stats derived from the raw store counters. Pure — pass the numbers in.
 * @returns {{ streak, best, resisted, relapsed, total, winRate }}
 */
export function summaryStats({ streak = 0, best = 0, resisted = 0, relapsed = 0 } = {}) {
  const total = resisted + relapsed
  return {
    streak,
    best,
    resisted,
    relapsed,
    total,
    winRate: total ? Math.round((resisted / total) * 100) : 0,
  }
}

/**
 * Build a 7-row (weekday) x N-column (week) calendar heatmap for the last
 * `weeks` weeks ending on `today`. Columns are oldest→newest; each column is a
 * Sun→Sat week. Cells carry an intensity 0..1 and a status for colouring.
 *
 * @returns {{ weeks:number, cells:Array<{
 *   day, row, col, status:'resisted'|'relapsed'|'none', mood, intensity, inFuture, isToday
 * }>, columns:number }}
 */
export function buildHeatmap(checkins = [], { weeks = 8, today = new Date() } = {}) {
  const byDay = indexByDay(checkins)
  const todayKeyStr = dayKey(today)

  // Anchor to the Saturday that ends this week so the grid is a clean rectangle.
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  end.setDate(end.getDate() + (6 - end.getDay())) // forward to Saturday
  const start = new Date(end)
  start.setDate(start.getDate() - (weeks * 7 - 1)) // back to first Sunday

  const cells = []
  const cursor = new Date(start)
  for (let i = 0; i < weeks * 7; i++) {
    const key = dayKey(cursor)
    const entry = byDay.get(key)
    const status = entry ? entry.status : 'none'
    const mood = entry?.mood ?? 0
    // Resisted days scale intensity by mood (0.45..1); slips get a faint mark.
    let intensity = 0
    if (status === 'resisted') intensity = 0.45 + (Math.max(1, Math.min(5, mood || 3)) / 5) * 0.55
    else if (status === 'relapsed') intensity = 0.2
    cells.push({
      day: key,
      row: cursor.getDay(), // 0=Sun..6=Sat
      col: Math.floor(i / 7),
      status,
      mood,
      intensity: Number(intensity.toFixed(3)),
      inFuture: key > todayKeyStr,
      isToday: key === todayKeyStr,
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return { weeks, columns: weeks, cells }
}

/**
 * Mood series for the last `count` check-ins (chronological). Produces points in
 * a normalised 0..width / 0..height box plus a smooth Catmull-Rom→Bézier path.
 *
 * @returns {{ points:Array<{x,y,mood,day}>, path:string, width:number, height:number,
 *   min:number, max:number, avg:number|null, count:number }}
 */
export function moodSeries(checkins = [], { count = 14, width = 300, height = 90, pad = 8 } = {}) {
  const sorted = [...checkins]
    .filter((c) => c && typeof c.mood === 'number' && c.mood > 0)
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-count)

  const min = 1
  const max = 5
  const n = sorted.length
  const innerW = width - pad * 2
  const innerH = height - pad * 2

  const points = sorted.map((c, i) => {
    const x = n <= 1 ? width / 2 : pad + (i / (n - 1)) * innerW
    const y = pad + (1 - (c.mood - min) / (max - min)) * innerH
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), mood: c.mood, day: c.day }
  })

  const avg = n ? Number((sorted.reduce((s, c) => s + c.mood, 0) / n).toFixed(2)) : null
  return { points, path: smoothPath(points), width, height, min, max, avg, count: n }
}

/**
 * Catmull-Rom spline converted to cubic Bézier — a calm, smooth polyline with no
 * overshoot. Returns an SVG path `d` string. Pure geometry over {x,y} points.
 */
export function smoothPath(points = []) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x} ${p2.y}`
  }
  return d
}

/**
 * Donut geometry for wins vs slips. Returns two arc segments as stroke-dash
 * offsets on a circle, plus the derived win rate. Radius/circumference are fixed
 * so the template just binds the numbers.
 *
 * @returns {{ radius, circumference, segments:Array<{key,label,value,fraction,dash,offset,color}>,
 *   winRate:number, total:number }}
 */
export function winsDonut({ resisted = 0, relapsed = 0 } = {}, { radius = 42 } = {}) {
  const total = resisted + relapsed
  const circumference = Number((2 * Math.PI * radius).toFixed(3))
  const parts = [
    { key: 'resisted', label: 'Resisted', value: resisted, color: 'var(--accent-2)' },
    { key: 'relapsed', label: 'Slips', value: relapsed, color: 'var(--danger)' },
  ]
  let acc = 0
  const segments = parts.map((p) => {
    const fraction = total ? p.value / total : 0
    const dash = Number((fraction * circumference).toFixed(3))
    const offset = Number((-acc * circumference).toFixed(3))
    acc += fraction
    return { ...p, fraction, dash, offset }
  })
  return {
    radius,
    circumference,
    segments,
    total,
    winRate: total ? Math.round((resisted / total) * 100) : 0,
  }
}

/**
 * Progress toward the next milestone. Milestones are {day, label}; we pick the
 * first whose `day` target exceeds the current streak (else the last, completed).
 *
 * @returns {{ current, target, label, fraction, remaining, allDone:boolean,
 *   completed:number, totalMilestones:number, previous:number }}
 */
export function milestoneProgress(milestones = [], streak = 0) {
  const list = [...milestones]
    .filter((m) => m && typeof m.day === 'number')
    .sort((a, b) => a.day - b.day)

  if (list.length === 0) return null

  const completed = list.filter((m) => streak >= m.day).length
  const next = list.find((m) => m.day > streak)

  if (!next) {
    const last = list[list.length - 1]
    return {
      current: streak,
      target: last.day,
      label: last.label,
      fraction: 1,
      remaining: 0,
      allDone: true,
      completed: list.length,
      totalMilestones: list.length,
      previous: last.day,
    }
  }

  const previous = list.filter((m) => m.day <= streak).reduce((mx, m) => Math.max(mx, m.day), 0)
  const span = next.day - previous || next.day
  const fraction = Math.max(0, Math.min(1, (streak - previous) / span))
  return {
    current: streak,
    target: next.day,
    label: next.label,
    fraction: Number(fraction.toFixed(3)),
    remaining: Math.max(0, next.day - streak),
    allDone: false,
    completed,
    totalMilestones: list.length,
    previous,
  }
}

/**
 * Compact plain-text summary of the user's stats — fed to the AI so it can write
 * a specific, grounded insight. Pure string builder (no network).
 */
export function statsDigest({ stats, milestone, mood, profile } = {}) {
  const bits = []
  if (profile?.habit) bits.push(`Breaking: ${profile.habit}.`)
  if (stats) {
    bits.push(
      `Current streak ${stats.streak} day(s), best ${stats.best}. ` +
        `${stats.resisted} days resisted, ${stats.relapsed} slip(s), win rate ${stats.winRate}%.`,
    )
  }
  if (mood?.avg != null) bits.push(`Average mood over last ${mood.count} check-ins: ${mood.avg}/5.`)
  if (milestone && !milestone.allDone) {
    bits.push(`${milestone.remaining} day(s) from milestone "${milestone.label}".`)
  } else if (milestone?.allDone) {
    bits.push('All planned milestones reached.')
  }
  return bits.join(' ')
}
