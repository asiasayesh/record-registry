const rows = (db, sql, bind) => db.exec({ sql, bind: bind?.length ? bind : undefined, rowMode: 'object', returnValue: 'resultRows' })
const num = v => v == null ? null : Number(v)
const key = e => `${e.kind ?? ''}\0${e.name ?? ''}`

const putEntity = (db, e, keep) => num(rows(db,
  `INSERT INTO entities (${keep ? 'id, ' : ''}name, kind, debt) VALUES (${keep ? '?, ' : ''}?, ?, ?) RETURNING id`,
  [...keep ? [num(e.id)] : [], e.name, e.kind, e.debt ?? 0],
)[0].id)

const link = (db, entities) => {
  const live = rows(db, 'SELECT id, name, kind FROM entities')
  const byKey = Object.fromEntries(live.map(e => [key(e), num(e.id)]))
  const used = new Set(Object.values(byKey))
  return Object.fromEntries(entities.map(e => {
    const have = byKey[key(e)]
    const next = have ?? putEntity(db, e, !used.has(num(e.id)))
    have && rows(db, 'UPDATE entities SET debt = ? WHERE id = ?', [e.debt ?? 0, have])
    have ?? (byKey[key(e)] = next, used.add(next))
    return [num(e.id), next]
  }))
}

export const read = db => ({
  entities: rows(db, 'SELECT id, name, kind, ifnull(debt, 0) debt FROM entities'),
  records: rows(db, 'SELECT id, entity_id, party, at, opened, cancelled FROM records'),
  items: Object.groupBy(rows(db, 'SELECT record_id, n, description, qty, unit, total FROM items'), r => num(r.record_id)),
  payments: Object.groupBy(rows(db, 'SELECT record_id, n, amount, at, note FROM payments'), r => num(r.record_id)),
})

const put = (db, src, linked, r, id = num(r.id)) => (
  rows(db, `INSERT INTO records (id, entity_id, party, at, opened, cancelled) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET entity_id = excluded.entity_id, party = excluded.party, at = excluded.at, opened = excluded.opened, cancelled = excluded.cancelled`,
    [id, r.entity_id == null ? null : linked[num(r.entity_id)] ?? null, r.party, r.at, r.opened, r.cancelled]),
  rows(db, 'DELETE FROM items WHERE record_id = ?', [id]),
  rows(db, 'DELETE FROM payments WHERE record_id = ?', [id]),
  (src.items[id] ?? []).map(i => rows(db, 'INSERT INTO items VALUES (?, ?, ?, ?, ?, ?)', [id, i.n, i.description, i.qty, i.unit, i.total])),
  (src.payments[id] ?? []).map(p => rows(db, 'INSERT INTO payments VALUES (?, ?, ?, ?, ?)', [id, p.n, p.amount, p.at, p.note]))
)

export const absorb = (db, src, linked = link(db, src.entities)) => src.records.map(r => put(db, src, linked, r))
