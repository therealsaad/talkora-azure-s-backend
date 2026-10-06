import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals'
import { Types } from 'mongoose'
import { Activity } from '../../src/models/Activity'
import { VoiceSession } from '../../src/models/VoiceSession'
import { MissJulieService } from '../../src/services/missJulie.service'
import { VoiceService } from '../../src/services/voice.service'
import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from './dbTestUtils'

describe('Conversation transcript retry', () => {
  beforeAll(connectTestDatabase)
  afterAll(disconnectTestDatabase)
  afterEach(async () => { jest.restoreAllMocks(); await clearTestDatabase() })

  it('keeps a voice session retryable after an AI error and returns the same reply for duplicate submission', async () => {
    const studentId = new Types.ObjectId()
    const lessonId = new Types.ObjectId()
    const activity = await Activity.create({ lessonId, order: 1, type: 'OPEN_CONVERSATION', stage: 'SPEAK', title: 'Favourite food', prompt: 'What is your favourite food?', target: 'What is your favourite food?', aiEnabled: true, metadata: { conversationMode: 'OPEN' }, status: 'active' })
    const session = await VoiceSession.create({ studentId, lessonId, activityId: activity._id, startedAt: new Date(), provider: 'groq-whisper', status: 'active' })
    const reply = { message: 'Pizza sounds tasty.', emotion: 'encouraging', followUpQuestion: 'Who do you eat it with?' } as Awaited<ReturnType<typeof MissJulieService.converse>>
    const ai = jest.spyOn(MissJulieService, 'converse').mockRejectedValueOnce(new Error('temporary Groq error')).mockResolvedValue(reply)

    await expect(VoiceService.submitTranscript(studentId.toString(), session._id.toString(), { transcript: 'My favourite food is pizza.' })).rejects.toThrow('temporary Groq error')
    expect((await VoiceSession.findById(session._id))?.status).toBe('active')

    const result = await VoiceService.submitTranscript(studentId.toString(), session._id.toString(), { transcript: 'My favourite food is pizza.' })
    expect(result).toHaveProperty('aiResponse.message', 'Pizza sounds tasty.')
    expect((await VoiceSession.findById(session._id))?.status).toBe('completed')

    const duplicate = await VoiceService.submitTranscript(studentId.toString(), session._id.toString(), { transcript: 'My favourite food is pizza.' })
    expect(duplicate).toHaveProperty('aiResponse.message', 'Pizza sounds tasty.')
    expect(ai).toHaveBeenCalledTimes(2)
  })
})
