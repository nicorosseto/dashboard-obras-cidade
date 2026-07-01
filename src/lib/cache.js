// Cache local de datasets grandes (Sistema Geo ~175k, Emergências) em IndexedDB.
//
// Por que IndexedDB e não localStorage: o localStorage tem limite de ~5-10 MB e
// guarda só texto; as ~175k linhas do Sistema Geo passam disso. O IndexedDB
// armazena objetos estruturados (sem JSON.stringify) e tem cota de centenas de
// MB a GB.
//
// Como é usado (padrão "stale-while-revalidate"):
//   1. ao abrir, lê o cache e MOSTRA na hora (instantâneo);
//   2. em segundo plano, compara a "versão" (versaoTabela) com a do servidor;
//   3. só rebusca pela rede se a versão mudou (ou se não havia cache).
//
// Tudo é best-effort: se o IndexedDB falhar (modo privado, cota, etc.), as
// funções degradam para "sem cache" sem quebrar o app.

const DB_NAME = 'obras-cache'
const STORE = 'datasets'
const DB_VERSION = 1

function abrirDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Lê uma entrada do cache. Retorna o objeto gravado ({ versao, linhas }) ou null.
export async function lerCache(chave) {
  try {
    const db = await abrirDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(chave)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

// Grava (ou substitui) uma entrada. `valor` deve ser { versao, linhas }.
export async function gravarCache(chave, valor) {
  try {
    const db = await abrirDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(valor, chave)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // cache é best-effort; falha ao gravar não afeta o funcionamento
  }
}

// Remove uma entrada (ex.: após um upload que substitui os dados da tabela).
export async function limparCache(chave) {
  try {
    const db = await abrirDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(chave)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // best-effort
  }
}
