import { fields, link } from '@/fields.js'
import { ascii, grouped, num, t, toNum } from '@/i18n.js'
import { balance } from '@/ledger.js'
import { entityOpts, entitySelect } from '@/view.js'

const origin = {}
const live = (form) =>
  JSON.stringify(
    [...form.querySelectorAll('input, select')].map((i) =>
      i.type === 'radio'
        ? `${i.name}:${i.value}:${i.checked}`
        : `${i.name}=${i.value}`,
    ),
  )
export const dirty = (form) =>
  form
    ?.querySelector('button.primary')
    ?.toggleAttribute('data-dirty', live(form) !== origin[form.id]?.json)
export const forget = (id) => (origin[id] = null)
export const pin = (form) => {
  const key =
    form.id === 'editor' && `e:${form.serial.value}:${form.fresh.value}`
  if (!key || origin[form.id]?.key !== key)
    origin[form.id] = { key, json: live(form) }
  dirty(form)
}

const cell = (tr, name) => tr.querySelector(`[name=${name}]`)
const rows = (form, k) => [...form.querySelectorAll(`.${k} tbody tr`)]
const cast = (name, v) => (fields[name]?.type === 'number' ? toNum(v) : v)
const item = (tr) =>
  Object.fromEntries(
    [...tr.querySelectorAll('input, select')].map((i) => [
      i.name,
      cast(i.name, i.value.trim()),
    ]),
  )
export const entries = (form, k) => rows(form, k).map(item)
const sideOf = (form) => form.side?.value || 'sale'
const tied = (form, entities) =>
  link(entities, {
    kind: form.kind.value,
    side: sideOf(form),
    entity_id: toNum(form.entity?.value),
    party: form.party.value,
  })

export const read = (
  form,
  { entities },
  kind = form.kind.value,
  side = sideOf(form),
  hit = tied(form, entities),
) => ({
  id: toNum(form.serial.value),
  entity_id: hit.entity?.id ?? null,
  party: hit.name,
  kind,
  side,
  at: +form.at.value,
  fresh: !!form.fresh.value,
  items: entries(form, 'items').filter((i) => i.description || i.total),
  payments: entries(form, 'pays').filter((p) => p.amount),
})

const auto = (
  tr,
  n = toNum(cell(tr, 'qty').value) * toNum(cell(tr, 'unit').value),
) => (cell(tr, 'total').value = n ? num(n) : '')
const sumOf = (form, k, name) =>
  rows(form, k).reduce((s, tr) => s + toNum(cell(tr, name).value), 0)
const put = (out, v) => {
  out.value = num(v)
  out.dataset.owe = v > 0
}
const cap = (form, sum, paid) =>
  rows(form, 'pays')
    .map((tr) => cell(tr, 'amount'))
    .map((i) => (i.max = Math.max(0, sum - paid + toNum(i.value))))

export const recalc = (
  form,
  { list, entities },
  sum = sumOf(form, 'items', 'total'),
  paid = sumOf(form, 'pays', 'amount'),
  hit = tied(form, entities),
) => {
  cap(form, sum, paid)
  Object.entries({
    sum,
    ...balance(
      list,
      { id: toNum(form.serial.value), entity_id: hit.entity?.id ?? null },
      sum,
      paid,
      hit.entity?.debt,
    ),
  }).map(([k, v]) => put(form[k], v))
}

export const controls = (root) => [
  ...root.querySelectorAll('input:not([type=hidden]):not([readonly]), select'),
]
const empty = (i) =>
  fields[i.name]?.gt ? !(toNum(i.value) > 0) : !i.value.trim()
const span = (i) =>
  i.matches?.('[data-num]') &&
  i.value !== '' &&
  ((i.max !== '' && toNum(i.value) > +i.max) ||
    (i.min !== '' && toNum(i.value) < +i.min))
export const hint = (i) => {
  if (!i?.setCustomValidity) return
  i.setCustomValidity((i.required && empty(i)) || span(i) ? t.need : '')
  i.ariaInvalid = `${!i.validity.valid}`
  i.title = i.validity.valid ? '' : t.need
}
export const gate = (root) => {
  const els = controls(root)
  els.map(hint)
  return els.every((i) => i.validity.valid || i.reportValidity())
}
const relax = (el) =>
  ['editor', 'entities', 'born'].includes(el.form?.id) && hint(el)

const slot = (form, entities, kind, side, id) => {
  if (!form.entity)
    return form.kind.insertAdjacentHTML(
      'afterend',
      entitySelect(entities, kind, side, id),
    )
  form.entity.innerHTML = entityOpts(entities, kind, side, id)
  form.entity.required = !!kind
}

const tune = (
  form,
  state,
  kind = form.kind.value,
  side = sideOf(form),
  hit = tied(form, state.entities),
) => {
  if (hit.free) form.entity?.remove()
  if (!hit.free) slot(form, state.entities, kind, side, hit.entity?.id ?? '')
  form.party.disabled = !hit.free
  if (!hit.free) form.party.value = hit.name
  form.party.required = hit.free
  hint(form.entity)
  hint(form.party)
}

const edit = ({ target }, state) => {
  if (['kind', 'side', 'entity'].includes(target.name)) tune(target.form, state)
  if (target.name === 'side') {
    state.edit = read(target.form, state)
    return
  }
  if (['qty', 'unit'].includes(target.name)) auto(target.closest('tr'))
  recalc(target.form, state)
}

const place = (
  el,
  next,
  keep = ascii(el.value.slice(0, el.selectionStart ?? 0)).replace(
    /\D/g,
    '',
  ).length,
  seen = { n: 0 },
  at = [...next].findIndex((c) => /\d/.test(ascii(c)) && ++seen.n === keep),
) => {
  const caret = keep ? (at < 0 ? next.length : at + 1) : 0
  el.value = next
  el.selectionStart = caret
  el.selectionEnd = caret
}
const mask = (el) =>
  el.matches?.('input[data-num]:not([readonly])') &&
  grouped(el.value) !== el.value &&
  place(el, grouped(el.value))
export const beforeDigits = (e) =>
  e.target.matches?.('input[data-num]:not([readonly])') &&
  e.data &&
  !/delete|history/i.test(e.inputType) &&
  ![...e.data].some((c) => /[\d۰-۹٠-٩٫.]/.test(c)) &&
  e.preventDefault()
export const typed = (e, state) => {
  mask(e.target)
  if (e.target.form?.id === 'editor') edit(e, state)
  relax(e.target)
  if (e.target.name === 'role') return
  dirty(e.target.form)
}
