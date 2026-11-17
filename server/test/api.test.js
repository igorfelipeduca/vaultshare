import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, beforeEach, describe, test } from 'node:test'
import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { openDatabase } from '../src/db.js'
import { hashPassword, newId } from '../src/lib/crypto.js'

const PASSWORD = 'senha-forte-123'
const ORIGIN = 'http://localhost:5173'
const PDF_BYTES = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(2048, 'a')])

let app
let db
let storageDir
let passwordHash

before(async () => {
  storageDir = await mkdtemp(join(tmpdir(), 'vaultshare-test-'))
  passwordHash = await hashPassword(PASSWORD)
})

after(async () => {
  await rm(storageDir, { recursive: true, force: true })
})

beforeEach(async () => {
  await app?.close()
  db = openDatabase(':memory:')
  const config = loadConfig({ NODE_ENV: 'test', STORAGE_DIR: storageDir, MAX_UPLOAD_BYTES: '10000' })
  app = await buildApp({ config, db, logger: false })
})

function createUser(email, { quota = 30_000_000_000, requirePassword = 1 } = {}) {
  const id = newId()
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, storage_quota_bytes, require_password, created_at)
     VALUES (?, 'Pessoa Teste', ?, ?, ?, ?, ?)`,
  ).run(id, email, passwordHash, quota, requirePassword, new Date().toISOString())
  return id
}

const writeHeaders = { origin: ORIGIN, 'x-requested-with': 'VaultShare' }

async function login(email) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    headers: writeHeaders,
    payload: { email, password: PASSWORD },
  })
  assert.equal(response.statusCode, 200, response.body)
  const cookie = response.cookies.find((c) => c.name === 'vs_session')
  return `vs_session=${cookie.value}`
}

function api(cookie, method, url, payload) {
  return app.inject({ method, url: `/api/v1${url}`, headers: { ...writeHeaders, cookie }, payload })
}

function multipart(fileName, content) {
  const boundary = '----vaultshare-test'
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`,
    ),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  return { body, contentType: `multipart/form-data; boundary=${boundary}` }
}

async function upload(cookie, fileName, content) {
  const { body, contentType } = multipart(fileName, content)
  return app.inject({
    method: 'POST',
    url: '/api/v1/files/upload',
    headers: { ...writeHeaders, cookie, 'content-type': contentType },
    payload: body,
  })
}

describe('autenticação', () => {
  test('rotas protegidas exigem sessão', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/me' })
    assert.equal(response.statusCode, 401)
    assert.equal(response.json().code, 'UNAUTHORIZED')
  })

  test('login devolve o usuário e um cookie HttpOnly SameSite=Lax', async () => {
    createUser('ana@empresa.com')
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: writeHeaders,
      payload: { email: 'ANA@empresa.com', password: PASSWORD },
    })
    assert.equal(response.statusCode, 200)
    assert.deepEqual(Object.keys(response.json()).sort(), ['email', 'id', 'name', 'plan'])
    const cookie = response.cookies.find((c) => c.name === 'vs_session')
    assert.ok(cookie.httpOnly)
    assert.equal(cookie.sameSite, 'Lax')
    assert.ok(cookie.value.length >= 43)
  })

  test('mesma mensagem para e-mail inexistente e senha errada', async () => {
    createUser('ana@empresa.com')
    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: writeHeaders,
      payload: { email: 'ana@empresa.com', password: 'errada' },
    })
    const unknownEmail = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: writeHeaders,
      payload: { email: 'ninguem@empresa.com', password: 'errada' },
    })
    assert.equal(wrongPassword.statusCode, 401)
    assert.deepEqual(wrongPassword.json(), unknownEmail.json())
  })

  test('limita tentativas de login', async () => {
    createUser('ana@empresa.com')
    const attempt = (remoteAddress, email = 'ana@empresa.com') =>
      app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: writeHeaders,
        remoteAddress,
        payload: { email, password: 'errada' },
      })
    for (let i = 0; i < 5; i++) assert.equal((await attempt(`10.0.0.${i}`)).statusCode, 401)
    assert.equal((await attempt('10.0.0.99', ' ANA@empresa.com ')).statusCode, 429)
  })

  test('logout invalida a sessão no servidor', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    assert.equal((await api(cookie, 'POST', '/auth/logout')).statusCode, 204)
    assert.equal((await api(cookie, 'GET', '/me')).statusCode, 401)
  })

  test('guarda só o hash do token de sessão', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    const token = cookie.split('=')[1]
    const stored = db.prepare('SELECT token_hash FROM sessions').get().token_hash
    assert.notEqual(stored, token)
    assert.equal(stored.length, 64)
  })
})

describe('CSRF', () => {
  test('escrita sem o cabeçalho de segurança é recusada', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/files',
      headers: { cookie, origin: ORIGIN },
      payload: { name: 'x', type: 'PDF' },
    })
    assert.equal(response.statusCode, 403)
  })

  test('escrita de outra origem é recusada', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/files',
      headers: { cookie, origin: 'https://evil.example', 'x-requested-with': 'VaultShare' },
      payload: { name: 'x', type: 'PDF' },
    })
    assert.equal(response.statusCode, 403)
  })

  test('origem com curinga aceita só um trecho de subdomínio', async () => {
    const config = loadConfig({ NODE_ENV: 'test', CORS_ORIGINS: 'https://vaultshare-*-time.vercel.app' })
    const wildcardApp = await buildApp({ config, db, logger: false })
    const loginFrom = (origin) =>
      wildcardApp.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { origin, 'x-requested-with': 'VaultShare' },
        payload: { email: 'ninguem@empresa.com', password: 'errada' },
      })
    assert.equal((await loginFrom('https://vaultshare-git-main-time.vercel.app')).statusCode, 401)
    assert.equal((await loginFrom('https://vaultshare-a.evil.com/x-time.vercel.app')).statusCode, 403)
    assert.equal((await loginFrom('https://vaultshare-x-time.vercel.app.evil.com')).statusCode, 403)
    await wildcardApp.close()
  })
})

describe('conta', () => {
  test('PATCH /me valida e detecta e-mail em uso', async () => {
    createUser('ana@empresa.com')
    createUser('bia@empresa.com')
    const cookie = await login('ana@empresa.com')

    const invalid = await api(cookie, 'PATCH', '/me', { name: '  ', email: 'nao-e-email' })
    assert.equal(invalid.statusCode, 400)
    assert.ok(invalid.json().fields.name)
    assert.ok(invalid.json().fields.email)

    const taken = await api(cookie, 'PATCH', '/me', { name: 'Ana', email: 'BIA@empresa.com' })
    assert.equal(taken.statusCode, 409)

    const ok = await api(cookie, 'PATCH', '/me', { name: 'Ana Souza', email: 'ana.souza@empresa.com' })
    assert.equal(ok.statusCode, 200)
    assert.equal(ok.json().name, 'Ana Souza')
  })

  test('PUT /me/settings exige o objeto completo', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    assert.equal((await api(cookie, 'PUT', '/me/settings', { requirePassword: false })).statusCode, 400)
    const saved = await api(cookie, 'PUT', '/me/settings', {
      requirePassword: false,
      notifyAccess: false,
      allowAccessRequests: true,
    })
    assert.deepEqual(saved.json(), { requirePassword: false, notifyAccess: false, allowAccessRequests: true })
  })
})

describe('arquivos', () => {
  test('POST /files adiciona a extensão e registra evento', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    const created = await api(cookie, 'POST', '/files', { name: 'Relatorio_agosto', type: 'PDF' })
    assert.equal(created.statusCode, 201)
    assert.equal(created.json().name, 'Relatorio_agosto.pdf')
    assert.equal(created.json().sizeBytes, 0)

    const [event] = (await api(cookie, 'GET', '/activity?limit=1')).json()
    assert.equal(event.type, 'file_created')
    assert.equal(event.fileName, 'Relatorio_agosto.pdf')
  })

  test('POST /files recusa tipo fora da lista', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    const response = await api(cookie, 'POST', '/files', { name: 'x', type: 'EXE' })
    assert.equal(response.statusCode, 400)
    assert.equal(response.json().code, 'VALIDATION_ERROR')
  })

  test('upload grava o arquivo criptografado e ignora o caminho enviado', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    const response = await upload(cookie, '../../etc/relatorio.pdf', PDF_BYTES)
    assert.equal(response.statusCode, 201, response.body)
    assert.equal(response.json().name, 'relatorio.pdf')
    assert.equal(response.json().type, 'PDF')
    assert.equal(response.json().sizeBytes, PDF_BYTES.length)

    const { storage_key: key } = db.prepare('SELECT storage_key FROM files').get()
    assert.match(key, /^[0-9a-f-]{36}\.bin$/)
    const onDisk = await readFile(join(storageDir, key))
    assert.equal(onDisk.includes(Buffer.from('%PDF')), false)
  })

  test('upload recusa conteúdo que não bate com a extensão', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    const before = await readdir(storageDir)
    const response = await upload(cookie, 'falso.pdf', Buffer.from('MZ executável'))
    assert.equal(response.statusCode, 400)
    assert.deepEqual(await readdir(storageDir), before)
  })

  test('upload acima do limite responde 413', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    const response = await upload(cookie, 'grande.pdf', Buffer.concat([PDF_BYTES, Buffer.alloc(20_000)]))
    assert.equal(response.statusCode, 413)
  })

  test('upload que estoura a cota responde 507', async () => {
    createUser('ana@empresa.com', { quota: 1000 })
    const cookie = await login('ana@empresa.com')
    const response = await upload(cookie, 'relatorio.pdf', PDF_BYTES)
    assert.equal(response.statusCode, 507)
  })
})

describe('links', () => {
  test('cria link com slug longo, sem expor a senha', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    const file = (await api(cookie, 'POST', '/files', { name: 'a', type: 'PDF' })).json()
    const response = await api(cookie, 'POST', '/links', { fileId: file.id, expiresInDays: 7, password: 'segredo123' })
    assert.equal(response.statusCode, 201, response.body)
    const link = response.json()
    assert.equal(link.hasPassword, true)
    assert.equal(link.fileName, 'a.pdf')
    assert.match(link.url, /^vaultshare\.app\/s\/[\w-]{22}$/)
    assert.equal(JSON.stringify(link).includes('segredo123'), false)
    assert.equal('passwordHash' in link || 'password_hash' in link, false)
  })

  test('exige senha quando requirePassword está ligado', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    const file = (await api(cookie, 'POST', '/files', { name: 'a', type: 'PDF' })).json()
    const response = await api(cookie, 'POST', '/links', { fileId: file.id, expiresInDays: null, password: null })
    assert.equal(response.statusCode, 400)
  })

  test('valida expiração e tamanho da senha', async () => {
    createUser('ana@empresa.com', { requirePassword: 0 })
    const cookie = await login('ana@empresa.com')
    const file = (await api(cookie, 'POST', '/files', { name: 'a', type: 'PDF' })).json()
    assert.equal(
      (await api(cookie, 'POST', '/links', { fileId: file.id, expiresInDays: 3, password: null })).statusCode,
      400,
    )
    assert.equal(
      (await api(cookie, 'POST', '/links', { fileId: file.id, expiresInDays: 1, password: 'curta' })).statusCode,
      400,
    )
    assert.equal(
      (await api(cookie, 'POST', '/links', { fileId: file.id, expiresInDays: null, password: null })).statusCode,
      201,
    )
  })
})

describe('isolamento entre usuários', () => {
  test('ninguém vê nem usa arquivos de outra conta', async () => {
    createUser('ana@empresa.com')
    createUser('bia@empresa.com')
    const ana = await login('ana@empresa.com')
    const bia = await login('bia@empresa.com')
    const file = (await api(ana, 'POST', '/files', { name: 'segredo', type: 'PDF' })).json()

    assert.deepEqual((await api(bia, 'GET', '/files')).json(), [])
    assert.deepEqual((await api(bia, 'GET', '/search?q=segredo')).json().files, [])
    const link = await api(bia, 'POST', '/links', { fileId: file.id, expiresInDays: 1, password: 'segredo123' })
    assert.equal(link.statusCode, 404)
  })
})

describe('visão geral, notificações e busca', () => {
  test('overview soma armazenamento e conta links ativos', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    await upload(cookie, 'relatorio.pdf', PDF_BYTES)
    const overview = (await api(cookie, 'GET', '/overview')).json()
    assert.equal(overview.storageUsedBytes, PDF_BYTES.length)
    assert.equal(overview.protectedFiles, 1)
    assert.equal(overview.activeLinks, 0)
  })

  test('notificações escondem acessos quando notifyAccess está desligado', async () => {
    const userId = createUser('ana@empresa.com')
    db.prepare(
      "INSERT INTO events (id, user_id, type, actor, file_name, created_at) VALUES (?, ?, 'file_accessed', 'x@y.com', 'a.pdf', ?)",
    ).run(newId(), userId, new Date().toISOString())
    const cookie = await login('ana@empresa.com')
    assert.equal((await api(cookie, 'GET', '/notifications')).json().length, 1)
    await api(cookie, 'PUT', '/me/settings', { requirePassword: true, notifyAccess: false, allowAccessRequests: false })
    assert.equal((await api(cookie, 'GET', '/notifications')).json().length, 0)
  })

  test('busca ignora maiúsculas e trata curingas como texto', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    await api(cookie, 'POST', '/files', { name: 'Planejamento', type: 'PDF' })
    assert.equal((await api(cookie, 'GET', '/search?q=PLANEJ')).json().files.length, 1)
    assert.equal((await api(cookie, 'GET', '/search?q=%25')).json().files.length, 0)
    assert.deepEqual((await api(cookie, 'GET', '/search?q=nada')).json(), { files: [], links: [], people: [] })
  })

  test('busca ignora maiúsculas e acentos em letras acentuadas', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    await api(cookie, 'POST', '/files', { name: 'Notas da reunião', type: 'DOCX' })
    for (const q of ['REUNIÃO', 'reuniao', 'Reunião']) {
      const found = (await api(cookie, 'GET', `/search?q=${encodeURIComponent(q)}`)).json().files
      assert.equal(found.length, 1, `busca por "${q}"`)
    }
  })
})

describe('LGPD', () => {
  test('exporta todos os dados da conta sem hashes nem caminhos internos', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    await upload(cookie, 'relatorio.pdf', PDF_BYTES)
    const file = (await api(cookie, 'GET', '/files')).json()[0]
    await api(cookie, 'POST', '/links', { fileId: file.id, expiresInDays: 7, password: 'segredo123' })

    const response = await api(cookie, 'GET', '/me/export')
    assert.equal(response.statusCode, 200)
    assert.match(response.headers['content-disposition'], /attachment/)
    assert.equal(response.headers['cache-control'], 'no-store')
    const data = response.json()
    assert.equal(data.account.email, 'ana@empresa.com')
    assert.equal(data.files.length, 1)
    assert.equal(data.links.length, 1)
    assert.ok(data.activity.length >= 2)
    const raw = response.body
    for (const secret of ['$argon2', 'storage_key', '.bin', 'password_hash', 'segredo123']) {
      assert.equal(raw.includes(secret), false, `export contém ${secret}`)
    }
  })

  test('excluir conta exige a senha e apaga dados, arquivos e sessão', async () => {
    createUser('ana@empresa.com')
    const cookie = await login('ana@empresa.com')
    await upload(cookie, 'relatorio.pdf', PDF_BYTES)
    const { storage_key: key } = db.prepare('SELECT storage_key FROM files').get()

    const wrong = await api(cookie, 'DELETE', '/me', { password: 'errada' })
    assert.equal(wrong.statusCode, 400)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1)

    const ok = await api(cookie, 'DELETE', '/me', { password: PASSWORD })
    assert.equal(ok.statusCode, 204)
    for (const table of ['users', 'sessions', 'files', 'links', 'events', 'contacts']) {
      assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0, table)
    }
    assert.equal((await readdir(storageDir)).includes(key), false)
    assert.equal((await api(cookie, 'GET', '/me')).statusCode, 401)
  })

  test('excluir uma conta não afeta outra', async () => {
    createUser('ana@empresa.com')
    createUser('bia@empresa.com')
    const ana = await login('ana@empresa.com')
    const bia = await login('bia@empresa.com')
    await api(bia, 'POST', '/files', { name: 'da-bia', type: 'PDF' })
    await api(ana, 'DELETE', '/me', { password: PASSWORD })
    assert.equal((await api(bia, 'GET', '/files')).json().length, 1)
  })
})

describe('cadastro', () => {
  const register = (payload) =>
    app.inject({ method: 'POST', url: '/api/v1/auth/register', headers: writeHeaders, payload })

  test('cria a conta e já inicia a sessão', async () => {
    const response = await register({ name: ' Carla Dias ', email: 'carla@empresa.com', password: 'senha-nova-1' })
    assert.equal(response.statusCode, 201, response.body)
    assert.deepEqual(Object.keys(response.json()).sort(), ['email', 'id', 'name', 'plan'])
    assert.equal(response.json().name, 'Carla Dias')

    const cookie = response.cookies.find((c) => c.name === 'vs_session')
    const me = await api(`vs_session=${cookie.value}`, 'GET', '/me')
    assert.equal(me.json().email, 'carla@empresa.com')
    assert.equal(db.prepare('SELECT password_hash FROM users').get().password_hash.startsWith('$argon2id$'), true)
  })

  test('recusa e-mail já cadastrado, sem diferenciar maiúsculas', async () => {
    createUser('ana@empresa.com')
    const response = await register({ name: 'Ana', email: 'ANA@empresa.com', password: 'senha-nova-1' })
    assert.equal(response.statusCode, 409)
    assert.ok(response.json().fields.email)
  })

  test('valida nome, e-mail e tamanho da senha', async () => {
    const response = await register({ name: ' ', email: 'nao-e-email', password: 'curta' })
    assert.equal(response.statusCode, 400)
    const { fields } = response.json()
    assert.ok(fields.name && fields.email && fields.password)
  })
})

describe('link público', () => {
  async function shareUpload({ password = null, expiresInDays = 7 } = {}) {
    createUser('ana@empresa.com', { requirePassword: 0 })
    const cookie = await login('ana@empresa.com')
    const file = (await upload(cookie, 'relatorio.pdf', PDF_BYTES)).json()
    const link = (await api(cookie, 'POST', '/links', { fileId: file.id, expiresInDays, password })).json()
    return { cookie, slug: link.url.split('/s/')[1], linkId: link.id }
  }

  const download = (slug, payload = {}) =>
    app.inject({ method: 'POST', url: `/api/v1/public/links/${slug}/download`, headers: writeHeaders, payload })

  test('mostra os dados do link sem sessão e sem expor o dono', async () => {
    const { slug } = await shareUpload({ password: 'segredo123' })
    const response = await app.inject({ method: 'GET', url: `/api/v1/public/links/${slug}` })
    assert.equal(response.statusCode, 200, response.body)
    assert.deepEqual(response.json(), {
      ...response.json(),
      fileName: 'relatorio.pdf',
      fileType: 'PDF',
      sizeBytes: PDF_BYTES.length,
      hasPassword: true,
      hasContent: true,
    })
    assert.equal(/ana@|userId|hash|storage/i.test(response.body), false)
  })

  test('entrega o arquivo decifrado só com a senha certa e registra o acesso', async () => {
    const { cookie, slug } = await shareUpload({ password: 'segredo123' })
    assert.equal((await download(slug)).statusCode, 400)
    const wrong = await download(slug, { password: 'errada' })
    assert.equal(wrong.statusCode, 400)
    assert.ok(wrong.json().fields.password)

    const ok = await download(slug, { password: 'segredo123' })
    assert.equal(ok.statusCode, 200)
    assert.deepEqual(ok.rawPayload, PDF_BYTES)
    assert.match(ok.headers['content-disposition'], /^attachment; filename\*=UTF-8''relatorio\.pdf$/)

    const [link] = (await api(cookie, 'GET', '/links')).json()
    assert.equal(link.accessCount, 1)
    const [event] = (await api(cookie, 'GET', '/activity?limit=1')).json()
    assert.equal(event.type, 'file_accessed')
    assert.equal(event.actor, 'Alguém com o link')
  })

  test('link expirado, inexistente ou malformado responde 404', async () => {
    const { slug, linkId } = await shareUpload()
    db.prepare('UPDATE links SET expires_at = ? WHERE id = ?').run(new Date(Date.now() - 1000).toISOString(), linkId)
    for (const candidate of [slug, 'A'.repeat(22), '..%2F..%2Fetc']) {
      assert.equal((await app.inject({ method: 'GET', url: `/api/v1/public/links/${candidate}` })).statusCode, 404)
      assert.equal((await download(candidate)).statusCode, 404)
    }
  })

  test('arquivo criado sem conteúdo não tem o que baixar', async () => {
    createUser('ana@empresa.com', { requirePassword: 0 })
    const cookie = await login('ana@empresa.com')
    const file = (await api(cookie, 'POST', '/files', { name: 'vazio', type: 'PDF' })).json()
    const link = (await api(cookie, 'POST', '/links', { fileId: file.id, expiresInDays: null, password: null })).json()
    const slug = link.url.split('/s/')[1]
    const info = await app.inject({ method: 'GET', url: `/api/v1/public/links/${slug}` })
    assert.equal(info.json().hasContent, false)
    assert.equal((await download(slug)).statusCode, 404)
  })
})
