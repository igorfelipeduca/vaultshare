import assert from 'node:assert/strict'
import { test } from 'node:test'
import { eventText, fileMeta, formatBytes, initials, linkRules, relativeTime } from '../src/format.ts'

const now = Date.UTC(2026, 0, 15)
const ago = (ms: number) => new Date(now - ms).toISOString()
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const nbsp = (s: string) => s.replace(/ /g, ' ')

test('formatBytes uses pt-BR decimals', () => {
  assert.equal(nbsp(formatBytes(18_400_000_000)), '18,4 GB')
  assert.equal(formatBytes(840_000), '840 KB')
  assert.equal(formatBytes(0), '0 B')
})

test('relativeTime covers each bucket', () => {
  assert.equal(relativeTime(ago(10_000), { now }), 'agora')
  assert.equal(relativeTime(ago(12 * MIN), { now }), '12 min')
  assert.equal(relativeTime(ago(12 * MIN), { now, ago: true }), 'há 12 min')
  assert.equal(relativeTime(ago(2 * HOUR), { now, ago: true }), 'há 2 h')
  assert.equal(relativeTime(ago(26 * HOUR), { now }), 'ontem')
  assert.equal(relativeTime(ago(3 * DAY), { now }), '3 dias')
  assert.equal(relativeTime(ago(8 * DAY), { now }), '1 sem')
})

test('fileMeta matches the row format', () => {
  const file = { id: '1', name: 'a.pdf', type: 'PDF', sizeBytes: 2_400_000, createdAt: ago(12 * MIN) }
  assert.equal(fileMeta(file, now), 'PDF · 2,4 MB · há 12 min')
})

test('linkRules lists only the active rules', () => {
  const base = {
    id: '1',
    fileId: 'f',
    fileName: 'a',
    url: 'u',
    createdAt: ago(0),
    expiresAt: null,
    hasPassword: false,
    readOnly: false,
    accessCount: 0,
  }
  const labels = (link: typeof base | (Omit<typeof base, 'expiresAt'> & { expiresAt: string })) =>
    linkRules(link, now).map((rule) => rule.label)
  assert.deepEqual(labels({ ...base, expiresAt: new Date(now + 7 * DAY).toISOString(), hasPassword: true }), [
    'Expira em 7 dias',
    'Senha ativa',
  ])
  assert.deepEqual(labels({ ...base, readOnly: true, accessCount: 3 }), ['Somente leitura', '3 acessos'])
  assert.deepEqual(labels({ ...base, expiresAt: new Date(now - DAY).toISOString() }), ['Expirado'])
  assert.deepEqual(labels({ ...base, expiresAt: new Date(now + DAY).toISOString(), accessCount: 1 }), [
    'Expira em 1 dia',
    '1 acesso',
  ])
  assert.deepEqual(labels(base), ['Acesso livre'])
})

test('eventText builds each sentence', () => {
  const event = { id: '1', createdAt: ago(0), actor: 'Lucas', fileName: 'a.pdf' }
  assert.equal(eventText({ ...event, type: 'file_accessed' }), 'Lucas acessou a.pdf')
  assert.equal(eventText({ ...event, type: 'access_requested' }), 'Novo pedido de acesso de Lucas')
})

test('initials handles one, many and no names', () => {
  assert.equal(initials('Marina Costa'), 'MC')
  assert.equal(initials('Marina de Souza Costa'), 'MC')
  assert.equal(initials('marina'), 'M')
  assert.equal(initials('  '), '?')
})
