import brand from '@/brand.js'
import { t, tr, lang, digits, num, date, words } from '@/i18n.js'
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
const meta = r => `#${sn(r.id)} · ${date(r.at)} · ${num(r.sum)}${tag(r)}`

const modes = {
  date: (rows, cur) => Object.entries(Object.groupBy(rows, r => date(r.at)))
    .map(([d, rs]) => `<h3>${d}</h3>${rs.map(r => link(r.id, r.party, `#${sn(r.id)} · ${num(r.sum)}`, cur)).join('')}`)
    .join(''),
  desc: (rows, cur, q, ws = terms(q)) => rows
    .flatMap(r => (r.descs.length ? r.descs : ['']).map(d => [d, r]))
    .filter(([d, r]) => hit(ws, r, d))
    .toSorted(([a], [b]) => a.localeCompare(b, lang()))
    .map(([d, r]) => link(r.id, d, `${h(r.party)} · #${sn(r.id)}`, cur))
    .join(''),
}

const listing = html => html || `<p class="hint">${t.none}</p>`

export const history = ({ list, filter, cur }) => listing(modes[filter.mode](list.filter(match(filter)), cur?.id, filter.q ?? ''))

const grids = {
  items: { add: 'addRow', cols: ['row', 'description', 'qty', 'unit', 'total'] },
  pays: { add: 'addPay', cols: ['row', 'note', 'date', 'amount'] },
  entities: { add: 'addEntity', cols: ['row', 'name', 'kind', 'records', 'debt'] },
}
const thead = (k, extra = '') => `<thead><tr>${grids[k].cols.map(c => `<th>${t[c]}</th>`).join('')}${extra}</tr></thead>`
const plus = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
const grid = (k, body, cap = '') => `<table class="${k}">${cap && `<caption>${cap}</caption>`}${thead(k, '<th></th>')}<tbody>${body}</tbody></table>
  <button type="button" class="add" data-act="row" data-of="${k}" data-tone="go" aria-label="${t[grids[k].add]}" title="${t[grids[k].add]}">${plus}</button>`

const head = (r, serial, party) => `
  <header>
    <hgroup>
      <h1>${tr(brand.name)}</h1>
      <p>${tr(brand.tagline)}</p>
      <p>${t.phone} ${digits(brand.phone)} · ${t.fax} ${digits(brand.fax)}</p>
      <p>${t.mobile} ${digits(brand.mobile)}</p>
    </hgroup>
    <img src="${brand.logo}" alt="">
    <dl>
      <div><dt>${t.serial}</dt><dd>${serial}</dd></div>
      <div><dt>${t.date}</dt><dd>${date(r.at)}</dd></div>
    </dl>
  </header>
  ${party}`

const spell = n => lang() === 'fa' ? `<p><span>${t.words}</span><span>${words(n)} ${t.currency}</span></p>` : ''

const cells = it => `<tr><td></td><td><bdi>${h(it.description)}</bdi></td><td><bdi>${digits(h(it.qty))}</bdi></td><td>${num(it.unit)}</td><td>${num(it.total)}</td></tr>`

export const paper = (r, acts = '') => `
  <article class="doc">
    ${head(r, `${sn(r.id)}${r.cancelled ? ` <b>${t.cancelled}</b>` : ''}`, `<p class="party">${t.party} ${t[r.kind ?? '']}: <b>${h(r.party)}</b></p>`)}
    <table>${thead('items')}<tbody>${r.items.map(cells).join('')}</tbody></table>
    <footer>
      <p><span>${t.sum}</span><b>${num(tally(r.items))} ${t.currency}</b></p>
      ${spell(tally(r.items))}
      ${acts}
    </footer>
  </article>`

export const balance = (list, r, sum, paid) => ({
  paid,
  rest: sum - paid,
  prior: owed(list.filter(x => x.id < r.id), r.entity_id),
  debt: owed(list, r.entity_id, r.id) + (r.cancelled ? 0 : sum - paid),
})

const dues = (v, keys = Object.keys(v)) => keys
  .map(k => `<p class="due"><span>${t[k]}</span><output name="${k}" data-owe="${v[k] > 0}">${num(v[k])}</output></p>`)
  .join('')

const doc = (r, list) => paper(r, `${dues(balance(list, r, r.sum, r.paid), r.entity_id ? undefined : ['paid', 'rest'])}<nav class="acts">${r.cancelled ? '' : `<a class="btn" data-tone="edit" href="#/${r.id}/edit">${t.edit}</a>`}<button type="button" data-act="cancel" data-tone="cancel" data-id="${r.id}" aria-pressed="${r.cancelled ? 'true' : 'false'}">${t.cancelled}</button><button type="button" data-act="print" data-tone="out">${t.print}</button></nav>`)

const kinds = ['person', 'company']
const money = 'type="number" min="0" step="any"'
const input = (name, value = '', attrs = '') => `<input name="${name}" value="${h(value)}" dir="auto" ${attrs}>`
const opts = (pairs, cur) => pairs.map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${h(l)}</option>`).join('')
const del = (attrs = '') => `<td><button type="button" data-act="del" data-tone="del" aria-label="${t.del}"${attrs}>×</button></td>`
const pad = rows => rows.length ? rows : [{}]

const row = (it = {}) => `<tr><td></td>${[
  input('description', it.description),
  input('qty', it.qty),
  input('unit', it.unit || '', money),
  input('total', it.total || '', money),
].map(c => `<td>${c}</td>`).join('')}${del()}</tr>`

const pay = ({ stamp = Date.now(), note, amount } = {}) => `<tr><td></td><td><input type="hidden" name="stamp" value="${stamp}">${input('note', note)}</td><td>${date(stamp)}</td><td>${input('amount', amount || '', money)}</td>${del()}</tr>`

const ent = (e = {}, list = [], n = list.filter(r => r.entity_id === e.id).length) => `<tr><td></td><td><input type="hidden" name="ref" value="${e.id ?? ''}">${input('party', e.name)}</td><td><select name="kind">${opts(kinds.map(k => [k, t[k]]), e.kind)}</select></td><td>${digits(n)}</td><td>${num(owed(list, e.id))}</td>${del(n ? ' disabled' : '')}</tr>`

export const lines = { items: row, pays: pay, entities: ent }

const pick = (entities, cur, g = Object.groupBy(entities, e => e.kind)) => `<select name="entity" required aria-label="${t.party}"><option value="">${t.pick}</option>${kinds.filter(k => g[k]).map(k => `<optgroup label="${t[k]}">${opts(g[k].map(e => [e.id, e.name]), cur)}</optgroup>`).join('')}${opts([['other', t.other]], cur)}</select>`
const party = (r, entities) => `<fieldset class="party">${pick(entities, r.entity_id ?? (r.kind === 'other' ? 'other' : ''))}${input('party', r.entity_id ? '' : r.party, `placeholder="${t.partyName}"`)}<a class="btn" data-tone="edit" href="#/entities">${t.entities}</a></fieldset>`

const editor = (r, list, entities, sum = tally(r.items), paid = tally(r.payments, 'amount')) => `
  <form id="editor" class="doc">
    <input type="hidden" name="at" value="${r.at}">
    <input type="hidden" name="serial" value="${r.id}">
    <input type="hidden" name="fresh" value="${r.fresh ? 1 : ''}">
    ${head(r, sn(r.id), party(r, entities))}
    ${grid('items', pad(r.items).map(row).join(''))}
    ${grid('pays', r.payments.map(pay).join(''), t.payments)}
    <footer>
      <p><span>${t.sum}</span><output name="sum">${num(sum)}</output></p>
      ${dues(balance(list, r, sum, paid))}
      <nav class="acts">
        <button type="button" data-act="print" data-tone="out">${t.print}</button>
        <a class="btn" data-tone="cancel" href="#/${r.fresh ? '' : r.id}">${t.cancel}</a>
        <button class="primary" data-tone="go">${t.save}</button>
      </nav>
    </footer>
  </form>`

const team = (entities, list) => `
  <form id="entities" class="doc">
    ${grid('entities', pad(entities).map(e => ent(e, list)).join(''), t.entities)}
    <nav class="acts"><button class="primary" data-tone="go">${t.save}</button></nav>
  </form>`

const recent = list => [...new Set([...list.filter(r => r.opened).toSorted((a, b) => b.opened - a.opened), ...list])].slice(0, 3)

const empty = (list, top = recent(list)) => top.length
  ? `<h2>${t.recent}</h2><nav class="cards">${top.map(r => link(r.id, r.party, meta(r))).join('')}</nav>`
  : `<p class="hint">${t.empty}</p>`

const stack = rows => rows.map(r => paper(r)).join('<hr class="cut">') || `<p class="hint">${t.none}</p>`

export const record = ({ cur, edit, list, span, roster, entities }) =>
  roster ? team(entities, list) : edit ? editor(edit, list, entities) : cur ? doc(cur, list) : span ? stack(span) : empty(list)
