import '@/style.css'
import '@/doc.css'
import '@/print.css'
import { t, setLang, lang } from '@/i18n.js'
import { history, record, screen } from '@/view.js'
import * as db from '@/store.js'
import { pin, controls, hint, typed, beforeDigits, forget } from '@/form.js'
import { act, submit, restore, preview, toast, bootTheme } from '@/cmd.js'

const $ = s => document.querySelector(s)

const regions = { list: history, record, screen }
const cache = {}
const mount = (id, html) => {
  const el = $(`#${id}`)
  const form = (el.innerHTML = cache[id] = html, el.querySelector('#editor, #entities, #born'))
  id === 'screen' && (el.ariaLabel = state.born ? t.addEntity : state.edit?.fresh ? t.new : t.edit, html ? el.open || (el.showModal(), (form?.querySelector('[autofocus]') ?? form?.querySelector('[name=kind]'))?.focus()) : (forget('editor'), el.close()))
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
const drop = id => (cache[id] = '')
const ctx = () => ({ state, reload, route, paint, drop })

const routes = {
  '': async () => ({ cur: null, edit: null, span: null }),
  entities: async () => (await reload(), { cur: null, edit: null, span: null }),
  new: async () => ({ edit: blank(await db.next()), span: null }),
  span: async () => (await show(), { cur: null, edit: null }),
  edit: async id => db.get(id).then(r => ({ cur: r ?? null, edit: r && !r.cancelled ? r : null, span: null })),
  view: async id => (await db.touch(id), { cur: await db.get(id), edit: null, span: null, list: await db.list() }),
}

const route = async () => {
  const [, id = '', verb = 'view'] = location.hash.split('/')
  Object.assign(state, await (routes[id] ?? routes[verb])(id), { roster: id === 'entities', born: id === 'entities' && verb === 'new' })
  $('#span').ariaCurrent = id === 'span' ? 'page' : null
  $(`#bar a[data-t="records"]`).ariaCurrent = id === 'entities' || id === 'new' ? null : 'page'
  $(`#bar a[href="#/entities"]`).ariaCurrent = id === 'entities' ? 'page' : null
}

const inputs = {
  filters: ({ target }) => (state.filter = Object.fromEntries(new FormData(target.form)), target.name === 'days' && show()),
  entities: ({ target }) => target.name === 'role' && (state.rosterRole = target.value),
  io: ({ target }) => restore(target.files[0], target.name, ctx()).finally(() => target.value = ''),
}

const split = $('#split')
const rtl = () => document.dir === 'rtl'
const keys = { ArrowLeft: -16, ArrowRight: 16 }
const setW = w => (document.body.style.setProperty('--w', `${w}px`), split.ariaValueNow = localStorage.w = Math.round(w))

split.onpointerdown = e => (e.preventDefault(), split.setPointerCapture(e.pointerId))
split.onpointermove = e => split.hasPointerCapture(e.pointerId) && setW(rtl() ? innerWidth - e.clientX : e.clientX)
split.onkeydown = e => keys[e.key] && setW($('#history').offsetWidth + keys[e.key] * (rtl() ? -1 : 1))

addEventListener('beforeinput', beforeDigits)
addEventListener('input', e => (typed(e, state), inputs[e.target.form?.id]?.(e)))
$('#screen').onclose = () => state.born ? location.hash = '#/entities' : state.edit && (location.hash = state.edit.fresh ? '#/' : `#/${state.edit.id}`)
addEventListener('invalid', e => e.target.ariaInvalid = 'true', true)
const pick = 'input:is(:not([type]), [type=text], [type=search]):not([readonly])'
const grab = e => e.target.matches(pick) && e.target.select()
addEventListener('focusin', grab)
addEventListener('mouseup', e => e.target.matches(pick) && e.preventDefault())
addEventListener('click', e => (grab(e), act(e.target.closest('[data-act]'), ctx())))
addEventListener('submit', e => e.target.method === 'dialog' || (e.preventDefault(), submit(e, ctx())))
addEventListener('hashchange', route)
addEventListener('beforeprint', () => preview(state))
addEventListener('afterprint', () => $('#sheet').replaceChildren())
addEventListener('unhandledrejection', e => (e.preventDefault(), toast('del', e.reason?.message || t.failed)))

bootTheme()
setLang(localStorage.lang ?? lang())
setW(+localStorage.w || 340)
navigator.storage.persist()
await reload()
route()
