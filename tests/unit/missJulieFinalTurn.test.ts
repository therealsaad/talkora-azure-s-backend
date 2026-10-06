import { finalizeConversationTeacherResponse } from '../../src/services/conversationTurns'

describe('final lesson conversation turn', () => {
  it('keeps the reply to the child while ending after five answers', () => {
    const result = finalizeConversationTeacherResponse({
      message: 'I like mangoes too! You explained your favourite food clearly.',
      followUpQuestion: 'What else do you enjoy?',
      activityComplete: false,
    }, true)
    expect(result.message).toContain('mangoes')
    expect(result.followUpQuestion).toBeNull()
    expect(result.activityComplete).toBe(true)
  })
})
