const text = { type: 'text', required: true }
const num = { type: 'number', min: 0, required: true, gt: true }

export const fields = {
  description: text,
  qty: { ...text, gt: true },
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
export const fit = (e, kind, side) => e.kind === kind && roleOf(e) === roles[side]
