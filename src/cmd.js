import * as db from '@/store.js'
import { read, gate, dirty, controls, hint, recalc, entries } from '@/form.js'
import { lines, paper } from '@/view.js'
import { owed } from '@/ledger.js'
import { t, toNum, setLang } from '@/i18n.js'

const $ = s => document.querySelector(s)

export const toast = (tone, text, el = $('#toast')) => (el.hidden = false, el.dataset.tone = tone, el.textContent = text, clearTimeout(toast.id), toast.id = setTimeout(() => el.hidden = true, 2200))
const download = (bytes, name) => Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([bytes])), download: name }).click()

export const ask = ({ title, body, ok }, dlg = $('#ask')) => (
  $('#ask-title').textContent = title,
  $('#ask-body').textContent = body,
  dlg.querySelector('[value=ok]').textContent = ok,
  dlg.returnValue = '',
  dlg.showModal(),
  new Promise(resolve => {
    const finish = yes => finish.done || (finish.done = true, resolve(yes))
    dlg.onclose = () => finish(dlg.returnValue === 'ok')
    dlg.querySelector('form').onsubmit = e => (e.preventDefault(), e.stopPropagation(), finish(e.submitter?.value === 'ok'), queueMicrotask(() => dlg.open && dlg.close()))
  })
)

const tone = () => localStorage.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
const setTheme = s => (document.documentElement.dataset.theme = localStorage.theme = s, Object.assign($('[data-act=theme]'), { ariaLabel: t[s], title: t[s] }).dataset.label = s)
const setPalette = (s, buttons = [...document.querySelectorAll('[data-act=palette]')], name = buttons.some(b => b.dataset.palette === s) ? s : 'ink') => (
  document.documentElement.dataset.palette = localStorage.palette = name,
  buttons.map(b => b.ariaPressed = b.dataset.palette === name)
)
export const bootTheme = () => (
  $('[data-act=theme]').dataset.label = tone(),
  localStorage.theme && (document.documentElement.dataset.theme = localStorage.theme),
  setPalette(localStorage.palette)
)

export const restore = async (file, mode, { reload }) => file && await ask({ title: t[mode], body: t[`${mode}Ask`], ok: t[mode] }) && (
  await db.load(new Uint8Array(await file.arrayBuffer()), mode),
  await reload(),
  $('#settings').close(),
  location.hash = '#/'
)

const sheet = r => r && ($('#sheet').innerHTML = paper(r))
const draft = state => (form => form && read(form, state))($('#editor'))
export const preview = state => $('#sheet').childElementCount || sheet(state.cur ?? draft(state))

const acts = {
  row: ({ form, dataset: { of } }, _, body = form.querySelector(`.${of} tbody`)) => (
    body.insertAdjacentHTML('beforeend', lines[of]()),
    controls(body.lastElementChild).map(hint),
    body.lastElementChild.querySelector('input:not([type=hidden])').focus(),
    dirty(form)
  ),
  del: async (el, { state, drop, reload }, form = el.form, tr = el.closest('tr'), ref = toNum(tr.querySelector('[name=ref]')?.value)) =>
    await ask({ title: tr.querySelector('[name=party], [name=description], [name=note]')?.value.trim() || t.del, body: t.delAsk, ok: t.del }) && (
      tr.remove(),
      form.id === 'editor' && recalc(form, state),
      dirty(form),
      ref && form.id === 'entities' && db.drop(ref).then(() => (drop('record'), reload(), toast('credit', t.saved)), err => toast('del', err.message))
    ),
  revert: ({ form }, { drop, paint }) => form?.id === 'entities' && (drop('record'), paint()),
  print: async ({ dataset: { id } }, { state }) => (sheet(id ? await db.get(+id) : state.cur ?? draft(state)), print()),
  cancel: async ({ dataset: { id } }, { route }) => (await db.cancel(+id), await route()),
  backup: async () => download(await db.dump(), `tx-ledger-${new Date().toLocaleDateString('sv')}.sqlite3`),
  wipe: async (_, { reload }) => await ask({ title: t.wipeAsk, body: t.wipeAgain, ok: t.wipe }) && (await db.wipe(), await reload(), $('#settings').close(), location.hash = '#/', toast('credit', t.wipe)),
  lang: (_, { state, paint }) => (state.edit && (state.edit = read($('#editor'), state)), setLang(t.next), paint()),
  theme: () => setTheme(tone() === 'dark' ? 'light' : 'dark'),
  palette: ({ dataset: { palette } }) => setPalette(palette),
}

const submits = {
  editor: async ({ target }, { state, reload }) => {
    if (!gate(target)) return toast('del', t.need)
    const r = read(target, state)
    r.fresh && (r.id = await db.next())
    await db.save(r)
    await reload()
    toast('credit', t.saved)
    location.hash = `#/${r.id}`
  },
  entities: async ({ target }, { state, drop, reload }) => {
    if (!gate(target)) return toast('del', t.need)
    const role = target.role.value
    await db.sync(entries(target, 'entities').filter(e => e.party).map(e => ({ ...e, role, debt: Math.max(0, e.debt - owed(state.list, e.ref)) })), role)
    drop('record')
    await reload()
    toast('credit', t.saved)
  },
  born: async ({ target }, { state, drop, reload }) => {
    if (!gate(target)) return toast('del', t.need)
    const role = target.role.value
    await db.put({ name: target.party.value.trim(), kind: target.kind.value, debt: Math.max(0, toNum(target.debt.value)), role })
    drop('record')
    state.rosterRole = role
    await reload()
    toast('credit', t.saved)
    location.hash = '#/entities'
  },
}

export const act = (el, ctx) => acts[el?.dataset.act]?.(el, ctx)
export const submit = (e, ctx) => submits[e.target.id]?.(e, ctx)
