import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clearSession, getSession, getToken } from '../src/services/sessionService.ts'
import { isCartAuthenticationError } from '../src/utils/cartAuthentication.ts'

function withStoredSession(value: string | null, callback: () => void) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  let storedValue = value
  const storage = {
    getItem: () => storedValue,
    removeItem: () => {
      storedValue = null
    },
    setItem: (_key: string, nextValue: string) => {
      storedValue = nextValue
    },
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: storage },
  })

  try {
    callback()
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow)
    } else {
      Reflect.deleteProperty(globalThis, 'window')
    }
  }
}

function createAxiosError(status: number) {
  return Object.assign(new Error('request failed'), {
    isAxiosError: true,
    response: { status },
  })
}

test('a missing or malformed stored session is treated as unauthenticated', () => {
  withStoredSession(null, () => {
    assert.equal(getSession(), null)
    assert.equal(getToken(), null)
  })

  withStoredSession('{invalid json', () => {
    assert.equal(getSession(), null)
    assert.equal(getToken(), null)
  })
})

test('a structurally valid stored session can be read by the existing session service', () => {
  const session = {
    token: 'test-token-not-a-credential',
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.invalid',
    role: 'CLIENT',
  }

  withStoredSession(JSON.stringify(session), () => {
    assert.deepEqual(getSession(), session)
    assert.equal(getToken(), session.token)
    clearSession()
    assert.equal(getSession(), null)
  })
})

test('401 and 403 responses are recognized as authentication failures', () => {
  assert.equal(isCartAuthenticationError(createAxiosError(401)), true)
  assert.equal(isCartAuthenticationError(createAxiosError(403)), true)
})

test('other HTTP failures and non-Axios errors are not treated as authentication failures', () => {
  assert.equal(isCartAuthenticationError(createAxiosError(500)), false)
  assert.equal(isCartAuthenticationError(new Error('network error')), false)
})
