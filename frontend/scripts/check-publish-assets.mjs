import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

test('publishes media without deleting previous assets', () => {
  const directory = mkdtempSync(join(tmpdir(), 'publish-assets-'))
  const log = join(directory, 'commands')
  try {
    writeFileSync(join(directory, 'mcli'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$COMMAND_LOG"\n', {
      mode: 0o755,
    })
    execFileSync('sh', ['scripts/publish-assets.sh'], {
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        COMMAND_LOG: log,
        MINIO_ACCESS_KEY: 'test-key',
        MINIO_SECRET_KEY: 'test-secret',
      },
    })
    assert.deepEqual(readFileSync(log, 'utf8').trim().split('\n'), [
      'alias set local http://object-storage:9000 test-key test-secret',
      'mb --ignore-existing local/public-assets',
      'anonymous set-json /public-assets-policy.json local/public-assets',
      'cp --recursive /assets/ local/public-assets/',
    ])
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('public access only permits reading public asset objects', () => {
  const policy = JSON.parse(readFileSync('scripts/public-assets-policy.json', 'utf8'))
  assert.deepEqual(policy.Statement, [
    {
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
      Resource: ['arn:aws:s3:::public-assets/*'],
    },
  ])
})
