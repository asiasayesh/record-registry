import '@/style.css'
import '@/doc.css'
import '@/print.css'
import { t, setLang, lang, ascii, toNum, num } from '@/i18n.js'
import { fields, fit } from '@/fields.js'
import { h, history, record, screen, lines, paper, balance, owed, opts } from '@/view.js'
import * as db from '@/store.js'

const $ = s => document.querySelector(s)

const regions = { list: history, record, screen }
const cache = {}
const origin = {}
const live = form => JSON.stringify([...form.querySelectorAll('input, select')].map(i => i.type === 'radio' ? `${i.name}:${i.value}:${i.checked}` : `${i.name}=${i.value}`))
const dirty = form => form?.querySelector('button.primary')?.toggleAttribute('data-dirty', live(form) !== origin[form.id]?.json)
const pin = (form, key = form.id === 'editor' ? `e:${form.serial.value}:${form.fresh.value}` : 'entities') => (
  (form.id === 'entities' || form.id === 'born' || origin[form.id]?.key !== key) && (origin[form.id] = { key, json: live(form) }),
  dirty(form)
)
const mount = (id, html) => {
  const el = $(`#${id}`)
  const form = (el.innerHTML = cache[id] = html, el.querySelector('#editor, #entities, #born'))
  id === 'screen' && (el.ariaLabel = state.born ? t.addEntity : state.edit?.fresh ? t.new : t.edit, html ? el.open || (el.showModal(), form?.querySelector('[autofocus], [name=kind]')?.focus()) : (origin.editor = null, el.close()))
  form && (pin(form), controls(form).map(hint))
}
const paint = () => Object.entries(regions)
  .map(([id, view]) => [id, view(state)])
  .filter(([id, html]) => cache[id] !== html)
  .map(([id, html]) => mount(id, html))

const schedule = () => schedule.id ||= requestAnimationFrame(() => (schedule.id = 0, paint()))
const ticket = { n: 0 }
const from = (n, d = new Date()) => d.setDate(d.setHours(0, 0, 0, 0) && d.getDate() - n + 1)
const docs = days => (mine => Promise.all(+days > 0 ? state.list.filter(r => r.at >= from(+days)).map(r => db.get(r.id)) : []).then(rows => mine === ticket.n && rows.filter(Boolean)))(++ticket.n)
const show = async () => location.hash === '#/span' && (rows => location.hash === '#/span' && rows && (state.span = rows))(await docs(state.filter.days))
const state = new Proxy({ list: [], entities: [], filter: { mode: 'date', days: '7' }, cur: null, edit: null, roster: false, rosterRole: 'buyer' }, {
  set: (o, k, v) => (o[k] = v, schedule(), true),
})

const reload = async () => ([state.list, state.entities] = await Promise.all([db.list(), db.entities()]))
const blank = id => ({ id, fresh: true, entity_id: null, side: 'sale', at: Date.now(), items: [], payments: [] })

const routes = {
  '': async () => ({ cur: null, edit: null, span: null }),
  entities: async () => (await reload(), { cur: null, edit: null, span: null }),
  new: async () => ({ edit: blank(await db.next()), span: null }),
  span: async () => (await show(), { cur: null, edit: null }),
  edit: async id => db.get(id).then(r => ({ cur: r ?? null, edit: r && !r.cancelled ? r : null, span: null })),
  view: async id => (await db.touch(id), { cur: await db.get(id), edit: null, span: null, list: await db.list() }),
}

const route = async () => {
  const [, id = '', act = 'view'] = location.hash.split('/')
  Object.assign(state, await (routes[id] ?? routes[act])(id), { roster: id === 'entities', born: id === 'entities' && act === 'new' })
  $('#span').ariaCurrent = id === 'span' ? 'page' : null
  $(`#bar a[data-t="records"]`).ariaCurrent = id === 'entities' || id === 'new' ? null : 'page'
  $(`#bar a[href="#/entities"]`).ariaCurrent = id === 'entities' ? 'page' : null
}

const cell = (tr, name) => tr.querySelector(`[name=${name}]`)
const rows = (form, k) => [...form.querySelectorAll(`.${k} tbody tr`)]
const cast = (name, v) => fields[name]?.type === 'number' ? toNum(v) : v
const item = tr => Object.fromEntries([...tr.querySelectorAll('input, select')].map(i => [i.name, cast(i.name, i.value.trim())]))
const ent = id => state.entities.find(e => e.id === id) ?? {}
const sideOf = form => form.side?.value || 'sale'

const read = (form, kind = form.kind.value, side = sideOf(form), e = ent(toNum(form.entity.value)), hit = fit(e, kind, side), typed = form.party.value.trim()) => ({
  id: toNum(form.serial.value),
  entity_id: hit ? e.id : null,
  party: typed || (hit ? e.name : ''),
  kind,
  side,
  at: +form.at.value,
  fresh: !!form.fresh.value,
  items: rows(form, 'items').map(item).filter(i => i.description || i.total),
  payments: rows(form, 'pays').map(item).filter(p => p.amount),
})

const auto = tr => cell(tr, 'total').value = toNum(cell(tr, 'qty').value) * toNum(cell(tr, 'unit').value) || ''
const tally = (form, k, name) => rows(form, k).reduce((s, tr) => s + toNum(cell(tr, name).value), 0)
const put = (out, v) => (out.value = num(v), out.dataset.owe = v > 0)
const cap = (form, sum, paid) => rows(form, 'pays').map(tr => cell(tr, 'amount')).map(i => i.max = Math.max(0, sum - paid + toNum(i.value)))
const recalc = (form, sum = tally(form, 'items', 'total'), paid = tally(form, 'pays', 'amount')) => (
  cap(form, sum, paid),
  Object.entries({ sum, ...balance(state.list, { id: toNum(form.serial.value), entity_id: toNum(form.entity.value) }, sum, paid, ent(toNum(form.entity.value)).debt) })
    .map(([k, v]) => put(form[k], v))
)
const sheet = r => r && ($('#sheet').innerHTML = paper(r))
const draft = (form = $('#editor')) => form && read(form)

const download = (bytes, name) => Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([bytes])), download: name }).click()

const restore = async (file, mode) => file && confirm(t[`${mode}Ask`]) && (
  await db.load(new Uint8Array(await file.arrayBuffer()), mode),
  await reload(),
  $('#settings').close(),
  location.hash = '#/'
)

const tune = (form, kind = form.kind.value, side = sideOf(form), e = ent(toNum(form.entity.value)), ok = fit(e, kind, side)) => (
  form.entity.innerHTML = opts([['', t.pick], ...state.entities.filter(x => fit(x, kind, side)).map(x => [x.id, x.name || t.need])], ok ? e.id : ''),
  ok && e.name && (form.party.value = e.name),
  form.querySelector('.party').toggleAttribute('data-open', !(ok && e.name)),
  form.entity.required = !!kind && kind !== 'other' && !form.party.value.trim(),
  form.party.required = !!kind && !(ok && e.name),
  hint(form.entity),
  hint(form.party)
)

const inputs = {
  filters: ({ target }) => (state.filter = Object.fromEntries(new FormData(target.form)), target.name === 'days' && show()),
  editor: ({ target }) => (
    (['kind', 'side', 'entity'].includes(target.name)) && tune(target.form),
    target.name === 'side'
      ? state.edit = read(target.form)
      : (['qty', 'unit'].includes(target.name) && auto(target.closest('tr')), recalc(target.form))
  ),
  entities: ({ target }) => target.name === 'role' && (state.rosterRole = target.value),
  io: ({ target }) => restore(target.files[0], target.name).finally(() => target.value = ''),
}

const acts = {
  row: ({ form, dataset: { of } }, body = form.querySelector(`.${of} tbody`)) => (
    body.insertAdjacentHTML('beforeend', lines[of]()),
    controls(body.lastElementChild).map(hint),
    body.lastElementChild.querySelector('input:not([type=hidden])').focus(),
    dirty(form)
  ),
  del: (el, form = el.form, tr = el.closest('tr'), ref = toNum(tr.querySelector('[name=ref]')?.value)) => (
    tr.remove(),
    form.id === 'editor' && recalc(form),
    dirty(form),
    ref && form.id === 'entities' && db.drop(ref).then(() => (cache.record = '', reload(), toast('credit', t.saved)), err => toast('del', err.message))
  ),
  print: async ({ dataset: { id } }) => (sheet(id ? await db.get(+id) : state.cur ?? draft()), print()),
  cancel: async ({ dataset: { id } }) => (await db.cancel(+id), await route()),
  backup: async () => download(await db.dump(), `tx-ledger-${new Date().toLocaleDateString('sv')}.sqlite3`),
  wipe: async () => confirm(t.wipeAsk) && confirm(t.wipeAgain) && (await db.wipe(), await reload(), $('#settings').close(), location.hash = '#/', toast('credit', t.wipe)),
  lang: () => (state.edit && (state.edit = read($('#editor'))), setLang(t.next), paint()),
  theme: () => setTheme(tone() === 'dark' ? 'light' : 'dark'),
  palette: ({ dataset: { palette } }) => setPalette(palette),
}

const tone = () => localStorage.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
const setTheme = s => (document.documentElement.dataset.theme = localStorage.theme = s, Object.assign($('[data-act=theme]'), { ariaLabel: t[s], title: t[s] }).dataset.label = s)
const setPalette = (s, buttons = [...document.querySelectorAll('[data-act=palette]')], name = buttons.some(b => b.dataset.palette === s) ? s : 'ink') => (
  document.documentElement.dataset.palette = localStorage.palette = name,
  buttons.map(b => b.ariaPressed = b.dataset.palette === name)
)

const controls = root => [...root.querySelectorAll('input:not([type=hidden]):not([readonly]), select')]
const empty = i => fields[i.name]?.gt ? !(toNum(i.value) > 0) : !i.value.trim()
const hint = i => i?.setCustomValidity && (i.setCustomValidity(i.required && empty(i) ? t.need : ''), i.ariaInvalid = `${!i.validity.valid}`, i.title = i.validity.valid ? '' : t.need)
const gate = root => (els => (els.map(hint), els.every(i => i.validity.valid || i.reportValidity())))(controls(root))
const relax = el => ['editor', 'entities', 'born'].includes(el.form?.id) && hint(el)

const toast = (tone, text, el = $('#toast')) => (el.hidden = false, el.dataset.tone = tone, el.textContent = text, clearTimeout(toast.id), toast.id = setTimeout(() => el.hidden = true, 2200))
const submits = {
  editor: async ({ target }) => {
    if (!gate(target)) return toast('del', t.need)
    const r = read(target)
    r.fresh && (r.id = await db.next())
    await db.save(r)
    await reload()
    toast('credit', t.saved)
    location.hash = `#/${r.id}`
  },
  entities: async ({ target }) => {
    if (!gate(target)) return toast('del', t.need)
    const role = target.role.value
    await db.sync(rows(target, 'entities').map(item).filter(e => e.party).map(e => ({ ...e, role, debt: Math.max(0, e.debt - owed(state.list, e.ref)) })), role)
    cache.record = ''
    await reload()
    toast('credit', t.saved)
  },
  born: async ({ target }) => {
    if (!gate(target)) return toast('del', t.need)
    const role = target.role.value
    await db.put({ name: target.party.value.trim(), kind: target.kind.value, debt: Math.max(0, toNum(target.debt.value)), role })
    cache.record = ''
    state.rosterRole = role
    await reload()
    toast('credit', t.saved)
    location.hash = '#/entities'
  },
}

addEventListener('beforeinput', e => e.target.type === 'number' && /[۰-۹٠-٩٫,]/.test(e.data ?? '') && (e.preventDefault(), e.target.value = ascii(e.target.value + e.data).replace(/[,٬]/g, '').replace('٫', '.'), e.target.dispatchEvent(new Event('input', { bubbles: true }))))
addEventListener('input', e => (relax(e.target), inputs[e.target.form?.id]?.(e), e.target.name === 'role' || dirty(e.target.form)))
$('#screen').onclose = () => state.born ? location.hash = '#/entities' : state.edit && (location.hash = state.edit.fresh ? '#/' : `#/${state.edit.id}`)
addEventListener('invalid', e => e.target.ariaInvalid = 'true', true)
const act = el => acts[el?.dataset.act]?.(el)
addEventListener('click', e => act(e.target.closest('[data-act]')))
addEventListener('submit', e => (e.preventDefault(), submits[e.target.id]?.(e)))
addEventListener('hashchange', route)
addEventListener('beforeprint', () => $('#sheet').childElementCount || sheet(state.cur ?? draft()))
addEventListener('afterprint', () => $('#sheet').replaceChildren())
addEventListener('unhandledrejection', e => (e.preventDefault(), toast('del', e.reason?.message || t.failed)))

const split = $('#split')
const rtl = () => document.dir === 'rtl'
const keys = { ArrowLeft: -16, ArrowRight: 16 }
const setW = w => (document.body.style.setProperty('--w', `${w}px`), split.ariaValueNow = localStorage.w = Math.round(w))

split.onpointerdown = e => (e.preventDefault(), split.setPointerCapture(e.pointerId))
split.onpointermove = e => split.hasPointerCapture(e.pointerId) && setW(rtl() ? innerWidth - e.clientX : e.clientX)
split.onkeydown = e => keys[e.key] && setW($('#history').offsetWidth + keys[e.key] * (rtl() ? -1 : 1))

$('[data-act=theme]').dataset.label = tone()
localStorage.theme && (document.documentElement.dataset.theme = localStorage.theme)
setPalette(localStorage.palette)
setLang(localStorage.lang ?? lang())
setW(+localStorage.w || 340)
navigator.storage.persist()
await reload()
route()
