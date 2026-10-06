export interface SeedActivityInput {
  order: number
  type: 'WORD_RECOGNITION' | 'PICTURE_CHOICE' | 'LISTENING' | 'MATCHING' | 'SPELLING' | 'LISTEN_AND_REPEAT' | 'SENTENCE_BUILDER' | 'SPEAKING' | 'REVIEW' | 'FILL_BLANK'
  title: string
  prompt: string
  instruction?: string
  target: string
  choices?: string[]
  answer?: string
  hint?: string
  difficulty: 'easy' | 'medium' | 'hard'
  xp: number
  estimatedSeconds: number
  voiceEnabled: boolean
  aiEnabled: boolean
}

interface LevelTheme {
  levelNumber: number
  title: string
  words: Array<{ word: string; meaning: string; sound: string; sentence: string; choices: string[]; hint: string }>
}

const GRADE_LEVEL_THEMES: Record<number, LevelTheme[]> = {
  4: [
    {
      levelNumber: 1,
      title: 'Word Explorer',
      words: [
        { word: 'CAT', meaning: 'A small furry pet that meows', sound: 'K-AE-T', sentence: 'I see a cat.', choices: ['CAT', 'DOG', 'SUN'], hint: 'Small animal that says meow.' },
        { word: 'DOG', meaning: 'A friendly pet that barks', sound: 'D-AW-G', sentence: 'The dog can run.', choices: ['BAT', 'DOG', 'BOOK'], hint: 'Friendly pet that barks.' },
        { word: 'SUN', meaning: 'The bright star in the daytime sky', sound: 'S-AH-N', sentence: 'The sun is bright.', choices: ['SUN', 'MOON', 'STAR'], hint: 'Shines bright in the sky.' },
        { word: 'HAPPY', meaning: 'Feeling joyful and smiling', sound: 'H-AE-P-EE', sentence: 'I am very happy today.', choices: ['HAPPY', 'SAD', 'SLEEPY'], hint: 'A wonderful, smiling feeling.' },
        { word: 'BOOK', meaning: 'Pages with stories and words to read', sound: 'B-UH-K', sentence: 'I read a good book.', choices: ['BOOK', 'BALL', 'BELL'], hint: 'Something you read.' },
      ],
    },
    {
      levelNumber: 2,
      title: 'Sentence Builder',
      words: [
        { word: 'APPLE', meaning: 'A sweet red or green fruit', sound: 'AE-P-L', sentence: 'I eat a sweet red apple.', choices: ['APPLE', 'BANANA', 'MANGO'], hint: 'A crunchy, round fruit.' },
        { word: 'TREE', meaning: 'A tall plant with green leaves', sound: 'T-R-EE', sentence: 'Birds sing in the tall tree.', choices: ['TREE', 'FLOWER', 'GRASS'], hint: 'Tall with branches and leaves.' },
        { word: 'WATER', meaning: 'A clear liquid we drink to stay healthy', sound: 'W-AH-T-ER', sentence: 'Please give me clean water.', choices: ['WATER', 'MILK', 'JUICE'], hint: 'Essential drink for life.' },
      ],
    },
    {
      levelNumber: 3,
      title: 'Speaking Starter',
      words: [
        { word: 'FRIEND', meaning: 'Someone you like and play with', sound: 'F-R-EH-N-D', sentence: 'You are my best friend.', choices: ['FRIEND', 'TEACHER', 'COUSIN'], hint: 'A person you love to play with.' },
        { word: 'SCHOOL', meaning: 'A wonderful place where we learn', sound: 'S-K-OO-L', sentence: 'We walk to school together.', choices: ['SCHOOL', 'PARK', 'MARKET'], hint: 'Where students learn every day.' },
        { word: 'GARDEN', meaning: 'A place with blooming flowers and plants', sound: 'G-AA-R-D-N', sentence: 'Red flowers grow in the garden.', choices: ['GARDEN', 'DESK', 'ROOM'], hint: 'Full of green plants and blossoms.' },
      ],
    },
    {
      levelNumber: 4,
      title: 'Story World',
      words: [
        { word: 'BIRD', meaning: 'An animal with wings that can fly', sound: 'B-ER-D', sentence: 'The blue bird flies high.', choices: ['BIRD', 'FISH', 'FROG'], hint: 'Feathery friend in the sky.' },
        { word: 'MORNING', meaning: 'The early part of the day when the sun rises', sound: 'M-AW-R-N-IH-NG', sentence: 'Good morning to my teacher!', choices: ['MORNING', 'NIGHT', 'EVENING'], hint: 'Start of a brand new day.' },
      ],
    },
    {
      levelNumber: 5,
      title: 'Conversation Corner',
      words: [
        { word: 'PLEASE', meaning: 'A polite word used when asking for something', sound: 'P-L-EE-Z', sentence: 'May I have the pencil, please?', choices: ['PLEASE', 'THANK YOU', 'SORRY'], hint: 'Magic polite word.' },
        { word: 'THANK YOU', meaning: 'Words to show gratitude and kindness', sound: 'TH-AE-NG-K Y-OO', sentence: 'Thank you for your kind help.', choices: ['THANK YOU', 'WELCOME', 'HELLO'], hint: 'Said when someone helps you.' },
      ],
    },
    {
      levelNumber: 6,
      title: 'Grammar Garden',
      words: [
        { word: 'PLAYING', meaning: 'Having fun and doing an activity', sound: 'P-L-EY-IH-NG', sentence: 'The children are playing outside.', choices: ['PLAYING', 'SLEEPING', 'EATING'], hint: 'Doing a fun game or sport.' },
        { word: 'BEAUTIFUL', meaning: 'Pleasing to look at and wonderful', sound: 'B-Y-OO-T-IH-F-L', sentence: 'What a beautiful sunny day!', choices: ['BEAUTIFUL', 'DARK', 'NOISY'], hint: 'Very lovely to see.' },
      ],
    },
    {
      levelNumber: 7,
      title: 'Reading Adventure',
      words: [
        { word: 'STORY', meaning: 'An account of people and events for entertainment', sound: 'S-T-AW-R-EE', sentence: 'Tell me an exciting story.', choices: ['STORY', 'NUMBER', 'CLOCK'], hint: 'A tale with adventures.' },
        { word: 'MAGIC', meaning: 'Special, wonderful, and extraordinary', sound: 'M-AE-JH-IH-K', sentence: 'English opens magic doors.', choices: ['MAGIC', 'SLOW', 'HEAVY'], hint: 'Wonderful and enchanting.' },
      ],
    },
    {
      levelNumber: 8,
      title: 'Listening Lab',
      words: [
        { word: 'LISTEN', meaning: 'To pay attention to sound with your ears', sound: 'L-IH-S-N', sentence: 'Listen carefully to the instructions.', choices: ['LISTEN', 'LOOK', 'TOUCH'], hint: 'Using your ears.' },
        { word: 'VOICE', meaning: 'The sound produced through the mouth', sound: 'V-OY-S', sentence: 'Speak with a loud, confident voice.', choices: ['VOICE', 'HAND', 'STEP'], hint: 'The sound when you speak.' },
      ],
    },
    {
      levelNumber: 9,
      title: 'Speaking Quest',
      words: [
        { word: 'BRAVE', meaning: 'Ready to face danger or speak up with confidence', sound: 'B-R-EY-V', sentence: 'I am brave when I practice English.', choices: ['BRAVE', 'AFRAID', 'TIRED'], hint: 'Full of courage.' },
        { word: 'EXPLORE', meaning: 'To travel through and discover new things', sound: 'IH-K-S-P-L-AW-R', sentence: 'Let us explore the Talkora world.', choices: ['EXPLORE', 'STOP', 'HIDE'], hint: 'Discover new places and ideas.' },
      ],
    },
    {
      levelNumber: 10,
      title: 'Final Challenge',
      words: [
        { word: 'CHAMPION', meaning: 'A person who has surpassed all rivals in a contest', sound: 'CH-AE-M-P-EE-AH-N', sentence: 'You are an English champion!', choices: ['CHAMPION', 'BEGINNER', 'GUEST'], hint: 'A winner who worked hard.' },
        { word: 'TALKORA', meaning: 'The magical cartoon world of confident English speaking', sound: 'T-AA-L-K-AW-R-AA', sentence: 'Welcome to Talkora adventure!', choices: ['TALKORA', 'CITY', 'FOREST'], hint: 'Our English home.' },
      ],
    },
  ],
}

export function generateActivitiesForLevel(grade: number, levelNumber: number): SeedActivityInput[] {
  const gradeThemes = GRADE_LEVEL_THEMES[grade] || GRADE_LEVEL_THEMES[4]
  const theme = gradeThemes.find((t) => t.levelNumber === levelNumber) || gradeThemes[0]
  const primary = theme.words[0]
  const secondary = theme.words[1] || theme.words[0]

  return [
    {
      order: 1,
      type: 'WORD_RECOGNITION',
      title: `Meet ${primary.word}`,
      prompt: `Look at the picture. This is ${primary.word}.`,
      instruction: 'Tap "I know this word" when you are ready to continue.',
      target: primary.word,
      choices: ['I know this word'],
      answer: 'I know this word',
      hint: primary.hint,
      difficulty: 'easy',
      xp: 10,
      estimatedSeconds: 30,
      voiceEnabled: false,
      aiEnabled: false,
    },
    {
      order: 2,
      type: 'PICTURE_CHOICE',
      title: 'Picture Match',
      prompt: `Look closely and tap the word that matches the clue: "${primary.meaning}"`,
      target: primary.word,
      choices: primary.choices,
      answer: primary.word,
      hint: primary.hint,
      difficulty: 'easy',
      xp: 10,
      estimatedSeconds: 30,
      voiceEnabled: false,
      aiEnabled: false,
    },
    {
      order: 3,
      type: 'LISTENING',
      title: 'Listening Lab',
      prompt: `Press "Hear the word", listen to Miss Julie, and tap the correct word.`,
      target: secondary.word,
      choices: secondary.choices,
      answer: secondary.word,
      hint: secondary.hint,
      difficulty: 'easy',
      xp: 10,
      estimatedSeconds: 30,
      voiceEnabled: true,
      aiEnabled: false,
    },
    {
      order: 4,
      type: 'MATCHING',
      title: 'Meaning Match',
      prompt: `What is the meaning of "${primary.word}"?`,
      target: primary.word,
      choices: [primary.meaning, 'A heavy stone', 'A fast vehicle'],
      answer: primary.meaning,
      hint: primary.hint,
      difficulty: 'medium',
      xp: 15,
      estimatedSeconds: 35,
      voiceEnabled: false,
      aiEnabled: false,
    },
    {
      order: 5,
      type: 'SPELLING',
      title: 'Spelling Hero',
      prompt: `Tap the letters in the correct order to spell: "${primary.word}"`,
      target: primary.word,
      choices: primary.word.split(''),
      answer: primary.word,
      hint: `Sounds like: ${primary.sound}`,
      difficulty: 'medium',
      xp: 15,
      estimatedSeconds: 40,
      voiceEnabled: false,
      aiEnabled: false,
    },
    {
      order: 6,
      type: 'LISTEN_AND_REPEAT',
      title: 'Listen & Repeat',
      prompt: `Listen to Miss Julie say "${primary.word}", then repeat it aloud.`,
      target: primary.word,
      hint: `Say it clearly: ${primary.sound}`,
      difficulty: 'medium',
      xp: 20,
      estimatedSeconds: 40,
      voiceEnabled: true,
      aiEnabled: true,
    },
    {
      order: 7,
      type: 'SENTENCE_BUILDER',
      title: 'Sentence Builder',
      prompt: `Put the words in order to make a complete English sentence.`,
      target: primary.sentence.toUpperCase(),
      choices: primary.sentence.replace('.', '').split(' '),
      answer: primary.sentence.toUpperCase(),
      hint: 'Start with the subject, then the verb, then the object.',
      difficulty: 'medium',
      xp: 20,
      estimatedSeconds: 50,
      voiceEnabled: false,
      aiEnabled: false,
    },
    {
      order: 8,
      type: 'SPEAKING',
      title: 'Speak With Miss Julie',
      prompt: `Tap the microphone and speak the sentence aloud: "${primary.sentence}"`,
      target: primary.sentence,
      hint: `Speak clearly into your microphone: "${primary.sentence}"`,
      difficulty: 'hard',
      xp: 25,
      estimatedSeconds: 60,
      voiceEnabled: true,
      aiEnabled: true,
    },
    {
      order: 9,
      type: 'REVIEW',
      title: 'Adventure Checkpoint',
      prompt: `Show what you learned in this mission! Tap the words in order: ${primary.word}, ${secondary.word}`,
      target: `${primary.word}, ${secondary.word}`,
      choices: [primary.word, secondary.word, 'PENCIL'],
      answer: `${primary.word}, ${secondary.word}`,
      hint: 'You practiced both words during this adventure.',
      difficulty: 'hard',
      xp: 30,
      estimatedSeconds: 60,
      voiceEnabled: false,
      aiEnabled: false,
    },
  ]
}
