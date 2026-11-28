import { roles } from '@/fields.js'
import { t } from '@/i18n.js'

const worker = new Worker(new URL('./db.js', import.meta.url), { type: 'module' })
addEventListener('pagehide', () => worker.postMessage({ op: 'pause' }))
addEventListener('pageshow', e => e.persisted && worker.postMessage({ op: 'resume' }))
const pending = new Map()

worker.onmessage = ({ data: { id, value, error } }) => (
  pending.get(id)[error ? 1 : 0](error ? new Error(error) : value),
  pending.delete(id)
)

const call = (op, ...args) => {
  const id = crypto.randomUUID()
  const { promise, resolve, reject } = Promise.withResolvers()
  pending.set(id, [resolve, reject])
  worker.postMessage({ id, op, args })
  return promise
}

const exec = (sql, ...bind) => call('exec', sql, bind)
const num = v => Number(v) || 0
const row = r => ({ ...r, id: num(r.id), entity_id: r.entity_id == null ? null : Number(r.entity_id), sum: num(r.sum), paid: num(r.paid), base: num(r.base) })

const ledger = `SELECT r.*, coalesce(e.name, r.party) party, coalesce(e.kind, 'other') kind, coalesce(e.debt, 0) base,
  (SELECT coalesce(sum(total), 0) FROM items WHERE record_id = r.id) sum,
  (SELECT coalesce(sum(amount), 0) FROM payments WHERE record_id = r.id) paid,
  (SELECT group_concat(description, char(31)) FROM items WHERE record_id = r.id) descs
  FROM records r LEFT JOIN entities e ON e.id = r.entity_id`

export const list = () => exec(`${ledger} ORDER BY r.at DESC`)
  .then(rows => rows.map(r => ({ ...row(r), descs: (r.descs ?? '').split('\x1f').filter(Boolean) })))

export const get = async id => {
  const [r] = await exec(`${ledger} WHERE r.id = ?`, id)
  return r && {
    ...row(r),
    items: await exec('SELECT * FROM items WHERE record_id = ? ORDER BY n', id),
    payments: await exec('SELECT amount, at stamp, note FROM payments WHERE record_id = ? ORDER BY n', id),
  }
}

export const next = () => exec('SELECT coalesce(max(id), 0) + 1 id FROM records').then(([r]) => num(r.id))
export const touch = id => exec('UPDATE records SET opened = ? WHERE id = ?', Date.now(), id)

const recordSql = `INSERT INTO records (id, entity_id, party, at, side) VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET entity_id = excluded.entity_id, party = excluded.party, side = excluded.side`
const otherSql = `INSERT INTO records (id, entity_id, party, at, side) VALUES (?, (SELECT id FROM entities WHERE kind = 'other' AND ifnull(role, 'buyer') = ? AND trim(name) = ? ORDER BY id LIMIT 1), ?, ?, ?) ON CONFLICT (id) DO UPDATE SET entity_id = excluded.entity_id, party = excluded.party, side = excluded.side`
const ensureSql = `INSERT INTO entities (name, kind, debt, role) SELECT ?, 'other', 0, ? WHERE NOT EXISTS (SELECT 1 FROM entities WHERE kind = 'other' AND ifnull(role, 'buyer') = ? AND trim(name) = ?)`

export const save = async r => {
  const want = roles[r.side || 'sale']
  const other = r.kind === 'other' && r.party
  const [hit] = other || !r.entity_id ? [] : await exec(`SELECT ifnull(role, 'buyer') role FROM entities WHERE id = ?`, r.entity_id)
  if (hit && hit.role !== want) throw new Error(t.mismatch)
  const record = other
    ? [otherSql, [r.id, want, r.party, r.party, r.at, r.side || 'sale']]
    : [recordSql, [r.id, r.entity_id, r.party || null, r.at, r.side || 'sale']]
  return call('tx', [
    ...(other ? [[ensureSql, [r.party, want, want, r.party]]] : []),
    record,
    ...(!other && r.entity_id && r.party ? [['UPDATE entities SET name = ? WHERE id = ?', [r.party, r.entity_id]]] : []),
    ...['items', 'payments'].map(k => [`DELETE FROM ${k} WHERE record_id = ?`, [r.id]]),
    ...r.items.map((it, n) => ['INSERT INTO items VALUES (?, ?, ?, ?, ?, ?)', [r.id, n, it.description, it.qty, it.unit, it.total]]),
    ...r.payments.map((p, n) => ['INSERT INTO payments VALUES (?, ?, ?, ?, ?)', [r.id, n, p.amount, p.stamp, p.note]]),
  ])
}

export const cancel = id => exec('UPDATE records SET cancelled = NOT ifnull(cancelled, 0) WHERE id = ?', id)

export const entities = () => exec('SELECT * FROM entities ORDER BY name').then(rows => rows.map(e => ({ ...e, id: num(e.id), debt: num(e.debt) })))
export const sync = (rows, role = 'buyer') => {
  const keep = JSON.stringify(rows.map(e => e.ref).filter(Boolean))
  const gone = `ifnull(role, 'buyer') = ? AND id NOT IN (SELECT value FROM json_each(?))`
  return call('tx', [
    [`UPDATE records SET party = coalesce(nullif(party, ''), (SELECT name FROM entities WHERE id = records.entity_id)), entity_id = NULL WHERE entity_id IN (SELECT id FROM entities WHERE ${gone})`, [role, keep]],
    [`DELETE FROM entities WHERE ${gone}`, [role, keep]],
    ...rows.map(e => ['INSERT INTO entities (id, name, kind, debt, role) VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET name = excluded.name, kind = excluded.kind, debt = excluded.debt, role = excluded.role', [e.ref || null, e.party, e.kind, e.debt, e.role || role]]),
  ])
}
export const put = e => exec('INSERT INTO entities (name, kind, debt, role) VALUES (?, ?, ?, ?)', e.name, e.kind, e.debt ?? 0, e.role || 'buyer')
export const wipe = () => call('tx', ['payments', 'items', 'records', 'entities'].map(k => [`DELETE FROM ${k}`]))
export const drop = id => call('tx', [
  [`UPDATE records SET party = coalesce(nullif(party, ''), (SELECT name FROM entities WHERE id = records.entity_id)), entity_id = NULL WHERE entity_id = ?`, [id]],
  [`DELETE FROM entities WHERE id = ?`, [id]],
])

export const dump = () => call('dump')
export const load = (bytes, mode) => call('load', bytes, mode)
