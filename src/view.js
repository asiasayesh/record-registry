import brand from '@/brand.js'
import { fields, fit, grids, link as linked, roleOf } from '@/fields.js'
import { date, digits, lang, num, t, toNum, tr, ts, words } from '@/i18n.js'
import { balance, owed, tally } from '@/ledger.js'
import { hit, match, terms } from '@/search.js'

export const h = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt()};`)

const sn = (id) => digits(String(id).padStart(3, '0'))
const tag = (r) => (r.cancelled ? ` · ${t.cancelled}` : '')
const sideOf = (r) => r?.side || 'sale'
const bits = (...xs) => xs.filter(Boolean).join(' · ')
const owe = (r) =>
  !r.cancelled &&
  r.paid > 0 &&
  r.sum > r.paid &&
  `<small data-owe title="${t.rest}">${num(r.sum - r.paid)}</small>`
const link = (
  r,
  title,
  sub,
  cur,
) => `<div class="item"${r.cancelled ? ' data-off' : ''}>
  <a href="#/${r.id}"${r.id === cur ? ' aria-current="page"' : ''}><b>${h(title)}</b><small>${sub}</small><span class="amt"><b data-tone="${sideOf(r) === 'buy' ? 'cost' : 'debit'}">${num(r.sum)}</b>${owe(r) || ''}</span></a>
  <button type="button" data-act="print" data-tone="out" data-id="${r.id}">${t.print}</button>
</div>`

const modes = {
  date: (rows, cur) =>
    Object.entries(Object.groupBy(rows, (r) => date(r.at)))
      .map(
        ([d, rs]) =>
          `<h3>${d}</h3>${rs.map((r) => link(r, r.party, bits(`#${sn(r.id)}`, t[sideOf(r)], r.cancelled && t.cancelled), cur)).join('')}`,
      )
      .join(''),
  desc: (rows, cur, q, ws = terms(q)) =>
    rows
      .flatMap((r) => (r.descs.length ? r.descs : ['']).map((d) => [d, r]))
      .filter(([d, r]) => hit(ws, r, d))
      .toSorted(([a], [b]) => a.localeCompare(b, lang()))
      .map(([d, r]) =>
        link(
          r,
          d,
          bits(
            h(r.party),
            `#${sn(r.id)}`,
            t[sideOf(r)],
            date(r.at),
            r.cancelled && t.cancelled,
          ),
          cur,
        ),
      )
      .join(''),
}

const listing = (html) => html || `<p class="hint">${t.none}</p>`

export const history = ({ list, filter, cur }) =>
  listing(
    modes[filter.mode](list.filter(match(filter)), cur?.id, filter.q ?? ''),
  )

const thead = (k, extra = '', side = 'sale') =>
  `<thead><tr>${grids[k].cols.map((c) => `<th>${ts(side, c)}</th>`).join('')}${extra}</tr></thead>`
const plus =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
const grid = (
  k,
  body,
  cap = '',
  side = 'sale',
  tone = grids[k].tone,
) => `<table class="${k}"${tone ? ` data-tone="${tone}"` : ''}>${cap && `<caption>${cap}</caption>`}${thead(k, '<th></th>', side)}<tbody>${body}</tbody></table>
  ${
    k === 'entities'
      ? `<a class="btn add" href="#/entities/new" aria-label="${t.addEntity}" title="${t.addEntity}">${plus}</a>`
      : `<button type="button" class="add" data-act="row" data-of="${k}"${tone ? ` data-tone="${tone}"` : ''} aria-label="${ts(side, grids[k].add)}" title="${ts(side, grids[k].add)}">${plus}</button>`
  }`

const bit = (k, v) => v && `${t[k]} ${h(digits(v))}`
const line = (html) => html && `<p>${html}</p>`
const head = (r, serial, party, extra = '') => `
  <header>
    <hgroup>
      ${tr(brand.name) ? `<h1>${h(tr(brand.name))}</h1>` : ''}
      ${[
        tr(brand.tagline) && h(tr(brand.tagline)),
        [bit('phone', brand.phone), bit('fax', brand.fax)]
          .filter(Boolean)
          .join(' · '),
        bit('mobile', brand.mobile),
      ]
        .map(line)
        .filter(Boolean)
        .join('')}
    </hgroup>
    <img src="${brand.logo}" alt="">
    ${extra}
    <dl>
      ${[
        [t.serial, serial],
        [t.date, date(r.at)],
      ]
        .map(([dt, dd]) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`)
        .join('')}
    </dl>
  </header>
  ${party}`

const spell = (n) =>
  lang() === 'fa'
    ? `<p><span>${t.words}</span><span>${words(n)} ${t.currency}</span></p>`
    : ''
const cells = (it) =>
  `<tr><td></td><td><bdi>${h(it.description)}</bdi></td><td>${num(toNum(it.qty))}</td><td>${num(it.unit)}</td><td>${num(it.total)}</td></tr>`

export const paper = (r, acts = '', side = sideOf(r)) => `
  <article class="doc">
    ${head(r, `${sn(r.id)}${r.cancelled ? ` <b>${t.cancelled}</b>` : ''}`, `<p class="party">${ts(side, 'party')} ${t[r.kind ?? '']}: <b>${h(r.party)}</b></p>`)}
    <table>${thead('items', '', side)}<tbody>${r.items.map(cells).join('')}</tbody></table>
    <footer>
      <p><span>${t.sum}</span><b>${num(tally(r.items))} ${t.currency}</b></p>
      ${spell(tally(r.items))}
      ${acts}
    </footer>
  </article>`

const dues = (v, keys = Object.keys(v), side = 'sale') =>
  keys
    .map(
      (k) =>
        `<p class="due"><span>${ts(side, k)}</span><output name="${k}" data-owe="${v[k] > 0}"${k === 'paid' ? ' data-tone="credit"' : ''}>${num(v[k])}</output></p>`,
    )
    .join('')

const bar = (r) =>
  [
    !r.cancelled &&
      `<a class="btn" data-tone="edit" href="#/${r.id}/edit">${t.edit}</a>`,
    `<button type="button" data-act="cancel" data-tone="cancel" data-id="${r.id}" aria-pressed="${r.cancelled ? 'true' : 'false'}">${t.cancelled}</button>`,
    `<button type="button" data-act="print" data-tone="out">${t.print}</button>`,
  ]
    .filter(Boolean)
    .join('')
const doc = (r, list, side = sideOf(r)) =>
  paper(
    r,
    `${dues(balance(list, r, r.sum, r.paid), r.entity_id ? undefined : ['paid', 'rest'], side)}<nav class="acts">${bar(r)}</nav>`,
    side,
  )

const req = 'required aria-invalid="false"'
const attr = (name, extra = '') => {
  const f = fields[name] ?? {}
  return [
    f.type === 'number'
      ? `type="text" inputmode="numeric" data-num${String(extra).includes('min=') ? '' : ` min="${f.min ?? 0}"`}`
      : '',
    f.required ? req : '',
    f.read ? 'readonly tabindex="-1"' : '',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}
const show = (name, value) =>
  fields[name]?.type === 'number' && value !== '' && value != null
    ? num(toNum(value))
    : value
const input = (name, value = '', attrs = '') =>
  `<input name="${name}" value="${h(show(name, value))}" dir="auto" ${attrs}>`
const control = (name, value, extra) =>
  input(name, value ?? '', attr(name, extra))
export const opts = (pairs, cur) =>
  pairs
    .map(
      ([v, l]) =>
        `<option value="${h(v)}"${`${v}` === `${cur ?? ''}` ? ' selected' : ''}>${h(l)}</option>`,
    )
    .join('')
export const entitySelect = (entities, kind, side, id) =>
  `<select name="entity" aria-invalid="${kind && !id ? 'true' : 'false'}" aria-label="${ts(side, 'party')}"${kind ? ' required' : ''}>${opts([['', t.pick], ...entities.filter((x) => fit(x, kind, side)).map((x) => [x.id, x.name || t.need])], id ?? '')}</select>`
const tools = (attrs = '') =>
  `<td class="tools"><button type="button" data-act="del" data-tone="del" aria-label="${t.del}"${attrs}>×</button></td>`
const pick = (name, values, cur, act) =>
  `<fieldset class="switch">${values.map((v) => `<label${act ? ` data-act="${name}" data-${name}="${v}"` : ''}><input type="radio" name="${name}" value="${v}"${v === cur ? ' checked' : ''}><span>${t[v]}</span></label>`).join('')}</fieldset>`
const row = (it = {}) =>
  `<tr><td></td>${['description', 'qty', 'unit', 'total'].map((name) => `<td>${control(name, it[name] || '')}</td>`).join('')}${tools()}</tr>`
const pay = ({ stamp = Date.now(), note, amount } = {}) =>
  `<tr><td></td><td><input type="hidden" name="stamp" value="${stamp}">${control('note', note)}</td><td>${date(stamp)}</td><td>${control('amount', amount || '')}</td>${tools()}</tr>`
const ent = (
  e = {},
  list = [],
  n = list.filter((r) => r.entity_id === e.id).length,
  due = owed(list, e.id),
) =>
  `<tr><td>${e.id ? sn(e.id) : ''}</td><td><input type="hidden" name="ref" value="${e.id ?? ''}">${control('party', e.name)}</td><td><select name="kind" ${attr('kind')}>${opts(
    fields.kind.options.map((k) => [k, t[k]]),
    e.kind || 'person',
  )}</select></td><td>${digits(n)}</td><td>${control('debt', (e.debt || 0) + due, `min="${due}"`)}</td>${tools(n && e.name?.trim() && e.kind !== 'other' ? ' disabled' : '')}</tr>`

export const lines = { items: row, pays: pay, entities: ent }

const party = (
  r,
  entities,
  kind = r.kind ?? '',
  side = sideOf(r),
  { free, entity, name } = linked(entities, {
    kind,
    side,
    entity_id: r.entity_id,
    party: r.party,
  }),
) =>
  `<fieldset class="party"><select name="kind" required aria-invalid="${kind ? 'false' : 'true'}" aria-label="${t.kind}">${opts([['', t.kind], ...fields.kind.options.map((k) => [k, t[k]])], kind)}</select>${free ? '' : entitySelect(entities, kind, side, entity?.id)}${input('party', name, `placeholder="${ts(side, 'partyName')}"${free ? ` aria-invalid="${name ? 'false' : 'true'}" title="${name ? '' : t.need}"${name ? '' : ' required'}` : ' disabled'}`)}</fieldset>`

const editor = (
  r,
  list,
  entities,
  side = sideOf(r),
  sum = tally(r.items),
  paid = tally(r.payments, 'amount'),
  base = r.base ?? entities.find((e) => e.id === r.entity_id)?.debt ?? 0,
) => `
  <form id="editor" class="doc" novalidate>
    <input type="hidden" name="at" value="${r.at}">
    <input type="hidden" name="serial" value="${r.id}">
    <input type="hidden" name="fresh" value="${r.fresh ? 1 : ''}">
    ${r.fresh ? '' : `<input type="hidden" name="side" value="${side}">`}
    ${head(r, sn(r.id), party(r, entities, r.kind ?? '', side), r.fresh ? pick('side', ['sale', 'buy'], side) : '')}
    ${grid('items', r.items.map(row).join(''), ts(side, 'items'), side)}
    ${grid('pays', r.payments.map(pay).join(''), ts(side, 'payments'), side)}
    <footer>
      <p><span>${t.sum}</span><output name="sum" data-tone="debit">${num(sum)}</output></p>
      ${dues(balance(list, r, sum, paid, base), undefined, side)}
      <nav class="acts">
        <button type="button" data-act="print" data-tone="out">${t.print}</button>
        <a class="btn" data-tone="cancel" href="#/${r.fresh ? '' : r.id}">${t.cancel}</a>
        <button class="primary">${t.save}</button>
      </nav>
    </footer>
  </form>`

const entry = (role) => `
  <form id="born" class="doc" novalidate>
    ${pick('role', ['buyer', 'seller'], role)}
    <label><span>${t.kind}</span><select name="kind" ${attr('kind')}>${opts(
      fields.kind.options.map((k) => [k, t[k]]),
      'person',
    )}</select></label>
    <label><span>${t.name}</span>${control('party', '', 'autofocus')}</label>
    <label><span>${t.owed}</span>${control('debt', 0)}</label>
    <nav class="acts"><a class="btn" data-tone="cancel" href="#/entities">${t.cancel}</a><button class="primary">${t.save}</button></nav>
  </form>`

const team = (entities, list, role = 'buyer') => `
  <form id="entities" class="doc" novalidate>
    ${pick('role', ['buyer', 'seller'], role)}
    ${grid(
      'entities',
      entities
        .filter((e) => roleOf(e) === role)
        .map((e) => ent(e, list))
        .join(''),
      t.entities,
      role === 'seller' ? 'buy' : 'sale',
    )}
    <nav class="acts"><button type="button" data-act="revert" data-tone="cancel">${t.cancel}</button><button class="primary">${t.save}</button></nav>
  </form>`

const face = (r, row) =>
  `<a href="#/${r.id}"><b>${h(r.party)}</b>${row ? `<small><span>#${sn(r.id)}</span><span>${t[sideOf(r)]}</span><span>${date(r.at)}${tag(r)}</span></small>` : `<small>#${sn(r.id)} · ${t[sideOf(r)]} · ${date(r.at)}${tag(r)}</small>`}<b data-tone="debit">${num(r.sum)}</b></a>`
const tile = (r, row) =>
  `<div class="item"${r.cancelled ? ' data-off' : ''}>${face(r, row)}<button type="button" data-act="print" data-tone="out" data-id="${r.id}">${t.print}</button>${row && !r.cancelled ? `<a class="btn" data-tone="edit" href="#/${r.id}/edit">${t.edit}</a>` : ''}</div>`
const recent = (list) =>
  [
    ...new Set([
      ...list.filter((r) => r.opened).toSorted((a, b) => b.opened - a.opened),
      ...list,
    ]),
  ].slice(0, 3)
const empty = (
  list,
  layout = 'cards',
  top = recent(list),
  rows = layout === 'rows',
) =>
  top.length
    ? `<header><h2>${t.recent}</h2>${pick('layout', ['cards', 'rows'], rows ? 'rows' : 'cards', 1)}</header><nav class="${rows ? 'rows' : 'cards'}">${top.map((r) => tile(r, rows)).join('')}</nav>`
    : `<p class="hint">${t.empty}</p>`
const stack = (rows) =>
  rows.map((r) => paper(r)).join('<hr class="cut">') ||
  `<p class="hint">${t.none}</p>`

const shown = [
  [(s) => s.roster, (s) => team(s.entities, s.list, s.rosterRole ?? 'buyer')],
  [(s) => s.cur, (s) => doc(s.cur, s.list)],
  [(s) => s.span, (s) => stack(s.span)],
  [() => true, (s) => empty(s.list, s.layout ?? 'cards')],
]
const opened = [
  [(s) => s.edit, (s) => editor(s.edit, s.list, s.entities)],
  [(s) => s.born, (s) => entry(s.rosterRole ?? 'buyer')],
  [() => true, () => ''],
]
export const record = (s) => shown.find(([on]) => on(s))[1](s)
export const screen = (s) => opened.find(([on]) => on(s))[1](s)
