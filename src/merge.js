export const rows = (db, sql, bind) => db.exec({ sql, bind: bind?.length ? bind : undefined, rowMode: 'object', returnValue: 'resultRows' })
const num = v => v == null ? null : Number(v)
const key = e => `${e.role ?? 'buyer'}\0${e.kind ?? ''}\0${e.name ?? ''}`

const putEntity = (db, e, keep) => num(rows(db,
  `INSERT INTO entities (${keep ? 'id, ' : ''}name, kind, debt, role) VALUES (${keep ? '?, ' : ''}?, ?, ?, ?) RETURNING id`,
  [...keep ? [num(e.id)] : [], e.name, e.kind, e.debt ?? 0, e.role ?? 'buyer'],
)[0].id)

const link = (db, entities) => {
  const live = rows(db, 'SELECT id, name, kind, role FROM entities')
  const byKey = Object.fromEntries(live.map(e => [key(e), num(e.id)]))
  const used = new Set(Object.values(byKey))
  return Object.fromEntries(entities.map(e => {
    const have = byKey[key(e)]
    const next = have ?? putEntity(db, e, !used.has(num(e.id)))
    have && rows(db, 'UPDATE entities SET debt = ?, role = ? WHERE id = ?', [e.debt ?? 0, e.role ?? 'buyer', have])
    have ?? (byKey[key(e)] = next, used.add(next))
    return [num(e.id), next]
  }))
}

export const read = db => ({
  entities: rows(db, `SELECT id, name, kind, ifnull(debt, 0) debt, ifnull(role, 'buyer') role FROM entities`),
  records: rows(db, `SELECT id, entity_id, party, at, opened, cancelled, ifnull(side, 'sale') side FROM records`),
  items: Object.groupBy(rows(db, 'SELECT record_id, n, description, qty, unit, total FROM items'), r => num(r.record_id)),
  payments: Object.groupBy(rows(db, 'SELECT record_id, n, amount, at, note FROM payments'), r => num(r.record_id)),
})

const put = (db, src, linked, r, id = num(r.id)) => (
  rows(db, `INSERT INTO records (id, entity_id, party, at, opened, cancelled, side) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET entity_id = excluded.entity_id, party = excluded.party, at = excluded.at, opened = excluded.opened, cancelled = excluded.cancelled, side = excluded.side`,
    [id, r.entity_id == null ? null : linked[num(r.entity_id)] ?? null, r.party, r.at, r.opened, r.cancelled, r.side ?? 'sale']),
  rows(db, 'DELETE FROM items WHERE record_id = ?', [id]),
  rows(db, 'DELETE FROM payments WHERE record_id = ?', [id]),
  (src.items[id] ?? []).map(i => rows(db, 'INSERT INTO items VALUES (?, ?, ?, ?, ?, ?)', [id, i.n, i.description, i.qty, i.unit, i.total])),
  (src.payments[id] ?? []).map(p => rows(db, 'INSERT INTO payments VALUES (?, ?, ?, ?, ?)', [id, p.n, p.amount, p.at, p.note]))
)

export const absorb = (db, src, linked = link(db, src.entities)) => src.records.map(r => put(db, src, linked, r))

const linkSql = `
DROP TABLE IF EXISTS other_keep;
UPDATE entities SET name = trim(name) WHERE kind = 'other' AND name IS NOT NULL AND name != trim(name);
CREATE TEMP TABLE other_keep AS
SELECT min(id) id, name, ifnull(role, 'buyer') role, sum(ifnull(debt, 0)) debt
FROM entities
WHERE kind = 'other' AND name IS NOT NULL AND trim(name) != ''
GROUP BY name, ifnull(role, 'buyer');
UPDATE entities SET debt = (SELECT debt FROM other_keep WHERE other_keep.id = entities.id)
WHERE id IN (SELECT id FROM other_keep);
UPDATE records SET entity_id = (
  SELECT k.id FROM other_keep k
  JOIN entities cur ON cur.id = records.entity_id
  WHERE cur.kind = 'other' AND cur.name = k.name AND ifnull(cur.role, 'buyer') = k.role
)
WHERE entity_id IN (SELECT id FROM entities WHERE kind = 'other' AND name IS NOT NULL AND trim(name) != '');
DELETE FROM entities
WHERE kind = 'other' AND name IS NOT NULL AND trim(name) != ''
AND id NOT IN (SELECT id FROM other_keep);
DROP TABLE other_keep;`

const adoptSql = `
INSERT INTO entities (name, kind, debt, role)
SELECT DISTINCT trim(r.party), 'other', 0,
  CASE ifnull(r.side, 'sale') WHEN 'buy' THEN 'seller' ELSE 'buyer' END
FROM records r
WHERE r.entity_id IS NULL AND r.party IS NOT NULL AND trim(r.party) != ''
AND NOT EXISTS (
  SELECT 1 FROM entities e
  WHERE e.kind = 'other' AND e.name = trim(r.party)
  AND ifnull(e.role, 'buyer') = CASE ifnull(r.side, 'sale') WHEN 'buy' THEN 'seller' ELSE 'buyer' END
);
UPDATE records SET entity_id = (
  SELECT e.id FROM entities e
  WHERE e.kind = 'other' AND e.name = trim(records.party)
  AND ifnull(e.role, 'buyer') = CASE ifnull(records.side, 'sale') WHEN 'buy' THEN 'seller' ELSE 'buyer' END
  ORDER BY e.id LIMIT 1
)
WHERE entity_id IS NULL AND party IS NOT NULL AND trim(party) != '';`

export const linkOthers = db => db.exec(linkSql)
export const adoptOthers = db => db.exec(adoptSql)
