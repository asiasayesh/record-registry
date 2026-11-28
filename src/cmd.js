import { apply, letter, showLogo, values } from '@/brand.js'
import { controls, dirty, entries, gate, hint, read, recalc } from '@/form.js'
import { setLang, t, toNum } from '@/i18n.js'
import { owed } from '@/ledger.js'
import * as db from '@/store.js'
import { lines, paper } from '@/view.js'

const $ = (s) => document.querySelector(s)

export const toast = (tone, text, el = $('#toast')) => {
  el.hidden = false
  el.dataset.tone = tone
  el.textContent = text
  clearTimeout(toast.id)
  toast.id = setTimeout(() => {
    el.hidden = true
  }, 2200)
}
const download = (bytes, name) =>
  Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([bytes])),
    download: name,
  }).click()

export const ask = ({ title, body, ok }, dlg = $('#ask')) => {
  $('#ask-title').textContent = title
  $('#ask-body').textContent = body
  dlg.querySelector('[value=ok]').textContent = ok
  dlg.returnValue = ''
  dlg.showModal()
  return new Promise((resolve) => {
    const finish = (yes) => {
      if (finish.done) return
      finish.done = true
      resolve(yes)
    }
    dlg.onclose = () => finish(dlg.returnValue === 'ok')
    dlg.querySelector('form').onsubmit = (e) => {
      e.preventDefault()
      e.stopPropagation()
      finish(e.submitter?.value === 'ok')
      queueMicrotask(() => dlg.open && dlg.close())
    }
  })
}

const tone = () =>
  localStorage.theme ??
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
const keep = (k, v) => {
  localStorage[k] = v
  document.documentElement.dataset[k] = v
}
const setTheme = (s) => {
  keep('theme', s)
  Object.assign($('[data-act=theme]'), {
    ariaLabel: t[s],
    title: t[s],
  }).dataset.label = s
}
const setPalette = (
  s,
  buttons = [...document.querySelectorAll('[data-act=palette]')],
  name = buttons.some((b) => b.dataset.palette === s) ? s : 'ink',
) => {
  keep('palette', name)
  buttons.map((b) => (b.ariaPressed = b.dataset.palette === name))
}
export const bootTheme = () => {
  $('[data-act=theme]').dataset.label = tone()
  if (localStorage.theme)
    document.documentElement.dataset.theme = localStorage.theme
  setPalette(localStorage.palette)
}

const back = async (reload) => {
  await reload()
  $('#settings').close()
  location.hash = '#/'
}
export const restore = async (file, mode, { reload }) => {
  if (!file) return
  if (!(await ask({ title: t[mode], body: t[`${mode}Ask`], ok: t[mode] })))
    return
  await db.load(new Uint8Array(await file.arrayBuffer()), mode)
  await back(reload)
}

const sheet = (r) => {
  if (!r) return
  $('#sheet').innerHTML = paper(r)
}
const draft = (state) => {
  const form = $('#editor')
  if (!form) return
  return read(form, state)
}
export const preview = (state) =>
  $('#sheet').childElementCount || sheet(state.cur ?? draft(state))

const acts = {
  row: (
    { form, dataset: { of } },
    _,
    body = form.querySelector(`.${of} tbody`),
  ) => {
    body.insertAdjacentHTML('beforeend', lines[of]())
    controls(body.lastElementChild).map(hint)
    body.lastElementChild.querySelector('input:not([type=hidden])').focus()
    dirty(form)
  },
  del: async (
    el,
    { state, drop, reload },
    form = el.form,
    tr = el.closest('tr'),
    ref = toNum(tr.querySelector('[name=ref]')?.value),
  ) => {
    if (
      !(await ask({
        title:
          tr
            .querySelector('[name=party], [name=description], [name=note]')
            ?.value.trim() || t.del,
        body: t.delAsk,
        ok: t.del,
      }))
    )
      return
    tr.remove()
    if (form.id === 'editor') recalc(form, state)
    dirty(form)
    if (!(ref && form.id === 'entities')) return
    db.drop(ref).then(
      () => {
        drop('record')
        reload()
        toast('credit', t.saved)
      },
      (err) => toast('del', err.message),
    )
  },
  revert: ({ form }, { drop, paint }) => {
    if (form?.id !== 'entities') return
    drop('record')
    paint()
  },
  print: async ({ dataset: { id } }, { state }) => {
    sheet(id ? await db.get(+id) : (state.cur ?? draft(state)))
    print()
  },
  cancel: async ({ dataset: { id } }, { route }) => {
    await db.cancel(+id)
    await route()
  },
  backup: async () =>
    download(
      await db.dump(),
      `tx-ledger-${new Date().toLocaleDateString('sv')}.sqlite3`,
    ),
  wipe: async (_, { reload }) => {
    if (!(await ask({ title: t.wipeAsk, body: t.wipeAgain, ok: t.wipe })))
      return
    await db.wipe()
    await back(reload)
    toast('credit', t.wipe)
  },
  lang: (_, { state, paint }) => {
    if (state.edit) state.edit = read($('#editor'), state)
    setLang(t.next)
    paint()
  },
  theme: () => setTheme(tone() === 'dark' ? 'light' : 'dark'),
  palette: ({ dataset: { palette } }) => setPalette(palette),
  layout: (
    { dataset: { layout } },
    { state },
    next = layout === 'rows' ? 'rows' : 'cards',
  ) => {
    localStorage.layout = next
    state.layout = next
  },
  unlogo: async (_, { paint }) => {
    await db.clearLogo()
    apply(await db.brand())
    paint()
    showLogo()
  },
}

const submits = {
  editor: async ({ target }, { state, reload }) => {
    if (!gate(target)) return toast('del', t.need)
    const r = read(target, state)
    if (r.fresh) r.id = await db.next()
    await db.save(r)
    await reload()
    toast('credit', t.saved)
    location.hash = `#/${r.id}`
  },
  entities: async ({ target }, { state, drop, reload }) => {
    if (!gate(target)) return toast('del', t.need)
    const role = target.role.value
    await db.sync(
      entries(target, 'entities')
        .filter((e) => e.party)
        .map((e) => ({
          ...e,
          role,
          debt: Math.max(0, e.debt - owed(state.list, e.ref)),
        })),
      role,
    )
    drop('record')
    await reload()
    toast('credit', t.saved)
  },
  io: async ({ target }, { paint }, file = target.elements.logo.files[0]) => {
    await db.saveBrand({
      ...values(target),
      logo: file ? new Uint8Array(await file.arrayBuffer()) : null,
      mime: file ? file.type || 'image/png' : null,
    })
    apply(await db.brand())
    paint()
    letter(target)
    toast('credit', t.saved)
  },
  born: async ({ target }, { state, drop, reload }) => {
    if (!gate(target)) return toast('del', t.need)
    const role = target.role.value
    await db.put({
      name: target.party.value.trim(),
      kind: target.kind.value,
      debt: Math.max(0, toNum(target.debt.value)),
      role,
    })
    drop('record')
    state.rosterRole = role
    await reload()
    toast('credit', t.saved)
    location.hash = '#/entities'
  },
}

export const act = (el, ctx) => acts[el?.dataset.act]?.(el, ctx)
export const submit = (e, ctx) => submits[e.target.id]?.(e, ctx)
