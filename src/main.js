import '@/style.css'
import '@/doc.css'
import '@/print.css'
import { apply, letter, logoPreview } from '@/brand.js'
import { act, bootTheme, preview, restore, submit, toast } from '@/cmd.js'
import { beforeDigits, controls, forget, hint, pin, typed } from '@/form.js'
import { lang, setLang, t } from '@/i18n.js'
import * as db from '@/store.js'
import { history, record, screen } from '@/view.js'

const $ = (s) => document.querySelector(s)

const regions = { list: history, record, screen }
const cache = {}
const mount = (id, html) => {
  const el = $(`#${id}`)
  el.innerHTML = html
  cache[id] = html
  const form = el.querySelector('#editor, #entities, #born')
  if (id === 'screen') {
    el.ariaLabel = state.born ? t.addEntity : state.edit?.fresh ? t.new : t.edit
    if (html && !el.open) {
      el.showModal()
      const focus =
        form?.querySelector('[autofocus]') ?? form?.querySelector('[name=kind]')
      focus?.focus()
    }
    if (!html) {
      forget('editor')
      el.close()
    }
  }
  if (!form) return
  pin(form)
  controls(form).map(hint)
}
const paint = () =>
  Object.entries(regions)
    .map(([id, view]) => [id, view(state)])
    .filter(([id, html]) => cache[id] !== html)
    .map(([id, html]) => mount(id, html))

const schedule = () => {
  schedule.id ||= requestAnimationFrame(() => {
    schedule.id = 0
    paint()
  })
}
const ticket = { n: 0 }
const from = (n, d = new Date()) =>
  d.setDate(d.setHours(0, 0, 0, 0) && d.getDate() - n + 1)
const docs = (days) =>
  ((mine) =>
    Promise.all(
      +days > 0
        ? state.list.filter((r) => r.at >= from(+days)).map((r) => db.get(r.id))
        : [],
    ).then((rows) => mine === ticket.n && rows.filter(Boolean)))(++ticket.n)
const show = async () => {
  if (location.hash !== '#/span') return
  const rows = await docs(state.filter.days)
  if (location.hash === '#/span' && rows) state.span = rows
}
const state = new Proxy(
  {
    list: [],
    entities: [],
    filter: { mode: 'date', days: '7' },
    cur: null,
    edit: null,
    roster: false,
    rosterRole: 'buyer',
    layout: localStorage.layout === 'rows' ? 'rows' : 'cards',
  },
  {
    set: (o, k, v) => {
      o[k] = v
      schedule()
      return true
    },
  },
)

const reload = async () => {
  ;[state.list, state.entities] = await Promise.all([
    db.list(),
    db.entities(),
    db.brand().then(apply),
  ]).then(([list, entities]) => [list, entities])
  if ($('#settings').open) letter()
}
const blank = (id) => ({
  id,
  fresh: true,
  entity_id: null,
  side: 'sale',
  at: Date.now(),
  items: [],
  payments: [],
})
const drop = (id) => (cache[id] = '')
const ctx = () => ({ state, reload, route, paint, drop })

const routes = {
  '': async () => ({ cur: null, edit: null, span: null }),
  entities: async () => {
    await reload()
    return { cur: null, edit: null, span: null }
  },
  new: async () => ({ edit: blank(await db.next()), span: null }),
  span: async () => {
    await show()
    return { cur: null, edit: null }
  },
  edit: async (id) =>
    db.get(id).then((r) => ({
      cur: r ?? null,
      edit: r && !r.cancelled ? r : null,
      span: null,
    })),
  view: async (id) => {
    await db.touch(id)
    return {
      cur: await db.get(id),
      edit: null,
      span: null,
      list: await db.list(),
    }
  },
}

const route = async () => {
  const [, id = '', verb = 'view'] = location.hash.split('/')
  Object.assign(state, await (routes[id] ?? routes[verb])(id), {
    roster: id === 'entities',
    born: id === 'entities' && verb === 'new',
  })
  const marks = [
    ['#span', id === 'span'],
    ['#bar a[data-t="records"]', id !== 'entities' && id !== 'new'],
    ['#bar a[href="#/entities"]', id === 'entities'],
  ]
  marks.map(([sel, on]) => ($(sel).ariaCurrent = on ? 'page' : null))
}

const inputs = {
  filters: ({ target }) => {
    state.filter = Object.fromEntries(new FormData(target.form))
    if (target.name === 'days') show()
  },
  entities: ({ target }) => {
    if (target.name === 'role') state.rosterRole = target.value
  },
  io: ({ target }) =>
    target.name === 'logo'
      ? target.files[0] && logoPreview(target)
      : target.matches('[name=merge], [name=replace]') &&
        restore(target.files[0], target.name, ctx()).finally(
          () => (target.value = ''),
        ),
}

const split = $('#split')
const rtl = () => document.dir === 'rtl'
const keys = { ArrowLeft: -16, ArrowRight: 16 }
const setW = (w) => {
  const next = Math.round(w)
  document.body.style.setProperty('--w', `${next}px`)
  localStorage.w = next
  split.ariaValueNow = next
}

const pick =
  'input:is(:not([type]), [type=text], [type=search]):not([readonly])'
const grab = (e) => e.target.matches(pick) && e.target.select()
const drag = (e) => {
  e.preventDefault()
  split.setPointerCapture(e.pointerId)
}
const slide = (e) =>
  split.hasPointerCapture(e.pointerId) &&
  setW(rtl() ? innerWidth - e.clientX : e.clientX)
const nudge = (e) =>
  keys[e.key] &&
  setW($('#history').offsetWidth + keys[e.key] * (rtl() ? -1 : 1))
const type = (e) => {
  typed(e, state)
  inputs[e.target.form?.id]?.(e)
}
const shut = () => {
  if (state.born) {
    location.hash = '#/entities'
    return
  }
  if (!state.edit) return
  location.hash = state.edit.fresh ? '#/' : `#/${state.edit.id}`
}
const press = (e) => {
  grab(e)
  act(e.target.closest('[data-act]'), ctx())
}
const send = (e) => {
  if (e.target.method === 'dialog') return
  e.preventDefault()
  submit(e, ctx())
}
const fail = (e) => {
  e.preventDefault()
  toast('del', e.reason?.message || t.failed)
}
const wires = [
  [split, 'pointerdown', drag],
  [split, 'pointermove', slide],
  [split, 'keydown', nudge],
  [window, 'beforeinput', beforeDigits],
  [window, 'input', type],
  [$('#screen'), 'close', shut],
  [window, 'invalid', (e) => (e.target.ariaInvalid = 'true'), true],
  [window, 'focusin', grab],
  [window, 'mouseup', (e) => e.target.matches(pick) && e.preventDefault()],
  [window, 'click', press],
  [window, 'submit', send],
  [$('#settings'), 'toggle', ({ newState }) => newState === 'open' && letter()],
  [window, 'hashchange', route],
  [window, 'beforeprint', () => preview(state)],
  [window, 'afterprint', () => $('#sheet').replaceChildren()],
  [window, 'unhandledrejection', fail],
]
wires.map(([el, ev, fn, opt]) => el.addEventListener(ev, fn, opt))

bootTheme()
setLang(localStorage.lang ?? lang())
setW(+localStorage.w || 340)
navigator.storage.persist()
await reload()
route()
