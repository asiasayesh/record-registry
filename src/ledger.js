export const tally = (xs = [], k = 'total') =>
  xs.reduce((s, x) => s + (x[k] || 0), 0)

export const owed = (list, id, skip) =>
  !id
    ? 0
    : list
        .filter((r) => r.entity_id === id && r.id !== skip && !r.cancelled)
        .reduce((s, r) => s + r.sum - r.paid, 0)

export const balance = (list, r, sum, paid, base = r.base ?? 0) => ({
  paid,
  rest: sum - paid,
  prior:
    base +
    owed(
      list.filter((x) => x.id < r.id),
      r.entity_id,
    ),
  debt: base + owed(list, r.entity_id, r.id) + (r.cancelled ? 0 : sum - paid),
})
