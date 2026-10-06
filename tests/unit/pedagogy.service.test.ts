import { detectStudentSkills, isVerifiedStudentMemory, masteryFor, mergeEvidence, nextRetryState, type SkillEvidence } from '../../src/services/pedagogy.service'

describe('gold-standard Who and Why pedagogy', () => {
  it('tracks an eight-turn conversation including a real student question', () => {
    const turns = [
      'My favourite sport is cricket.',
      'I play cricket with my cousin.',
      'Because cricket is exciting.',
      'My favourite subject is English.',
      'I like English because I love stories.',
      'Why do you like your favourite sport?',
      'What else do you like about it?',
      'I play it after school with my cousin.',
    ]
    let evidence: SkillEvidence[] = []
    turns.forEach((turn, index) => {
      evidence = mergeEvidence(evidence, detectStudentSkills(turn), turn, index + 1)
    })
    expect(evidence.find((item) => item.skill === 'ask_julie_question')?.utterance).toContain('?')
    expect(evidence.find((item) => item.skill === 'ask_follow_up_question')).toBeDefined()
    expect(evidence.every((item) => item.support === 'INDEPENDENT')).toBe(true)
  })

  it('does not count an incomplete reason until the corrected retry succeeds', () => {
    const weak = 'Because exciting.'
    expect(detectStudentSkills(weak)).not.toContain('sport_reason')
    const retry = nextRetryState({ shouldRetry: true, hintLevel: 3, targetSkill: 'sport_reason', originalUtterance: weak, modelSentence: 'Because it is exciting.' })
    const improved = 'Because it is exciting.'
    const evidence = mergeEvidence([], detectStudentSkills(improved), improved, 2, retry)
    expect(evidence).toContainEqual(expect.objectContaining({ skill: 'sport_reason', support: 'SUPPORTED' }))
    expect(evidence).not.toContainEqual(expect.objectContaining({ skill: 'sport_reason', support: 'INDEPENDENT' }))
  })

  it('escalates hints without losing the original utterance', () => {
    const first = nextRetryState({ shouldRetry: true, hintLevel: 1, targetSkill: 'sport_company', originalUtterance: 'My cousin.' })
    const second = nextRetryState({ previous: first, shouldRetry: true, hintLevel: 2, originalUtterance: 'Cousin.', modelSentence: 'I play cricket with my cousin.' })
    expect(second).toMatchObject({ attempt: 2, hintLevel: 2, originalUtterance: 'My cousin.', targetSkill: 'sport_company' })
  })

  it('does not turn max turns into mastery', () => {
    const required = ['favourite_sport', 'sport_company', 'sport_reason', 'favourite_subject', 'subject_reason', 'ask_julie_question', 'full_sentence']
    const evidence = mergeEvidence([], detectStudentSkills('My favourite sport is cricket.'), 'My favourite sport is cricket.', 10)
    expect(masteryFor(required, evidence, true)).toBe('NEEDS_PRACTICE')
  })

  it('distinguishes mastered from completed with support', () => {
    const required = ['favourite_sport', 'sport_company']
    const independent: SkillEvidence[] = required.map((skill, index) => ({ skill, support: 'INDEPENDENT', utterance: 'example', turn: index + 1 }))
    expect(masteryFor(required, independent, false)).toBe('MASTERED')
    expect(masteryFor(required, [{ ...independent[0]!, support: 'SUPPORTED' }, independent[1]!], false)).toBe('COMPLETED_WITH_SUPPORT')
  })

  it('stores only values present in the child utterance, never Julie-question content', () => {
    expect(isVerifiedStudentMemory('My favourite sport is cricket.', 'cricket')).toBe(true)
    expect(isVerifiedStudentMemory('What is your favourite sport?', 'cricket')).toBe(false)
  })
})
