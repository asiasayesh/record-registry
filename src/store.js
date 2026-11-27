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

export const save = r => call('tx', [
  ['INSERT INTO records (id, entity_id, party, at) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET entity_id = excluded.entity_id, party = excluded.party', [r.id, r.entity_id, r.entity_id ? null : r.party, r.at]],
  ...['items', 'payments'].map(k => [`DELETE FROM ${k} WHERE record_id = ?`, [r.id]]),
  ...r.items.map((it, n) => ['INSERT INTO items VALUES (?, ?, ?, ?, ?, ?)', [r.id, n, it.description, it.qty, it.unit, it.total]]),
  ...r.payments.map((p, n) => ['INSERT INTO payments VALUES (?, ?, ?, ?, ?)', [r.id, n, p.amount, p.stamp, p.note]]),
])

export const cancel = id => exec('UPDATE records SET cancelled = NOT ifnull(cancelled, 0) WHERE id = ?', id)

export const entities = () => exec('SELECT * FROM entities ORDER BY name').then(rows => rows.map(e => ({ ...e, id: num(e.id), debt: num(e.debt) })))
export const sync = rows => call('tx', [
  ['DELETE FROM entities WHERE id NOT IN (SELECT value FROM json_each(?)) AND id NOT IN (SELECT entity_id FROM records WHERE entity_id NOTNULL)', [JSON.stringify(rows.map(e => e.ref).filter(Boolean))]],
  ...rows.map(e => ['INSERT INTO entities (id, name, kind, debt) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET name = excluded.name, kind = excluded.kind, debt = excluded.debt', [e.ref || null, e.party, e.kind, e.debt]]),
])

export const dump = () => call('dump')
export const load = (bytes, mode) => call('load', bytes, mode)
