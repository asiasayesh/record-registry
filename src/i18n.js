const dict = {
  fa: {
    dir: 'rtl', locale: 'fa-IR-u-ca-persian', digits: '۰۱۲۳۴۵۶۷۸۹', next: 'en',
    title: 'دفتر اسناد', lang: 'EN', new: 'سند جدید',
    settings: 'تنظیمات', appearance: 'نمایش', language: 'زبان', theme: 'حالت', light: 'روشن', dark: 'تیره',
    palette: 'رنگ', ink: 'مشکی', slate: 'سربی', sand: 'خاکی', blue: 'آبی', sea: 'دریا', green: 'سبز', plum: 'بنفش',
    data: 'داده', backup: 'پشتیبان‌گیری', merge: 'افزودن اسناد', replace: 'جایگزینی', close: 'بستن',
    backupHint: 'بکاب',     mergeHint: 'سند تازه اضافه می‌شود. سند موجود با فایل به‌روز می‌شود.', replaceHint: 'پایگاه این مرورگر با فایل عوض می‌شود.',
    mergeAsk: 'سندهای این فایل اضافه شود؟ سند موجود با فایل به‌روز می‌شود.', replaceAsk: 'پایگاه داده فعلی با این فایل جایگزین شود؟',
    print: 'چاپ', edit: 'ویرایش', save: 'ذخیره', cancel: 'انصراف', cancelled: 'باطل', del: 'حذف ردیف', need: 'الزامی',
    search: 'جستجو در نام، نوع و شرح', last: 'آخرین', days: 'روز', from: 'از', to: 'تا', byDate: 'تاریخ', byDesc: 'شرح', resize: 'تغییر عرض',
    serial: 'شماره', date: 'تاریخ', party: 'صورتحساب', pick: 'انتخاب طرف حساب', partyName: 'نام خریدار',
    person: 'شخص', company: 'شرکت', other: 'متفرقه', buyer: 'خریدار', seller: 'فروشنده',
    all: 'همه', sale: 'فروش', buy: 'خرید', phone: 'تلفن', fax: 'فکس', mobile: 'همراه',
    mismatch: 'طرف حساب با نوع سند نمی‌خواند',
    entities: 'طرف حساب‌ها', name: 'نام', kind: 'نوع', records: 'اسناد', addEntity: 'طرف حساب جدید',
    payments: 'دریافت‌ها', note: 'توضیح', amount: 'مبلغ', addPay: 'دریافت جدید',
    items: 'اقلام فروخته‌شده',
    copy: { buy: {
      items: 'اقلام خریداری‌شده', description: 'کالا', unit: 'بهای واحد', total: 'بهای کل',
      payments: 'پرداخت‌ها', addPay: 'پرداخت جدید', paid: 'پرداختی', prior: 'بدهی قبلی ما', debt: 'بدهی ما به فروشنده',
      party: 'خرید از', partyName: 'نام فروشنده',
    } },
    paid: 'دریافتی', rest: 'مانده این سند', prior: 'بدهی قبلی', debt: 'بدهی کل طرف حساب',
    row: 'ردیف', description: 'شرح کالا', qty: 'تعداد', unit: 'قیمت واحد', total: 'قیمت کل', addRow: 'ردیف جدید',
    sum: 'جمع کل', words: 'مبلغ کل به حروف', currency: 'ریال',
    recent: 'آخرین اسناد', empty: 'هنوز سندی ثبت نشده', none: 'موردی یافت نشد',
  },
  en: {
    dir: 'ltr', locale: 'en-GB', digits: '0123456789', next: 'fa',
    title: 'Tx Ledger', lang: 'فا', new: 'New record',
    settings: 'Settings', appearance: 'Appearance', language: 'Language', theme: 'Theme', light: 'Light', dark: 'Dark',
    palette: 'Color', ink: 'Ink', slate: 'Slate', sand: 'Sand', blue: 'Blue', sea: 'Sea', green: 'Green', plum: 'Violet',
    data: 'Data', backup: 'Backup', merge: 'Add records', replace: 'Replace', close: 'Close',
    backupHint: 'Download a copy of the database',     mergeHint: 'Add records that are not here. Records already here are updated from the file.', replaceHint: 'Swap the database in this browser for the file.',
    mergeAsk: 'Add records from this file? Records already here are updated from the file.', replaceAsk: 'Replace the current database with this file?',
    print: 'Print', edit: 'Edit', save: 'Save', cancel: 'Cancel', cancelled: 'Cancelled', del: 'Remove row', need: 'Required',
    search: 'Search name, type, and description', last: 'Last', days: 'days', from: 'From', to: 'To', byDate: 'Date', byDesc: 'Description', resize: 'Resize',
    serial: 'No.', date: 'Date', party: 'Invoice to', pick: 'Choose entity', partyName: 'Buyer name',
    person: 'Person', company: 'Company', other: 'Other', buyer: 'Buyer', seller: 'Seller',
    all: 'All', sale: 'Sale', buy: 'Purchase', phone: 'Tel', fax: 'Fax', mobile: 'Mobile',
    mismatch: 'Entity does not match this record',
    entities: 'Entities', name: 'Name', kind: 'Type', records: 'Records', addEntity: 'Add entity',
    payments: 'Payments', note: 'Note', amount: 'Amount', addPay: 'Add payment',
    items: 'Items sold',
    copy: { buy: {
      items: 'Purchased items', description: 'Item', unit: 'Unit cost', total: 'Total cost',
      payments: 'Payments', addPay: 'Add payment', paid: 'Paid', prior: 'Our previous debt', debt: 'We owe the seller',
      party: 'Purchase from', partyName: 'Seller name',
    } },
    paid: 'Received', rest: 'Balance due', prior: 'Previous debt', debt: 'Total entity debt',
    row: '#', description: 'Description', qty: 'Qty', unit: 'Unit price', total: 'Total', addRow: 'Add row',
    sum: 'Total', words: 'Total in words', currency: 'IRR',
    recent: 'Recent records', empty: 'No records yet', none: 'Nothing found',
  },
}

export const lang = () => document.documentElement.lang
export const text = (k, l) => dict[l]?.[k] ?? ''
export const t = new Proxy({}, { get: (_, k) => dict[lang()]?.[k] ?? k })
export const tr = v => v?.[lang()] ?? v
export const ts = (side, k) => dict[lang()]?.copy?.[side]?.[k] ?? t[k]

export const ascii = s => String(s ?? '').replace(/[۰-۹٠-٩]/g, d => d.charCodeAt() & 15)
export const toNum = s => parseFloat(ascii(s).replace(/[,٬\s]/g, '').replace('٫', '.')) || 0
export const digits = s => String(s ?? '').replace(/\d/g, d => t.digits[d])
export const num = n => new Intl.NumberFormat(t.locale).format(n || 0)
export const date = ms => new Intl.DateTimeFormat(t.locale, { dateStyle: 'medium' }).format(ms)

const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده']
const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']
const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'هزار میلیارد']
const tri = (n, r = n % 100) => [hundreds[n / 100 | 0], r < 20 ? ones[r] : tens[r / 10 | 0], r < 20 ? '' : ones[r % 10]].filter(Boolean).join(' و ')
const chunks = n => n ? [n % 1000, ...chunks(Math.floor(n / 1000))] : []

export const words = n => chunks(Math.floor(n)).map((c, i) => c && `${tri(c)} ${scales[i]}`.trim()).filter(Boolean).reverse().join(' و ') || 'صفر'

const rules = {
  t: (el, v) => el.textContent = v,
  hint: (el, v) => el.placeholder = v,
  label: (el, v) => el.ariaLabel = el.title = v,
}

const translate = () => Object.entries(rules).flatMap(([k, f]) => [...document.querySelectorAll(`[data-${k}]`)].map(el => f(el, t[el.dataset[k]])))

export const setLang = l => (
  Object.assign(document.documentElement, { lang: l, dir: dict[l].dir }),
  document.title = t.title,
  localStorage.lang = l,
  translate()
)
