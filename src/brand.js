import { t, tr } from '@/i18n.js'

const fallback = {
  logo: `${import.meta.env.BASE_URL}logo.png`,
  name: { fa: 'ابزار آسیا سایش', en: 'Abzar Asia Sayesh' },
  tagline: {
    fa: 'بورس سمباده، سنگ و ابزار آلات صنعتی',
    en: 'Sandpaper, abrasive stones and industrial tools',
  },
  phone: '66748797',
  fax: '66748796',
  mobile: '0912-1337308',
}

const brand = { ...fallback }
const copy = ['name', 'tagline', 'phone', 'fax', 'mobile']
const max = 250
const blobUrl = (bytes, mime) =>
  bytes?.byteLength
    ? URL.createObjectURL(new Blob([bytes], { type: mime || 'image/png' }))
    : fallback.logo

export const apply = (row) => {
  if (brand.logo.startsWith('blob:')) URL.revokeObjectURL(brand.logo)
  Object.assign(
    brand,
    Object.fromEntries(copy.map((k) => [k, row?.[k] ?? fallback[k]])),
    { logo: blobUrl(row?.logo, row?.mime) },
  )
  document.querySelector('#bar nav a img')?.setAttribute('src', brand.logo)
}

const mark = (img, src, blob) => {
  if (img.dataset.blob) URL.revokeObjectURL(img.dataset.blob)
  delete img.dataset.blob
  if (blob) img.dataset.blob = src
  img.src = src
}

export const showLogo = (
  form = document.querySelector('#io'),
  img = form.querySelector('.logo img'),
) => {
  form.logo.value = ''
  img.alt = t.logo
  mark(img, brand.logo)
  form.querySelector('[data-act=unlogo]').hidden =
    !brand.logo.startsWith('blob:')
}

export const values = (form) =>
  Object.fromEntries(copy.map((k) => [k, form.elements[k].value.trim()]))
export const letter = (form = document.querySelector('#io')) => {
  copy.map((k) => (form.elements[k].value = tr(brand[k]) ?? ''))
  showLogo(form)
  form.querySelector('.primary').toggleAttribute('data-dirty', false)
}

const load = (file) =>
  new Promise(
    (ok) =>
      (Object.assign(new Image(), {
        onload() {
          URL.revokeObjectURL(this.src)
          ok(this)
        },
        onerror() {
          URL.revokeObjectURL(this.src)
          ok(null)
        },
      }).src = URL.createObjectURL(file)),
  )

const raster = (img, w, h) =>
  new Promise((ok) => {
    const canvas = Object.assign(document.createElement('canvas'), {
      width: w,
      height: h,
    })
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)
    canvas.toBlob(
      (b) => ok(new File([b], 'logo.png', { type: 'image/png' })),
      'image/png',
    )
  })

const edge = (n, scale) => Math.max(1, Math.floor(n * scale))

const fit = async (file) => {
  const img = await load(file)
  const scale =
    img?.naturalWidth &&
    Math.min(1, max / img.naturalWidth, max / img.naturalHeight)
  return scale === 1
    ? file
    : scale &&
        raster(
          img,
          edge(img.naturalWidth, scale),
          edge(img.naturalHeight, scale),
        )
}

const adopt = (input, file) => {
  const bin = new DataTransfer()
  bin.items.add(file)
  input.files = bin.files
}

export const logoPreview = async (
  input,
  img = input.form.querySelector('.logo img'),
) => {
  const file = await fit(input.files[0])
  if (!file) {
    input.value = ''
    return
  }
  if (file !== input.files[0]) adopt(input, file)
  mark(img, URL.createObjectURL(file), true)
}

export default brand
