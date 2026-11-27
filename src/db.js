import init from '@sqlite.org/sqlite-wasm'
import { absorb, read } from './merge.js'

const file = '/registry.sqlite3'
const keep = 7
const schema = `
  CREATE TABLE IF NOT EXISTS entities (id INTEGER PRIMARY KEY, name TEXT, kind TEXT);
  CREATE TABLE IF NOT EXISTS records (id INTEGER PRIMARY KEY, entity_id INTEGER, party TEXT, at INTEGER, opened INTEGER, cancelled INTEGER);
  CREATE TABLE IF NOT EXISTS items (record_id INTEGER, n INTEGER, description TEXT, qty TEXT, unit REAL, total REAL);
  CREATE TABLE IF NOT EXISTS payments (record_id INTEGER, n INTEGER, amount REAL, at INTEGER, note TEXT);
  CREATE INDEX IF NOT EXISTS items_record ON items (record_id);
  CREATE INDEX IF NOT EXISTS payments_record ON payments (record_id);`

const migrations = [
  ['records', 'cancelled', 'ALTER TABLE records ADD COLUMN cancelled INTEGER'],
  ['records', 'entity_id', `
    ALTER TABLE records ADD COLUMN entity_id INTEGER;
    INSERT INTO entities (name, kind) SELECT DISTINCT party, kind FROM records;
    UPDATE records SET entity_id = (SELECT id FROM entities WHERE name IS records.party AND kind IS records.kind), party = NULL;
    ALTER TABLE records DROP COLUMN kind;`],
  ['records', 'party', 'ALTER TABLE records ADD COLUMN party TEXT'],
  ['entities', 'debt', 'ALTER TABLE entities ADD COLUMN debt REAL DEFAULT 0'],
  ['records', 'side', `ALTER TABLE records ADD COLUMN side TEXT DEFAULT 'sale'`],
  ['entities', 'role', `ALTER TABLE entities ADD COLUMN role TEXT DEFAULT 'buyer'`],
]

const rows = (db, sql, bind) => db.exec({ sql, bind: bind?.length ? bind : undefined, rowMode: 'object', returnValue: 'resultRows' })

const migrate = db => {
  db.exec(schema)
  const cols = table => rows(db, `PRAGMA table_info(${table})`).map(c => c.name)
  migrations.filter(([table, col]) => !cols(table).includes(col)).map(([, , sql]) => db.transaction(tx => tx.exec(sql)))
}

const backup = async pool => {
  const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('backups', { create: true })
  const names = await Array.fromAsync(dir.keys())
  const name = `${new Date().toLocaleDateString('sv')}.sqlite3`
  if (names.includes(name)) return
  const out = await (await dir.getFileHandle(name, { create: true })).createWritable()
  await out.write(pool.exportFile(file))
  await out.close()
  await Promise.all([...names, name].toSorted().slice(0, -keep).map(n => dir.removeEntry(n)))
}

const wait = ms => new Promise(r => setTimeout(r, ms))
const locked = e => e?.name === 'NoModificationAllowedError'
const channel = new BroadcastChannel('registry')
let live = false
const install = (sqlite3, n = 0) => sqlite3.installOpfsSAHPoolVfs({
  name: 'registry',
  preserveOnInitFailure: true,
  forceReinitIfPreviouslyFailed: !!n,
}).catch(e => locked(e) && n < 5
  ? (channel.postMessage('release'), wait(150 * (n + 1)).then(() => install(sqlite3, n + 1)))
  : Promise.reject(locked(e) ? new Error('registry file is still locked') : e))

const boot = async () => {
  const sqlite3 = await init()
  const error = sqlite3.config.error
  sqlite3.config.error = () => {}
  const pool = await install(sqlite3).finally(() => sqlite3.config.error = error)
  const open = () => (db => (migrate(db), db))(new pool.OpfsSAHPoolDb(file))
  const ctx = { pool, sqlite3, open, db: open() }
  live = true
  backup(pool).catch(console.warn)
  return ctx
}

const ready = boot()
const drop = ctx => ctx.pool.isPaused() || (ctx.db.close(), ctx.pool.pauseVfs())
channel.onmessage = () => live && ready.then(drop).catch(() => {})

const incoming = (sqlite3, bytes) => {
  const p = sqlite3.wasm.allocFromTypedArray(bytes)
  const db = new sqlite3.oo1.DB()
  const rc = sqlite3.capi.sqlite3_deserialize(db.pointer, 'main', p, bytes.byteLength, bytes.byteLength, sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE)
  rc && (sqlite3.wasm.dealloc(p), db.close())
  return db.checkRc(rc)
}

const replace = async (ctx, bytes) => (ctx.db.close(), await Promise.try(() => ctx.pool.importDb(file, bytes)).finally(() => ctx.db = ctx.open()))
const merge = (ctx, bytes) => {
  const src = incoming(ctx.sqlite3, bytes)
  return Promise.try(() => (migrate(src), ctx.db.transaction(db => absorb(db, read(src))))).finally(() => src.close())
}

const ops = {
  exec: (ctx, sql, bind) => rows(ctx.db, sql, bind),
  tx: (ctx, stmts) => ctx.db.transaction(db => stmts.map(([sql, bind]) => rows(db, sql, bind))),
  dump: ctx => ctx.pool.exportFile(file),
  load: (ctx, bytes, mode) => (mode === 'replace' ? replace : merge)(ctx, bytes).then(() => true),
  pause: drop,
  resume: async ctx => ctx.pool.isPaused() && (await ctx.pool.unpauseVfs(), ctx.db = ctx.open()),
}

onmessage = ({ data: { id, op, args } }) => ready
  .then(ctx => ops[op](ctx, ...(args ?? [])))
  .then(value => ({ id, value }), e => ({ id, error: e.message }))
  .then(msg => id && postMessage(msg))
