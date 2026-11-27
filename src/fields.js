const text = { type: 'text', required: true }
const num = { type: 'number', min: 0, step: 'any', required: true, gt: true }

export const fields = {
  description: text,
  qty: { ...text, gt: true },
  unit: num,
  total: { type: 'number', min: 0, step: 'any', read: true },
  note: text,
  amount: num,
  party: text,
  kind: { type: 'select', required: true, options: ['person', 'company'] },
  debt: { type: 'number', min: 0, step: 'any', required: true },
}

export const grids = {
  items: { add: 'addRow', tone: 'debit', cols: ['row', 'description', 'qty', 'unit', 'total'] },
  pays: { add: 'addPay', tone: 'credit', cols: ['row', 'note', 'date', 'amount'] },
  entities: { add: 'addEntity', cols: ['row', 'name', 'kind', 'records', 'debt'] },
}

export const roles = { sale: 'buyer', buy: 'seller' }
