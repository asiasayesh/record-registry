import { t, ascii, text } from '@/i18n.js'

const norm = s => ascii(s).toLowerCase().replace(/[يىئ]/g, 'ی').replace(/ك/g, 'ک').replace(/[أإآ]/g, 'ا').replace(/[ةۀ]/g, 'ه').replace(/ؤ/g, 'و').replace(/[\u200c\u0640\u064b-\u0652]/g, '').trim()
const dist = (a, b) => [...a].reduce((prev, ca) => [...b].reduce((row, cb, j) => (row.push(Math.min(row.at(-1) + 1, prev[j + 1] + 1, prev[j] + (ca === cb ? 0 : 1))), row), [prev[0] + 1]), [0, ...[...b].map((_, i) => i + 1)]).at(-1)
const allow = n => +(n > 2) + +(n > 6)
const near = (w, s, n = norm(s), a = allow(w.length)) => n.includes(w) || n.split(/\s+/).some(p => p && Math.abs(p.length - w.length) <= a && dist(w, p) <= a)
const bag = (r, d = '') => [r.party, d, `${r.kind} ${t[r.kind ?? '']} ${text(r.kind, 'fa')}`, t[r.side || 'sale'], text(r.side || 'sale', 'fa')]
const day = ms => new Date(ms).toLocaleDateString('sv')

export const terms = q => norm(q).split(/\s+/).filter(Boolean)
export const hit = (ws, r, d) => ws.every(w => bag(r, d).some(p => near(w, p)))
export const match = ({ q = '', from, to, side }, ws = terms(q)) => r =>
  (!side || (r.side || 'sale') === side) && (!from || day(r.at) >= from) && (!to || day(r.at) <= to) && (hit(ws, r) || r.descs.some(d => hit(ws, r, d)))
