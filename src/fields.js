const text = { type: 'text', required: true }
const num = { type: 'number', min: 0, required: true, gt: true }

export const fields = {
  description: text,
  qty: num,
  unit: num,
  total: { type: 'number', min: 0, read: true },
  note: text,
  amount: num,
  party: text,
  kind: { required: true, options: ['person', 'company', 'other'] },
  debt: { type: 'number', min: 0, required: true },
  stamp: { type: 'number' },
  ref: { type: 'number' },
}

export const grids = {
  items: { add: 'addRow', tone: 'debit', cols: ['row', 'description', 'qty', 'unit', 'total'] },
  pays: { add: 'addPay', tone: 'credit', cols: ['row', 'note', 'date', 'amount'] },
  entities: { add: 'addEntity', cols: ['row', 'name', 'kind', 'records', 'owed'] },
}

export const roles = { sale: 'buyer', buy: 'seller' }
export const roleOf = e => e?.role || 'buyer'
export const fit = (e, kind, side) => !!e && e.kind === kind && roleOf(e) === roles[side]

const trim = s => `${s ?? ''}`.trim()
export const link = (entities, { kind, side, entity_id, party } = {}) => {
  const free = kind === 'other'
  const typed = trim(party)
  const found = free
    ? typed && entities.filter(e => e.kind === 'other' && roleOf(e) === roles[side] && trim(e.name) === typed).toSorted((a, b) => a.id - b.id)[0]
    : entities.find(e => e.id === +entity_id)
  const entity = found && (free || fit(found, kind, side)) ? found : null
  return { free, entity, name: free ? typed : entity?.name || '' }
}
