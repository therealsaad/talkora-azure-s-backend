import { buildSystemPrompt, detectLearnerLanguage } from '../../src/providers/ai/GroqProvider'

describe('Miss Julie multilingual English teaching', () => {
  it('recognizes Hindi, Urdu, and Romanized Hindustani without forcing STT to English', () => {
    expect(detectLearnerLanguage('कैसे हो')).toBe('HINDI')
    expect(detectLearnerLanguage('آپ کیسے ہیں')).toBe('URDU')
    expect(detectLearnerLanguage('kaise ho')).toBe('ROMANIZED_HINDUSTANI')
    expect(detectLearnerLanguage('How are you?')).toBe('ENGLISH_OR_OTHER')
  })

  it('asks Groq to teach the English equivalent and correct grammar in English', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('kaise ho')
    expect(prompt).toContain('How are you?')
    expect(prompt).toContain('Urdu')
    expect(prompt).toContain('corrected English sentence')
    expect(prompt).toContain('English only')
  })
})
