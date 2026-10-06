import { expect, test } from '@jest/globals'
import request from 'supertest'
import { createApp } from '../src/app'
import { signToken } from '../src/utils/jwt'

test.each(['SCHOOL_ADMIN', 'TEACHER'] as const)('keeps the dashboard chat endpoint working for %s sessions', async (role) => {
  const token = signToken({
    sub: '6ac4bc532738ad4cff3f4a02',
    role,
    schoolId: '6ac4bc532738ad4cff3f4a02',
  })

  const response = await request(createApp())
    .post('/api/educator-ai/chat')
    .set('Authorization', `Bearer ${token}`)
    .send({})

  expect(response.status).toBe(400)
  expect(response.body.error.code).toBe('VALIDATION_ERROR')
})
