import { canCompleteLocalActivity } from '../../src/services/localActivity'

describe('local activity completion', () => {
  it('accepts only finished visual warmups and listening models', () => {
    expect(canCompleteLocalActivity('LIKE_DISLIKE', 'Yes, I do. I like cricket.\nNo, I don\'t. I don\'t like chilli.', 2)).toBe(true)
    expect(canCompleteLocalActivity('LIKE_DISLIKE', 'Yes, I do. I like cricket.', 2)).toBe(false)
    expect(canCompleteLocalActivity('LISTEN_MODEL', 'Listened to all 10 turns', 10)).toBe(true)
    expect(canCompleteLocalActivity('LISTEN_MODEL', 'Read all 10 turns', 10)).toBe(true)
    expect(canCompleteLocalActivity('OPEN_CONVERSATION', 'Listened to all 10 turns', 10)).toBe(false)
  })

  it('saves a Favourite Finder reflection only when every published skill has a valid rating', () => {
    const skills = ['Ask and answer favourite questions', 'Ask follow-up questions']
    const valid = JSON.stringify({ kind: 'Favourite Finder reflection', ratings: [
      { skill: skills[0], rating: 'confident' },
      { skill: skills[1], rating: 'need_help' },
    ] })
    expect(canCompleteLocalActivity('PICTURE_CHOICE', valid, 0, skills)).toBe(true)
    expect(canCompleteLocalActivity('PICTURE_CHOICE', 'Viewed lesson reward', 0, skills)).toBe(false)
    expect(canCompleteLocalActivity('PICTURE_CHOICE', JSON.stringify({ kind: 'Favourite Finder reflection', ratings: [{ skill: skills[0], rating: 'confident' }] }), 0, skills)).toBe(false)
    expect(canCompleteLocalActivity('PICTURE_CHOICE', valid.replace('need_help', 'invalid'), 0, skills)).toBe(false)
    expect(canCompleteLocalActivity('PICTURE_CHOICE', 'Viewed lesson reward', 0)).toBe(true)
  })
})
