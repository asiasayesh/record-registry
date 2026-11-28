import brand from '@/brand.js'
import { fields, grids, fit, roleOf } from '@/fields.js'
import { t, tr, ts, lang, digits, num, date, words } from '@/i18n.js'
import { match, hit, terms } from '@/search.js'

export const h = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt()};`)

const tally = (xs = [], k = 'total') => xs.reduce((s, x) => s + (x[k] || 0), 0)
export const owed = (list, id, skip) => !id ? 0 : list.filter(r => r.entity_id === id && r.id !== skip && !r.cancelled).reduce((s, r) => s + r.sum - r.paid, 0)

const sn = id => digits(String(id).padStart(3, '0'))
const tag = r => r.cancelled ? ` · ${t.cancelled}` : ''
const link = (id, title, sub, cur) => `<div class="item">
  <a href="#/${id}"${id === cur ? ' aria-current="page"' : ''}><b>${h(title)}</b><small>${sub}</small></a>
  <button type="button" data-act="print" data-tone="out" data-id="${id}">${t.print}</button>
</div>`
const meta = r => `#${sn(r.id)} · ${t[sideOf(r)]} · ${date(r.at)} · ${num(r.sum)}${tag(r)}`
const sideOf = r => r?.side || 'sale'

const modes = {
  date: (rows, cur) => Object.entries(Object.groupBy(rows, r => date(r.at)))
    .map(([d, rs]) => `<h3>${d}</h3>${rs.map(r => link(r.id, r.party, `#${sn(r.id)} · ${t[sideOf(r)]} · ${num(r.sum)}`, cur)).join('')}`)
    .join(''),
  desc: (rows, cur, q, ws = terms(q)) => rows
    .flatMap(r => (r.descs.length ? r.descs : ['']).map(d => [d, r]))
    .filter(([d, r]) => hit(ws, r, d))
    .toSorted(([a], [b]) => a.localeCompare(b, lang()))
    .map(([d, r]) => link(r.id, d, `${h(r.party)} · #${sn(r.id)} · ${t[sideOf(r)]}`, cur))
    .join(''),
}

const listing = html => html || `<p class="hint">${t.none}</p>`

export const history = ({ list, filter, cur }) => listing(modes[filter.mode](list.filter(match(filter)), cur?.id, filter.q ?? ''))

const thead = (k, extra = '', side = 'sale') => `<thead><tr>${grids[k].cols.map(c => `<th>${ts(side, c)}</th>`).join('')}${extra}</tr></thead>`
const plus = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
const grid = (k, body, cap = '', side = 'sale', tone = grids[k].tone) => `<table class="${k}"${tone ? ` data-tone="${tone}"` : ''}>${cap && `<caption>${cap}</caption>`}${thead(k, '<th></th>', side)}<tbody>${body}</tbody></table>
  ${k === 'entities'
    ? `<a class="btn add" href="#/entities/new" aria-label="${t.addEntity}" title="${t.addEntity}">${plus}</a>`
    : `<button type="button" class="add" data-act="row" data-of="${k}"${tone ? ` data-tone="${tone}"` : ''} aria-label="${ts(side, grids[k].add)}" title="${ts(side, grids[k].add)}">${plus}</button>`}`

const head = (r, serial, party, extra = '') => `
  <header>
    <hgroup>
      <h1>${tr(brand.name)}</h1>
      <p>${tr(brand.tagline)}</p>
      <p>${t.phone} ${digits(brand.phone)} · ${t.fax} ${digits(brand.fax)}</p>
      <p>${t.mobile} ${digits(brand.mobile)}</p>
    </hgroup>
    <img src="${brand.logo}" alt="">
    ${extra}
    <dl>
      <div><dt>${t.serial}</dt><dd>${serial}</dd></div>
      <div><dt>${t.date}</dt><dd>${date(r.at)}</dd></div>
    </dl>
  </header>
  ${party}`

const spell = n => lang() === 'fa' ? `<p><span>${t.words}</span><span>${words(n)} ${t.currency}</span></p>` : ''
const cells = it => `<tr><td></td><td><bdi>${h(it.description)}</bdi></td><td><bdi>${digits(h(it.qty))}</bdi></td><td>${num(it.unit)}</td><td>${num(it.total)}</td></tr>`

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

export const balance = (list, r, sum, paid, base = r.base ?? 0) => ({
  paid,
  rest: sum - paid,
  prior: base + owed(list.filter(x => x.id < r.id), r.entity_id),
  debt: base + owed(list, r.entity_id, r.id) + (r.cancelled ? 0 : sum - paid),
})

const dues = (v, keys = Object.keys(v), side = 'sale') => keys
  .map(k => `<p class="due"><span>${ts(side, k)}</span><output name="${k}" data-owe="${v[k] > 0}"${k === 'paid' ? ' data-tone="credit"' : ''}>${num(v[k])}</output></p>`)
  .join('')

const doc = (r, list, side = sideOf(r)) => paper(r, `${dues(balance(list, r, r.sum, r.paid), r.entity_id ? undefined : ['paid', 'rest'], side)}<nav class="acts">${r.cancelled ? '' : `<a class="btn" data-tone="edit" href="#/${r.id}/edit">${t.edit}</a>`}<button type="button" data-act="cancel" data-tone="cancel" data-id="${r.id}" aria-pressed="${r.cancelled ? 'true' : 'false'}">${t.cancelled}</button><button type="button" data-act="print" data-tone="out">${t.print}</button></nav>`, side)

const req = 'required aria-invalid="false"'
const attr = (name, extra = '') => {
  const f = fields[name] ?? {}
  return [f.type === 'number' ? `type="number" step="any"${String(extra).includes('min=') ? '' : ` min="${f.min ?? 0}"`}` : '', f.required ? req : '', f.read ? 'readonly tabindex="-1"' : '', extra].filter(Boolean).join(' ')
}
const input = (name, value = '', attrs = '') => `<input name="${name}" value="${h(value)}" dir="auto" ${attrs}>`
const control = (name, value, extra) => input(name, value ?? '', attr(name, extra))
export const opts = (pairs, cur) => pairs.map(([v, l]) => `<option value="${h(v)}"${`${v}` === `${cur ?? ''}` ? ' selected' : ''}>${h(l)}</option>`).join('')
const tools = (attrs = '') => `<td class="tools"><button type="button" data-act="del" data-tone="del" aria-label="${t.del}"${attrs}>×</button></td>`
const pick = (name, values, cur) => `<fieldset class="switch">${values.map(v => `<label><input type="radio" name="${name}" value="${v}"${v === cur ? ' checked' : ''}><span>${t[v]}</span></label>`).join('')}</fieldset>`
const row = (it = {}) => `<tr><td></td>${['description', 'qty', 'unit', 'total'].map(name => `<td>${control(name, it[name] || '')}</td>`).join('')}${tools()}</tr>`
const pay = ({ stamp = Date.now(), note, amount } = {}) => `<tr><td></td><td><input type="hidden" name="stamp" value="${stamp}">${control('note', note)}</td><td>${date(stamp)}</td><td>${control('amount', amount || '')}</td>${tools()}</tr>`
const ent = (e = {}, list = [], n = list.filter(r => r.entity_id === e.id).length, due = owed(list, e.id)) => `<tr><td>${e.id ? sn(e.id) : ''}</td><td><input type="hidden" name="ref" value="${e.id ?? ''}">${control('party', e.name)}</td><td><select name="kind" ${attr('kind')}>${opts(fields.kind.options.map(k => [k, t[k]]), e.kind || 'person')}</select></td><td>${digits(n)}</td><td>${control('debt', (e.debt || 0) + due, `min="${due}"`)}</td>${tools(n && e.name?.trim() ? ' disabled' : '')}</tr>`

export const lines = { items: row, pays: pay, entities: ent }

const party = (r, entities, kind = r.kind ?? '', side = sideOf(r), e = entities.find(x => x.id === r.entity_id), name = r.party || e?.name || '', free = kind === 'other') => `<fieldset class="party"><select name="kind" required aria-invalid="${kind ? 'false' : 'true'}" aria-label="${t.kind}">${opts([['', t.kind], ...fields.kind.options.map(k => [k, t[k]])], kind)}</select><select name="entity" aria-invalid="${kind && !free && !e ? 'true' : 'false'}" aria-label="${ts(side, 'party')}"${kind && !free ? ' required' : ''}>${opts([['', t.pick], ...entities.filter(x => fit(x, kind, side)).map(x => [x.id, x.name || t.need])], r.entity_id ?? '')}</select>${input('party', free || e ? name : '', `placeholder="${ts(side, 'partyName')}"${free ? ` aria-invalid="${name ? 'false' : 'true'}" title="${name ? '' : t.need}"${name ? '' : ' required'}` : ' disabled'}`)}</fieldset>`

const editor = (r, list, entities, side = sideOf(r), sum = tally(r.items), paid = tally(r.payments, 'amount'), base = r.base ?? entities.find(e => e.id === r.entity_id)?.debt ?? 0) => `
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

const entry = role => `
  <form id="born" class="doc" novalidate>
    ${pick('role', ['buyer', 'seller'], role)}
    <label><span>${t.kind}</span><select name="kind" ${attr('kind')}>${opts(fields.kind.options.map(k => [k, t[k]]), 'person')}</select></label>
    <label><span>${t.name}</span>${control('party', '', 'autofocus')}</label>
    <label><span>${t.owed}</span>${control('debt', 0)}</label>
    <nav class="acts"><a class="btn" data-tone="cancel" href="#/entities">${t.cancel}</a><button class="primary">${t.save}</button></nav>
  </form>`

const team = (entities, list, role = 'buyer') => `
  <form id="entities" class="doc" novalidate>
    ${pick('role', ['buyer', 'seller'], role)}
    ${grid('entities', entities.filter(e => roleOf(e) === role).map(e => ent(e, list)).join(''), t.entities, role === 'seller' ? 'buy' : 'sale')}
    <nav class="acts"><button class="primary">${t.save}</button></nav>
  </form>`

const recent = list => [...new Set([...list.filter(r => r.opened).toSorted((a, b) => b.opened - a.opened), ...list])].slice(0, 3)
const empty = (list, top = recent(list)) => top.length
  ? `<h2>${t.recent}</h2><nav class="cards">${top.map(r => link(r.id, r.party, meta(r))).join('')}</nav>`
  : `<p class="hint">${t.empty}</p>`
const stack = rows => rows.map(r => paper(r)).join('<hr class="cut">') || `<p class="hint">${t.none}</p>`

export const record = ({ cur, list, span, roster, entities, rosterRole = 'buyer' }) =>
  roster ? team(entities, list, rosterRole) : cur ? doc(cur, list) : span ? stack(span) : empty(list)

export const screen = ({ edit, list, entities, born, rosterRole = 'buyer' }) => edit ? editor(edit, list, entities) : born ? entry(rosterRole) : ''
