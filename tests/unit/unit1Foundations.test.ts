import {
  UNIT1_MODEL_DIALOGUE, UNIT1_WARMUP_ITEMS, exactRepeatInput, mayCompleteWarmup,
  preferenceTarget, productionEvidence, repeatSupport, warmupScaffold,
} from '../../src/services/unit1-foundations.pedagogy'
import { JULIE_UNIT1_PROFILE, classifyLearnerQuestion, compareWithJulie, detectStudentSkills, extractPersonalFavourite, masteryFor, mergeEvidence } from '../../src/services/pedagogy.service'

describe('Unit 1 foundations pedagogy', () => {
  it('contains all six source warm-up items', () => {
    expect(UNIT1_WARMUP_ITEMS).toEqual(['playing cricket','singing','eating cake','doing homework','eating red chilli','running races'])
  })
  it('accepts genuine like and dislike preferences as language targets', () => {
    expect(preferenceTarget('doing homework', true)).toBe('I like doing homework.')
    expect(preferenceTarget('doing homework', false)).toBe("I don't like doing homework.")
  })
  it('fades scaffolding and distinguishes independent evidence', () => {
    expect([0,1,2,3].map(warmupScaffold)).toEqual(['FULL_MODEL','SENTENCE_STARTER','LIGHT_PROMPT','INDEPENDENT_PROMPT'])
    expect(productionEvidence(0, 0)).toBe('SUPPORTED')
    expect(productionEvidence(3, 0)).toBe('INDEPENDENT')
    expect(productionEvidence(3, 1)).toBe('SUPPORTED')
  })
  it('does not complete merely by opening and respects meaningful participation', () => {
    expect(mayCompleteWarmup({ spokenCount: 0, independentCount: 0, likeCount: 0, dislikeCount: 0, choseAnyDislike: false })).toBe(false)
    expect(mayCompleteWarmup({ spokenCount: 4, independentCount: 1, likeCount: 3, dislikeCount: 1, choseAnyDislike: true })).toBe(true)
  })
  it('preserves model order and binds evaluation to the active line', () => {
    expect(UNIT1_MODEL_DIALOGUE[0]).toBe('Hi! What is your name?')
    expect(UNIT1_MODEL_DIALOGUE.at(-1)).toBe('I like English the most.')
    expect(exactRepeatInput('sport', 'My favourite sport is cricket.', 'My favourite cricket.')).toEqual({ currentLineId: 'sport', currentExpectedText: 'My favourite sport is cricket.', actualTranscript: 'My favourite cricket.' })
  })
  it('caps retry support at a supported repeat instead of trapping the child', () => {
    expect([1,2,3,4,5,8].map(repeatSupport)).toEqual(['NORMAL','SLOW_MODEL','VISUAL_CHUNKS','MODELED_CHUNKS','SUPPORTED_REPEAT','SUPPORTED_REPEAT'])
  })
})

describe('Unit 1 real conversation pedagogy', () => {
  it('accepts and extracts a non-seed personal value only from the student utterance', () => {
    expect(extractPersonalFavourite('My favourite food is biryani.')).toEqual({ key: 'favouriteFood', value: 'biryani', sourceTranscript: 'My favourite food is biryani.' })
    expect(extractPersonalFavourite('Julie likes idli.')).toBeNull()
  })
  it('recognises natural favourite questions and separates all three asking skills', () => {
    expect(detectStudentSkills('Which food is your favourite?')).toEqual(expect.arrayContaining(['ask_julie_question','ask_favourite_question','ask_favourite_food']))
    expect(detectStudentSkills('What sport do you like most?')).toEqual(expect.arrayContaining(['ask_favourite_sport']))
    expect(detectStudentSkills('What is your favourite subject?')).toEqual(expect.arrayContaining(['ask_favourite_subject']))
  })
  it('records the learner name required by the final talk', () => {
    expect(detectStudentSkills('My name is Aarav.')).toEqual(expect.arrayContaining(['name', 'full_sentence']))
  })
  it('keeps Julie preferences stable', () => {
    expect(JULIE_UNIT1_PROFILE.favouriteFood).toBe('idli')
    expect(JULIE_UNIT1_PROFILE.favouriteSport).toBe('badminton')
    expect(Object.isFrozen(JULIE_UNIT1_PROFILE)).toBe(true)
  })
  it('handles expanded place, animal and festival answers', () => {
    expect(detectStudentSkills("My favourite place is my nani's house.")).toContain('favourite_place')
    expect(detectStudentSkills('My favourite animal is cat.')).toContain('favourite_animal')
    expect(detectStudentSkills('My favourite festival is Eid.')).toContain('favourite_festival')
  })
  it('supports who beyond cricket and multiple valid reasons', () => {
    expect(detectStudentSkills('I sing with my sister.')).toContain('sport_company')
    for (const reason of ['Because it is fun.','Because it is exciting.','Because I enjoy it.','Because I play with my friends.']) expect(detectStudentSkills(reason)).toContain('give_reason')
  })
  it('classifies follow-up, clarification and mild off-topic questions', () => {
    expect(classifyLearnerQuestion('Why do you like badminton?')).toBe('LESSON_FOLLOW_UP')
    expect(classifyLearnerQuestion('What does favourite mean?')).toBe('CLARIFICATION')
    expect(classifyLearnerQuestion('Do you like cartoons?')).toBe('MILD_OFF_TOPIC')
  })
  it('uses actual values for same and different comparisons without treating difference as wrong', () => {
    expect(compareWithJulie('favouriteFood', 'idli')).toMatchObject({ same: true, correct: true, pattern: 'We both like idli.' })
    expect(compareWithJulie('favouriteSport', 'cricket')).toMatchObject({ same: false, correct: true, julieValue: 'badminton', studentValue: 'cricket' })
  })
  it('keeps option evidence supported and does not count a clicked question as asking production', () => {
    const option = mergeEvidence([], detectStudentSkills('What is your favourite food?'), 'What is your favourite food?', 1, undefined, 'OPTION')
    expect(option.some((item) => item.skill.startsWith('ask_'))).toBe(false)
    const mic = mergeEvidence([], detectStudentSkills('What is your favourite food?'), 'What is your favourite food?', 1, undefined, 'MIC')
    expect(mic.find((item) => item.skill === 'ask_favourite_food')?.support).toBe('INDEPENDENT')
  })
  it('does not confuse max turns with mastery', () => {
    expect(masteryFor(['sport_company','sport_reason'], [], true)).toBe('NEEDS_PRACTICE')
  })
  it('can satisfy the complete Unit 1 final-talk evidence contract', () => {
    const required = ['name','favourite_food','favourite_sport','sport_company','sport_reason','favourite_subject','subject_reason','extended_favourite','respect_difference']
    const utterances = [
      'My name is Aarav.',
      'My favourite food is biryani.',
      'My favourite sport is cricket and I play with my friends because it is exciting.',
      'My favourite subject is English because I love stories.',
      'My favourite place is the library.',
      'We like different sports, and that is okay.',
    ]
    const evidence = utterances.reduce((items, utterance, index) => mergeEvidence(items, detectStudentSkills(utterance), utterance, index + 1, undefined, 'MIC'), [] as ReturnType<typeof mergeEvidence>)

    expect(masteryFor(required, evidence, false)).toBe('MASTERED')
  })
})
