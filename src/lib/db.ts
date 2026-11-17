/**
 * Capa de persistencia sobre IndexedDB.
 * La app mantiene una copia en memoria (DataProvider) y escribe aquí
 * de forma transaccional para garantizar integridad.
 */

export const DB_NAME = 'finpoliza'
export const DB_VERSION = 2

export const STORES = [
  'users',
  'roles',
  'products',
  'policies',
  'installments',
  'payments',
  'fundMovements',
  'notifications',
  'audit',
  'settings',
  'meta',
] as const

export type StoreName = (typeof STORES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      // v2: meta pasó de clave externa a keyPath "id".
      if (db.objectStoreNames.contains('meta')) {
        db.deleteObjectStore('meta')
      }
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          if (name === 'meta' || name === 'settings') {
            db.createObjectStore(name, { keyPath: 'id' })
          } else {
            const store = db.createObjectStore(name, { keyPath: 'id' })
            if (name === 'users') store.createIndex('email', 'email', { unique: false })
            if (name === 'policies') store.createIndex('userId', 'userId', { unique: false })
            if (name === 'installments') {
              store.createIndex('policyId', 'policyId', { unique: false })
              store.createIndex('userId', 'userId', { unique: false })
            }
            if (name === 'payments') {
              store.createIndex('userId', 'userId', { unique: false })
              store.createIndex('policyId', 'policyId', { unique: false })
            }
            if (name === 'fundMovements') {
              store.createIndex('userId', 'userId', { unique: false })
            }
            if (name === 'notifications') {
              store.createIndex('userId', 'userId', { unique: false })
            }
          }
        }
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir la base de datos'))
    request.onblocked = () => reject(new Error('La base de datos está bloqueada por otra pestaña'))
  })
  return dbPromise
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Error de IndexedDB'))
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('La transacción falló'))
    tx.onabort = () => reject(tx.error ?? new Error('La transacción fue cancelada'))
  })
}

export interface TxContext {
  getAll<T>(store: StoreName): Promise<T[]>
  get<T>(store: StoreName, key: string): Promise<T | undefined>
  put<T>(store: StoreName, value: T): Promise<void>
  putMany<T>(store: StoreName, values: T[]): Promise<void>
  remove(store: StoreName, key: string): Promise<void>
  clear(store: StoreName): Promise<void>
}

/**
 * Ejecuta varias lecturas/escrituras en una única transacción atómica.
 * Si `fn` lanza un error, todos los cambios se revierten.
 */
export async function withTransaction<T>(
  stores: StoreName[],
  mode: IDBTransactionMode,
  fn: (tx: TxContext) => Promise<T> | T,
): Promise<T> {
  const db = await openDB()
  const tx = db.transaction(stores, mode)
  const completion = txDone(tx)
  // Evita rechazos no manejados cuando la transacción aborta por un throw.
  completion.catch(() => undefined)
  const ctx: TxContext = {
    getAll: <V>(store: StoreName) => requestToPromise<V[]>(tx.objectStore(store).getAll() as IDBRequest<V[]>),
    get: <V>(store: StoreName, key: string) =>
      requestToPromise<V | undefined>(tx.objectStore(store).get(key) as IDBRequest<V | undefined>),
    put: <V>(store: StoreName, value: V) =>
      requestToPromise(tx.objectStore(store).put(value as unknown as never)).then(() => undefined),
    putMany: async <V>(store: StoreName, values: V[]) => {
      const os = tx.objectStore(store)
      for (const value of values) {
        os.put(value as unknown as never)
      }
    },
    remove: (store: StoreName, key: string) =>
      requestToPromise(tx.objectStore(store).delete(key)).then(() => undefined),
    clear: (store: StoreName) =>
      requestToPromise(tx.objectStore(store).clear()).then(() => undefined),
  }
  try {
    const result = await fn(ctx)
    await completion
    return result
  } catch (error) {
    try {
      tx.abort()
    } catch {
      /* la transacción ya pudo haber terminado */
    }
    throw error
  }
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB()
  return requestToPromise<T[]>(db.transaction(store, 'readonly').objectStore(store).getAll() as IDBRequest<T[]>)
}

export async function getOne<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await openDB()
  return requestToPromise<T | undefined>(
    db.transaction(store, 'readonly').objectStore(store).get(key) as IDBRequest<T | undefined>,
  )
}

export async function putOne<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).put(value as unknown as never)
  await txDone(tx)
}

export async function clearAll(): Promise<void> {
  await withTransaction([...STORES], 'readwrite', async (tx) => {
    for (const store of STORES) await tx.clear(store)
  })
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await openDB()
  const row = await requestToPromise<{ id: string; value: T } | undefined>(
    db.transaction('meta', 'readonly').objectStore('meta').get(key) as IDBRequest<{ id: string; value: T } | undefined>,
  )
  return row?.value
}

export async function setMeta<T>(key: string, value: T): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('meta', 'readwrite')
  tx.objectStore('meta').put({ id: key, value })
  await txDone(tx)
}
