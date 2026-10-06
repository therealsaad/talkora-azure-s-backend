import type {
  ActivityStage,
  ActivityType,
} from '../../models/Activity'

/* =========================================================
   UNIT 1 — MY FAVOURITE THINGS

   Talkora world:
   Wonder Fair

   Core learning flow:

   WARM UP
      ↓
   LISTEN & REPEAT
      ↓
   SPEAK
      ↓
   INTERACT
      ↓
   FOLLOW UP
      ↓
   GIVE REASONS
      ↓
   RESPECT DIFFERENCES
      ↓
   PRACTICE
      ↓
   FINAL CHALLENGE
      ↓
   FINAL TALK

   This file is curriculum DATA.

   UI behavior belongs in the client.
   AI conversation behavior belongs in Miss Julie/Qwen.
   ========================================================= */

/* =========================================================
   SOURCE
   ========================================================= */

const SOURCE_PDF =
  'Talkora syllabus,1.pdf'

/* =========================================================
   TYPES
   ========================================================= */

type ConversationGoal = {
  requiredConcepts: string[]

  minTurns: number

  maxTurns: number
}

type SeedActivity = {
  order: number

  activityKey?: string

  stage: ActivityStage

  core: boolean

  required: boolean

  type: ActivityType

  title: string

  prompt: string

  instruction?: string

  teacherPrompt?: string

  modelSentence?: string

  target?: string

  choices?: string[]

  answer?: string

  answerConfig?: Record<string, unknown>

  hint?: string

  expectedPatterns: string[]

  keywords: string[]

  difficulty:
    | 'easy'
    | 'medium'
    | 'hard'

  xp: number

  estimatedSeconds: number

  voiceEnabled: boolean

  aiEnabled: boolean

  allowMic: boolean

  allowOptions: boolean

  repeatRequired: boolean

  maxConversationTurns: number

  conversationGoal?: ConversationGoal

  source: {
    sourceType:
      | 'SYLLABUS'
      | 'ENRICHMENT'

    pdf: string

    pageStart: number

    pageEnd: number

    label: string
  }

  content?: Record<
    string,
    unknown
  >

  metadata?: Record<
    string,
    unknown
  >
}

/* =========================================================
   SOURCE HELPER
   ========================================================= */

function syllabusSource(
  pageStart: number,
  pageEnd: number,
  label: string,
): SeedActivity['source'] {
  return {
    sourceType:
      'SYLLABUS',

    pdf:
      SOURCE_PDF,

    pageStart,

    pageEnd,

    label,
  }
}

const unit1LearningObjectives = [
  'Ask and answer questions about favourite things using full sentences',
  'Ask follow-up questions to learn more',
  'Use polite language when favourites differ',
  'Speak clearly and maintain eye contact',
  'Hold a meaningful conversation',
]

/* =========================================================
   SHARED VALUES
   ========================================================= */

const common = {
  core: true,

  required: true,

  difficulty:
    'easy' as const,

  estimatedSeconds:
    60,
}

/* =========================================================
   UNIT 1 ACTIVITIES
   ========================================================= */

const legacyUnit1Activities:
  SeedActivity[] = [
    /* =====================================================
       1. WARM-UP

       Goal:
       express LIKE / DON'T LIKE quickly.

       This is intentionally simple.
       ===================================================== */

    {
      ...common,

      order: 1,

      stage:
        'WARM_UP',

      type:
        'LIKE_DISLIKE',

      title:
        'What Do You Like?',

      prompt:
        'How do you feel about playing cricket?',

      instruction:
        'Choose what feels true for you.',

      teacherPrompt:
        'Look at this activity. Do you like playing cricket?',

      choices: [
        'I like it',
        "It's not for me",
      ],

      expectedPatterns: [
        'I like it',
        'I like cricket',
        "I don't like it",
        "I don't like cricket",
        'It is not for me',
        "It's not for me",
      ],

      keywords: [
        'like',
        'cricket',
      ],

      hint:
        'There is no wrong favourite. Choose what is true for you.',

      xp:
        10,

      voiceEnabled:
        false,

      aiEnabled:
        false,

      allowMic:
        false,

      allowOptions:
        true,

      repeatRequired:
        false,

      maxConversationTurns:
        1,

      content: {
        examples: [
          'eating red chilli',
          'doing homework',
          'playing cricket',
          'singing',
          'eating cake',
          'running races',
        ],
      },

      source:
        syllabusSource(
          12,
          12,
          'Warm-up preferences',
        ),
    },

    /* =====================================================
       2. LISTEN MODEL

       Julie models a natural question.
       No evaluation yet.
       ===================================================== */

    {
      ...common,

      order: 2,

      stage:
        'LISTEN_REPEAT',

      type:
        'LISTEN_MODEL',

      title:
        'Listen to Miss Julie',

      prompt:
        'Listen carefully to how Miss Julie asks about favourites.',

      instruction:
        'Listen first. Notice the words favourite and food.',

      teacherPrompt:
        'What is your favourite food?',

      modelSentence:
        'What is your favourite food?',

      target:
        'What is your favourite food?',

      expectedPatterns: [],

      keywords: [
        'favourite',
        'food',
      ],

      xp:
        5,

      estimatedSeconds:
        35,

      voiceEnabled:
        true,

      aiEnabled:
        false,

      allowMic:
        false,

      allowOptions:
        false,

      repeatRequired:
        false,

      maxConversationTurns:
        1,

      source:
        syllabusSource(
          13,
          13,
          'Favourite food question model',
        ),
    },

    /* =====================================================
       3. REPEAT

       Whisper hears child.
       Existing pronunciation/evaluation flow checks it.
       ===================================================== */

    {
      ...common,

      order: 3,

      stage:
        'LISTEN_REPEAT',

      type:
        'REPEAT_SENTENCE',

      title:
        'Say It With Julie',

      prompt:
        'Now repeat the question.',

      instruction:
        'Tap the microphone and say the whole question.',

      teacherPrompt:
        'Your turn. Say: What is your favourite food?',

      modelSentence:
        'What is your favourite food?',

      target:
        'What is your favourite food?',

      expectedPatterns: [
        'What is your favourite food',
        "What's your favourite food",
      ],

      keywords: [
        'favourite',
        'food',
      ],

      hint:
        'Say favourite slowly if you need to.',

      xp:
        15,

      voiceEnabled:
        true,

      aiEnabled:
        false,

      allowMic:
        true,

      allowOptions:
        false,

      repeatRequired:
        true,

      maxConversationTurns:
        1,

      source:
        syllabusSource(
          13,
          14,
          'Listen and repeat favourite question',
        ),
    },

    /* =====================================================
       4. PERSONAL SPEAK — FOOD

       IMPORTANT:
       There is NO fixed "correct favourite".

       Pizza, idli and khichdi are suggestions.
       Student may speak another food through the mic.
       ===================================================== */

    {
      ...common,

      order: 4,

      stage:
        'SPEAK',

      type:
        'SPEAK_PROMPT',

      title:
        'My Favourite Food',

      prompt:
        'What is your favourite food?',

      instruction:
        'Choose an idea or tell Miss Julie your own answer.',

      teacherPrompt:
        'What is your favourite food?',

      modelSentence:
        'My favourite food is ___ .',

      target:
        'My favourite food is idli.',

      choices: [
        'My favourite food is pizza.',
        'My favourite food is idli.',
        'My favourite food is khichdi.',
      ],

      expectedPatterns: [
        'My favourite food is {food}',
        'I like {food} the most',
        'I love {food}',
      ],

      keywords: [
        'favourite',
        'food',
      ],

      hint:
        'Start with: My favourite food is...',

      xp:
        15,

      voiceEnabled:
        true,

      aiEnabled:
        true,

      allowMic:
        true,

      allowOptions:
        true,

      repeatRequired:
        false,

      maxConversationTurns:
        1,

      content: {
        suggestionType:
          'FOOD',

        suggestions: [
          'pizza',
          'idli',
          'khichdi',
        ],
      },

      metadata: {
        memoryCategory:
          'preference',

        memoryKey:
          'favouriteFood',
      },

      source:
        syllabusSource(
          14,
          15,
          'Speaking about favourite food',
        ),
    },

    /* =====================================================
       5. PERSONAL SPEAK — SPORT

       This becomes personal memory for later Qwen turns.
       ===================================================== */

    {
      ...common,

      order: 5,

      stage:
        'SPEAK',

      type:
        'SPEAK_PROMPT',

      title:
        'My Favourite Sport',

      prompt:
        'What is your favourite sport?',

      instruction:
        'Choose an idea or speak your own favourite.',

      teacherPrompt:
        'What is your favourite sport?',

      modelSentence:
        'My favourite sport is ___ .',

      target:
        'My favourite sport is cricket.',

      choices: [
        'My favourite sport is cricket.',
        'My favourite sport is kho-kho.',
        'My favourite sport is football.',
      ],

      expectedPatterns: [
        'My favourite sport is {sport}',
        'I like {sport}',
        'I love playing {sport}',
      ],

      keywords: [
        'favourite',
        'sport',
      ],

      hint:
        'Start with: My favourite sport is...',

      xp:
        15,

      voiceEnabled:
        true,

      aiEnabled:
        true,

      allowMic:
        true,

      allowOptions:
        true,

      repeatRequired:
        false,

      maxConversationTurns:
        1,

      content: {
        suggestionType:
          'SPORT',

        suggestions: [
          'cricket',
          'kho-kho',
          'football',
        ],
      },

      metadata: {
        memoryCategory:
          'preference',

        memoryKey:
          'favouriteSport',
      },

      source:
        syllabusSource(
          14,
          15,
          'Speaking about favourite sport',
        ),
    },

    /* =====================================================
       6. SENTENCE BUILDER — SUBJECT

       Digital fill-in-the-blank style.
       ===================================================== */

    {
      ...common,

      order: 6,

      stage:
        'SPEAK',

      type:
        'SENTENCE_BUILDER',

      title:
        'Build My Favourite Sentence',

      prompt:
        'Complete the sentence about your favourite subject.',

      instruction:
        'Choose a subject, then say the complete sentence.',

      teacherPrompt:
        'Which subject do you like the most?',

      modelSentence:
        'I like ___ the most.',

      target:
        'I like English the most.',

      choices: [
        'English',
        'Maths',
        'EVS',
        'Physical Education',
      ],

      expectedPatterns: [
        'I like {subject} the most',
        'My favourite subject is {subject}',
        'I like {subject}',
      ],

      keywords: [
        'like',
        'subject',
      ],

      hint:
        'Your sentence can begin with: I like...',

      xp:
        15,

      estimatedSeconds:
        70,

      voiceEnabled:
        true,

      aiEnabled:
        true,

      allowMic:
        true,

      allowOptions:
        true,

      repeatRequired:
        false,

      maxConversationTurns:
        1,

      content: {
        sentenceTemplate:
          'I like ___ the most.',
      },

      metadata: {
        memoryCategory:
          'preference',

        memoryKey:
          'favouriteSubject',
      },

      source:
        syllabusSource(
          15,
          15,
          'Favourite subject sentence practice',
        ),
    },

    /* =====================================================
       7. FIRST REAL TWO-WAY CONVERSATION

       This is where Talkora becomes Talkora.

       Julie should:
       1. ask favourite
       2. acknowledge answer
       3. ask one natural follow-up
       4. child answers
       5. backend goal becomes complete

       FRONTEND MUST NOT auto-next after first turn.
       ===================================================== */

    {
      ...common,

      order: 7,

      stage:
        'INTERACT',

      type:
        'OPEN_CONVERSATION',

      title:
        'Chat With Miss Julie',

      prompt:
        'Tell Miss Julie about one of your favourite things.',

      instruction:
        'Choose an idea or answer with your microphone. Miss Julie will ask you more.',

      teacherPrompt:
        'Tell me about one of your favourite things.',

      modelSentence:
        'My favourite ___ is ___ .',

      choices: [
        'My favourite food is pizza.',
        'My favourite sport is cricket.',
        'My favourite subject is English.',
      ],

      expectedPatterns: [
        'My favourite {category} is {value}',
        'I like {value}',
        'I love {value}',
      ],

      keywords: [
        'favourite',
        'like',
        'love',
      ],

      hint:
        'Tell Miss Julie something that is true for you.',

      xp:
        25,

      estimatedSeconds:
        150,

      voiceEnabled:
        true,

      aiEnabled:
        true,

      allowMic:
        true,

      allowOptions:
        true,

      repeatRequired:
        false,

      maxConversationTurns:
        12,

      conversationGoal: {
        requiredConcepts: [
          'name',
          'favourite_food',
          'favourite_sport',
          'sport_company',
          'sport_reason',
          'favourite_subject',
        ],

        minTurns:
          6,

        maxTurns:
          12,
      },

      metadata: {
        conversationMode:
          'OPEN',

        useStudentMemory:
          true,

        memoryCategory:
          'preference',
      },

      source:
        syllabusSource(
          16,
          18,
          'Two-way favourites conversation',
        ),
    },

    /* =====================================================
       8. FOLLOW-UP LANGUAGE MODEL
       ===================================================== */

    {
      ...common,

      order: 8,

      stage:
        'FOLLOW_UP',

      type:
        'REPEAT_SENTENCE',

      title:
        'Ask One More Question',

      prompt:
        'Listen and repeat a useful follow-up question.',

      instruction:
        'Say the question clearly.',

      teacherPrompt:
        'Who do you play cricket with?',

      modelSentence:
        'Who do you play cricket with?',

      target:
        'Who do you play cricket with?',

      expectedPatterns: [
        'Who do you play cricket with',
        'Who do you play with',
      ],

      keywords: [
        'who',
        'play',
        'with',
      ],

      hint:
        'Raise your voice slightly at the end of the question.',

      xp:
        15,

      voiceEnabled:
        true,

      aiEnabled:
        false,

      allowMic:
        true,

      allowOptions:
        false,

      repeatRequired:
        true,

      maxConversationTurns:
        1,

      source:
        syllabusSource(
          18,
          19,
          'Follow-up question practice',
        ),
    },

    /* =====================================================
       9. GIVE A REASON
       ===================================================== */

    {
      ...common,

      order: 9,

      stage:
        'REASONS',

      type:
        'SPEAK_PROMPT',

      title:
        'Tell Me Why',

      prompt:
        'Why do you like your favourite subject?',

      instruction:
        'Give your answer and add a reason using because.',

      teacherPrompt:
        'Why do you like your favourite subject?',

      modelSentence:
        'I like ___ because ___ .',

      choices: [
        'I like English because I love storybooks.',
        'I like Maths because I enjoy solving problems.',
        'I like EVS because I enjoy learning about Earth.',
      ],

      expectedPatterns: [
        'I like {subject} because {reason}',
        'My favourite subject is {subject} because {reason}',
        'I love {subject} because {reason}',
      ],

      keywords: [
        'because',
      ],

      hint:
        'Use because to explain your reason.',

      xp:
        20,

      estimatedSeconds:
        75,

      voiceEnabled:
        true,

      aiEnabled:
        true,

      allowMic:
        true,

      allowOptions:
        true,

      repeatRequired:
        false,

      maxConversationTurns:
        1,

      metadata: {
        memoryCategory:
          'preferenceReason',
      },

      source:
        syllabusSource(
          19,
          20,
          'Giving reasons for favourites',
        ),
    },

    /* =====================================================
       10. FOLLOW-UP CONVERSATION

       Student now answers AND participates naturally.
       ===================================================== */

    {
      ...common,

      order: 10,

      stage:
        'FOLLOW_UP',

      type:
        'FOLLOW_UP_CONVERSATION',

      title:
        'Keep the Conversation Going',

      prompt:
        'Answer Miss Julie and continue the conversation.',

      instruction:
        'Listen to Julie, answer her question and keep talking.',

      teacherPrompt:
        'Who do you usually enjoy your favourite activity with?',

      modelSentence:
        'I ___ with ___.',

      choices: [
        'I play cricket with my cousins.',
        'I read stories with my sister.',
        'I play with my friends.',
      ],

      expectedPatterns: [
        'I {activity} with {person}',
        'I do it with {person}',
        'I play with {person}',
      ],

      keywords: [
        'with',
      ],

      hint:
        'Tell Julie who shares the activity with you.',

      xp:
        25,

      estimatedSeconds:
        140,

      voiceEnabled:
        true,

      aiEnabled:
        true,

      allowMic:
        true,

      allowOptions:
        true,

      repeatRequired:
        false,

      maxConversationTurns:
        4,

      conversationGoal: {
        requiredConcepts: [
          'answer_follow_up',
          'give_detail',
        ],

        minTurns:
          2,

        maxTurns:
          4,
      },

      metadata: {
        conversationMode:
          'OPEN',

        useStudentMemory:
          true,
      },

      source:
        syllabusSource(
          19,
          20,
          'Continuing a favourites conversation',
        ),
    },

    /* =====================================================
       11. RESPECT DIFFERENCES
       ===================================================== */

    {
      ...common,

      order: 11,

      stage:
        'RESPECT_DIFFERENCES',

      type:
        'VISUAL_CHOICE',

      title:
        'Different Favourites Are Okay',

      prompt:
        'Miss Julie likes football, but you like cricket. What is a kind response?',

      instruction:
        'Choose the respectful response.',

      teacherPrompt:
        'We can like different things. Which answer sounds kind and respectful?',

      choices: [
        'You like football and I like cricket. We have different favourites.',
        'Football is a bad choice.',
        'Only cricket is good.',
      ],

      answer:
        'You like football and I like cricket. We have different favourites.',

      expectedPatterns: [
        'We have different favourites',
        'You like {thing} and I like {thing}',
        'That is okay',
      ],

      keywords: [
        'different',
        'favourites',
      ],

      hint:
        'Good conversations respect different opinions.',

      xp:
        15,

      voiceEnabled:
        false,

      aiEnabled:
        false,

      allowMic:
        false,

      allowOptions:
        true,

      repeatRequired:
        false,

      maxConversationTurns:
        1,

      source:
        syllabusSource(
          21,
          23,
          'Respecting different preferences',
        ),
    },

    /* =====================================================
       12. FINAL CHALLENGE

       Guided open speaking.
       ===================================================== */

    {
      ...common,

      order: 12,

      stage:
        'FINAL_CHALLENGE',

      type:
        'SPEAK_PROMPT',

      title:
        'Pick & Talk',

      prompt:
        'Choose one favourite and tell Miss Julie more about it.',

      instruction:
        'Say your favourite, give one reason and add one detail.',

      teacherPrompt:
        'Choose one topic and tell me about your favourite.',

      modelSentence:
        'My favourite ___ is ___ because ___ .',

      choices: [
        'Food',
        'Sport',
        'Subject',
        'Festival',
        'Animal',
        'Place',
      ],

      expectedPatterns: [
        'My favourite {topic} is {value} because {reason}',
        'I like {value} because {reason}',
      ],

      keywords: [
        'favourite',
        'because',
      ],

      hint:
        'Try to say at least two complete sentences.',

      xp:
        30,

      estimatedSeconds:
        120,

      voiceEnabled:
        true,

      aiEnabled:
        true,

      allowMic:
        true,

      allowOptions:
        true,

      repeatRequired:
        false,

      maxConversationTurns:
        2,

      content: {
        topics: [
          'food',
          'sport',
          'subject',
          'festival',
          'animal',
          'place',
        ],
      },

      metadata: {
        finalChallenge:
          true,

        useStudentMemory:
          true,
      },

      source:
        syllabusSource(
          24,
          25,
          'Pick and Talk challenge',
        ),
    },

    /* =====================================================
       13. FINAL TALK

       Full two-way conversation.

       No fixed answer.
       No fake MCQ correctness.
       Julie should use remembered favourites when possible.
       ===================================================== */

    {
      ...common,

      order: 13,

      stage:
        'FINAL_TALK',

      type:
        'FINAL_CONVERSATION',

      title:
        'Final Talk With Miss Julie',

      prompt:
        'Have a real conversation with Miss Julie about your favourite things.',

      instruction:
        'Answer naturally. Give a reason and respond to Julie’s follow-up questions.',

      teacherPrompt:
        'We have talked about lots of favourites today. Tell me about one favourite that is special to you.',

      modelSentence:
        'My favourite ___ is ___ because ___ .',

      choices: [
        'My favourite sport is cricket.',
        'My favourite festival is Eid.',
        'My favourite subject is English.',
      ],

      expectedPatterns: [
        'My favourite {category} is {value}',
        'I like {value} because {reason}',
        'I love {value} because {reason}',
      ],

      keywords: [
        'favourite',
        'because',
      ],

      hint:
        'Talk to Julie just like you would talk to your teacher.',

      xp:
        35,

      estimatedSeconds:
        180,

      voiceEnabled:
        true,

      aiEnabled:
        true,

      allowMic:
        true,

      allowOptions:
        true,

      repeatRequired:
        false,

      maxConversationTurns:
        4,

      conversationGoal: {
        requiredConcepts: [
          'state_favourite',
          'give_reason',
          'answer_follow_up',
        ],

        minTurns:
          2,

        maxTurns:
          4,
      },

      metadata: {
        conversationMode:
          'OPEN',

        interactionPoint:
          'MISS_JULIE',

        useStudentMemory:
          true,

        finalConversation:
          true,
      },

      source:
        syllabusSource(
          24,
          25,
          'Final favourites conversation',
        ),
    },
  ]

/* Thirteen syllabus episodes preserve the existing name, repeat and practice steps while adding
   the expanded conversation and final badge from the book. Each
   episode keeps a stable order/key when seeded, and conversational episodes
   own several turns and concepts rather than one answer. */
export const previousUnit1FavouriteThingsActivities: SeedActivity[] = [
  {
    ...legacyUnit1Activities[0]!, order: 1, stage: 'WARM_UP', type: 'MCQ',
    title: 'Favourite Fair Quiz', prompt: 'Which of these is a sport?', teacherPrompt: 'Which of these is a sport?',
    instruction: 'Tap the correct picture or word.', choices: ['Cricket', 'Cake', 'Homework'], answer: 'Cricket',
    target: 'Cricket', allowMic: false, allowOptions: true, aiEnabled: false, voiceEnabled: true, repeatRequired: false,
    metadata: { conversationMode: 'CONTROLLED', digitalType: 'MULTIPLE_CHOICE', optionMode: true, micMode: false, ttsText: 'Which of these is a sport?' },
    source: syllabusSource(12, 12, 'Favourites warm-up'),
  },
  {
    ...legacyUnit1Activities[0]!, order: 2, stage: 'WARM_UP', type: 'MCQ',
    title: 'Word Meaning', prompt: 'What does favourite mean?', teacherPrompt: 'What does favourite mean?',
    instruction: 'Choose one answer.', choices: ['The one I like the most', 'Something I never use', 'Something very small'],
    answer: 'The one I like the most', target: 'The one I like the most', allowMic: false, allowOptions: true,
    aiEnabled: false, voiceEnabled: true, repeatRequired: false,
    metadata: { conversationMode: 'CONTROLLED', digitalType: 'MULTIPLE_CHOICE', optionMode: true, micMode: false, ttsText: 'What does favourite mean?' },
    source: syllabusSource(12, 14, 'Favourites vocabulary'),
  },
  {
    ...legacyUnit1Activities[2]!, order: 3, stage: 'LISTEN_REPEAT', type: 'REPEAT_SENTENCE',
    title: 'Meet Miss Julie', prompt: 'Hi! What is your name?',
    instruction: 'Tell Miss Julie your name using a full sentence.',
    target: 'My name is Aarav.', modelSentence: 'My name is Aarav.',
    choices: [], allowMic: true, allowOptions: false, aiEnabled: false, repeatRequired: true,
    maxConversationTurns: 1,
    metadata: { conversationMode: 'CONTROLLED', digitalType: 'PERSONAL_NAME', expectedPhrase: 'My name is Aarav.', learningObjectives: unit1LearningObjectives },
    source: syllabusSource(13, 13, 'Say your name in a complete sentence'),
  },
  {
    ...legacyUnit1Activities[1]!, order: 4, stage: 'LISTEN_REPEAT', type: 'LISTEN_MODEL',
    title: 'Hear the Conversation', prompt: 'Listen to a real favourites conversation.',
    instruction: 'Notice how each person listens, answers, and asks the next question.',
    allowMic: false, allowOptions: false, aiEnabled: false,
    repeatRequired: false, maxConversationTurns: 10,
    content: { dialogueTurns: [
      { role: 'missJulie', text: 'Hi! What is your name?' }, { role: 'modelStudent', text: 'My name is Aarav.' },
      { role: 'missJulie', text: 'What is your favourite food?' }, { role: 'modelStudent', text: 'My favourite food is noodles.' },
      { role: 'missJulie', text: 'What food do you like?' }, { role: 'modelStudent', text: 'I like pizza the best.' },
      { role: 'missJulie', text: 'What is your favourite sport?' }, { role: 'modelStudent', text: 'My favourite sport is cricket.' },
      { role: 'missJulie', text: 'Which school subject do you like the most?' }, { role: 'modelStudent', text: 'I like English the most.' },
    ] },
    metadata: { conversationMode: 'CONTROLLED', digitalType: 'MODEL_CONVERSATION', dialogueChunked: true, listenOnly: true, modelSentence: 'Hi! What is your name?', ttsText: 'Hi! What is your name?', learningObjectives: unit1LearningObjectives },
    source: syllabusSource(13, 13, 'Basic favourites model dialogue'),
  },
  {
    ...legacyUnit1Activities[2]!, order: 5, stage: 'LISTEN_REPEAT', type: 'REPEAT_SENTENCE',
    title: 'Listen & Repeat', prompt: 'Listen, then repeat: What is your favourite food?',
    instruction: 'Listen to Miss Julie first, then repeat the question.',
    target: 'What is your favourite food?', modelSentence: 'What is your favourite food?',
    choices: [], allowMic: true, allowOptions: false, aiEnabled: false, repeatRequired: true,
    metadata: { conversationMode: 'CONTROLLED', digitalType: 'READ_REPEAT', expectedPhrase: 'What is your favourite food?', learningObjectives: unit1LearningObjectives },
    source: syllabusSource(13, 14, 'Repeat a favourite question'),
  },
  {
    ...legacyUnit1Activities[2]!, order: 6, stage: 'LISTEN_REPEAT', type: 'REPEAT_SENTENCE',
    title: 'Listen, Repeat & Swap Roles', prompt: 'Now you are part of the conversation.',
    instruction: 'Repeat the learner turns. Then swap roles and ask Miss Julie.',
    allowMic: true, allowOptions: false, aiEnabled: false, repeatRequired: true,
    maxConversationTurns: 5,
    content: { dialogueTurns: [
      { id: 'answer-name', role: 'answer', julieText: 'Hi! What is your name?', text: 'My name is Aarav.' },
      { id: 'answer-food', role: 'answer', julieText: 'What is your favourite food?', text: 'My favourite food is noodles.' },
      { id: 'answer-sport', role: 'answer', julieText: 'What is your favourite sport?', text: 'My favourite sport is cricket.' },
      { id: 'ask-food', role: 'ask', julieText: 'Now you ask me about food!', text: 'What is your favourite food?', julieAnswer: 'My favourite food is idli!' },
      { id: 'ask-sport', role: 'ask', julieText: 'Ask me one more question!', text: 'What is your favourite sport?', julieAnswer: 'My favourite sport is badminton!' },
    ] },
    metadata: { conversationMode: 'CONTROLLED', digitalType: 'EXACT_LINE_ROLE_SWAP', exactActiveLine: true, hintLadder: ['normal','slow_model','visual_chunks','modeled_chunks','supported_repeat'], juliePreferences: { food: 'idli', sport: 'badminton' }, learningObjectives: unit1LearningObjectives },
    source: syllabusSource(13, 14, 'Favourite dialogue repeat and reciprocal questioning'),
  },
  {
    ...legacyUnit1Activities[3]!, order: 7, stage: 'SPEAK', type: 'OPEN_CONVERSATION',
    title: 'Speak About Your Favourites',
    prompt: 'Okay, now I want to know about YOU! What is your favourite food?',
    teacherPrompt: 'What is your favourite food?', maxConversationTurns: 5,
    choices: ['My favourite food is ___.'],
    conversationGoal: { requiredConcepts: ['favourite_food','favourite_sport','favourite_subject','full_sentence'], minTurns: 4, maxTurns: 5 },
    metadata: { conversationMode: 'OPEN', digitalType: 'PERSONAL_FAVOURITES', useStudentMemory: true, scaffoldSequence: ['FULL_STARTER','WHOLE_SENTENCE_PROMPT','INDEPENDENT'], masteryEvidence: ['favourite_food','favourite_sport','favourite_subject','full_sentence'], transition: "You've told me so much about YOU. Now it's only fair that you get to interview ME!", learningObjectives: unit1LearningObjectives },
    source: syllabusSource(14, 15, 'Personal food, sport and subject speaking'),
  },
  {
    ...legacyUnit1Activities[5]!, order: 8, stage: 'PRACTICE_ZONE', type: 'SENTENCE_BUILDER',
    title: 'My Practice Zone', prompt: 'Complete the lines about your favourite place, animal, and festival.',
    instruction: 'Fill in your own answers. Then say each complete sentence aloud.',
    target: 'I like the park the most.', choices: ['park', 'playground', 'library', 'home'],
    allowMic: true, allowOptions: true, aiEnabled: false, repeatRequired: false,
    content: { fillPrompts: [
      { question: 'Which place do you like the most?', template: 'I like ___ the most.' },
      { question: 'What is your favourite animal?', template: 'My favourite animal is ___.' },
      { question: 'Which festival or holiday is your favourite?', template: '___ is my favourite festival.' },
    ], festivalIdeas: ['Diwali', 'Christmas', 'Eid', 'Holi'] },
    metadata: { conversationMode: 'CONTROLLED', digitalType: 'FILL_BLANK_PRACTICE', learningObjectives: unit1LearningObjectives },
    source: syllabusSource(15, 15, 'Practice Zone: place, animal, and festival'),
  },
  {
    ...legacyUnit1Activities[6]!, order: 9, stage: 'INTERACT', type: 'OPEN_CONVERSATION',
    title: 'Ask Miss Julie', prompt: "You've told me your favourites. Now it's YOUR turn to interview me!",
    teacherPrompt: 'Ask me about my favourite food.', maxConversationTurns: 5,
    choices: ['What is your favourite food?'],
    conversationGoal: { requiredConcepts: ['ask_favourite_food','ask_favourite_sport','ask_favourite_subject'], minTurns: 3, maxTurns: 5 },
    metadata: { conversationMode: 'OPEN', digitalType: 'CHILD_INTERVIEWS_JULIE', useStudentMemory: true, julieProfile: { food: 'idli', sport: 'badminton', subject: 'English', place: 'the library', animal: 'elephant', festival: 'Diwali' }, masteryEvidence: ['ask_favourite_food','ask_favourite_sport','ask_favourite_subject'], transition: "Great questions! Let's discover a few more favourites.", learningObjectives: unit1LearningObjectives },
    source: syllabusSource(13, 20, 'Reciprocal favourite questions'),
  },
  {
    ...legacyUnit1Activities[6]!, order: 10, stage: 'INTERACT', type: 'OPEN_CONVERSATION',
    title: 'Expand the Conversation', prompt: "We've talked about food and sport. What place do you really like?",
    teacherPrompt: 'What is your favourite place?', maxConversationTurns: 5,
    conversationGoal: { requiredConcepts: ['favourite_place','favourite_animal','favourite_festival','expanded_detail'], minTurns: 4, maxTurns: 5 },
    metadata: {
      conversationMode: 'OPEN',
      digitalType: 'EXPANDED_FAVOURITES',
      useStudentMemory: true,
      learningObjectives: unit1LearningObjectives,
      hintLadder: ['NORMAL_PROMPT','SEMANTIC_HINT','SENTENCE_STARTER','FULL_MODEL','REPEAT_WITH_JULIE'],
      masteryEvidence: ['favourite_place','favourite_animal','favourite_festival','expanded_detail'],
      transition: 'Now we know WHAT we like. Let’s talk about WHO and WHY!',
    },
    source: syllabusSource(15, 16, 'Place, animal and festival conversation expansion'),
  },
  {
    ...legacyUnit1Activities[9]!, order: 11, stage: 'FOLLOW_UP', type: 'FOLLOW_UP_CONVERSATION',
    title: 'Who & Why', prompt: 'You told me your favourite earlier. Let’s talk about who and why.',
    teacherPrompt: 'Who do you enjoy it with?', maxConversationTurns: 5,
    conversationGoal: { requiredConcepts: ['sport_company','sport_reason','ask_follow_up_question','full_sentence'], minTurns: 4, maxTurns: 5 },
    metadata: { conversationMode: 'OPEN', digitalType: 'FOLLOW_UP_INTERVIEW', useStudentMemory: true, hintLadder: ['NORMAL_PROMPT','SEMANTIC_HINT','SENTENCE_STARTER','FULL_MODEL','REPEAT_WITH_JULIE'], masteryEvidence: ['sport_company','sport_reason','ask_follow_up_question','full_sentence'], transition: "You and I like some of the same things—and some different things. Let's talk about that!", learningObjectives: unit1LearningObjectives },
    source: syllabusSource(16, 20, 'Who, why and learner follow-up conversation'),
  },
  {
    ...legacyUnit1Activities[10]!, order: 12, stage: 'RESPECT_DIFFERENCES', type: 'OPEN_CONVERSATION',
    title: 'Same, Different & Kind', prompt: 'Let’s compare our real favourites.',
    teacherPrompt: 'You told me what you like. What is the same or different about us?', maxConversationTurns: 5,
    choices: ['We both like ___.','We like different ___.','That sounds fun!'],
    conversationGoal: { requiredConcepts: ['compare_favourites','respect_difference'], minTurns: 2, maxTurns: 5 },
    metadata: { conversationMode: 'OPEN', digitalType: 'POLITE_DIFFERENCES', useStudentMemory: true, julieProfile: { food: 'idli', sport: 'badminton', subject: 'English', place: 'the library', animal: 'elephant', festival: 'Diwali' }, masteryEvidence: ['compare_favourites','respect_difference'], learningObjectives: unit1LearningObjectives },
    source: syllabusSource(21, 23, 'Same and different favourites with respectful language'),
  },
  {
    ...legacyUnit1Activities[12]!, order: 13, stage: 'FINAL_TALK', type: 'FINAL_CONVERSATION',
    title: 'Final Talk With Miss Julie',
    prompt: "Ready for our final chat? Let's see how much we have learned about each other. What's your name?",
    teacherPrompt: "What's your name?", maxConversationTurns: 5,
    conversationGoal: { requiredConcepts: ['name','favourite_food','favourite_sport','sport_company','sport_reason','favourite_subject','subject_reason','extended_favourite','respect_difference'], minTurns: 5, maxTurns: 5 },
    metadata: { conversationMode: 'OPEN', digitalType: 'FINAL_CONVERSATION', finalConversation: true, useStudentMemory: true, learningObjectives: unit1LearningObjectives },
    source: syllabusSource(24, 25, 'Final Talk favourite-things assessment'),
  },
  {
    ...legacyUnit1Activities[12]!, order: 14, stage: 'REWARD', type: 'PICTURE_CHOICE',
    title: 'Favourite Finder Badge', prompt: 'You completed your favourite-things conversation!',
    instruction: 'Celebrate the speaking skills you used with Miss Julie.', target: 'Favourite Finder',
    choices: ['Ask and answer','Ask follow-ups','Speak politely','Use full sentences'],
    aiEnabled: false, allowMic: false, allowOptions: false, repeatRequired: false, maxConversationTurns: 1,
    conversationGoal: undefined, xp: 0,
    content: { badge: 'Favourite Finder', skills: ['Ask and answer favourite questions in full sentences','Ask follow-up questions','Speak politely when preferences differ','Discuss different favourites, look at your partner, and speak clearly'], homePractice: 'Ask a family member about their favourites. Record another conversation together and notice how your English has grown.' },
    metadata: { digitalType: 'BADGE_REWARD', awardOnce: true },
    source: syllabusSource(25, 25, 'Favourite Finder badge and unit reflection'),
  },
]

/*
 * Class 4 progression: warm up, model, recognise, speak, play, build,
 * converse, respect differences, complete a challenge, and celebrate.
 */
export const unit1FavouriteThingsActivities: SeedActivity[] = [
  {
    ...legacyUnit1Activities[0]!,
    activityKey: 'class4-unit1-favourites-warm-up', order: 1, stage: 'WARM_UP', type: 'LIKE_DISLIKE',
    title: 'Like or Dislike?', prompt: 'Tap YES or NO for each picture. Choose what you really like.',
    teacherPrompt: 'Hey! Let us play a quick game!', instruction: 'Look at each picture and choose YES or NO.',
    choices: [], answer: undefined, answerConfig: undefined, target: 'I like pizza.', modelSentence: 'I like pizza.',
    voiceEnabled: true, aiEnabled: false, allowMic: false, allowOptions: false, repeatRequired: false, maxConversationTurns: 1,
    content: { visualPrompts: [
      { label: 'pizza', assetKey: 'pizza' },
      { label: 'football', assetKey: 'football' },
      { label: 'cats', assetKey: 'cats' },
      { label: 'music', assetKey: 'singing' },
    ] },
    metadata: { conversationMode: 'CONTROLLED', digitalType: 'VISUAL_WARM_UP', learningObjectives: unit1LearningObjectives },
    source: syllabusSource(12, 13, 'Like and dislike warm-up'),
  },
  {
    ...legacyUnit1Activities[2]!,
    activityKey: 'class4-unit1-favourites-listen-repeat', order: 2, stage: 'LISTEN_REPEAT', type: 'REPEAT_SENTENCE',
    title: 'Listen & Learn', prompt: 'Listen to Miss Julie and repeat a helpful sentence.',
    teacherPrompt: 'Listen: I like pizza.', instruction: 'Listen to this useful sentence, then say the same sentence yourself.',
    target: 'I like pizza.', modelSentence: 'I like pizza.', choices: [], answer: undefined, answerConfig: undefined,
    voiceEnabled: true, aiEnabled: false, allowMic: true, allowOptions: false, repeatRequired: true, maxConversationTurns: 1,
    metadata: { conversationMode: 'CONTROLLED', digitalType: 'READ_REPEAT', expectedPhrase: 'I like pizza.', learningObjectives: unit1LearningObjectives },
    source: syllabusSource(13, 14, 'Listen to and repeat a useful favourite sentence'),
  },
  {
    ...legacyUnit1Activities[0]!,
    activityKey: 'class4-unit1-favourites-sentence-mcq', order: 3, stage: 'SPEAK', type: 'MCQ',
    title: 'Choose the Correct Sentence', prompt: 'Choose the sentence that goes with the pizza picture.',
    teacherPrompt: 'Look at this pizza. Which sentence is correct?', instruction: 'Tap the sentence that sounds right.',
    choices: ['I like pizza.', 'I pizza like.', 'Pizza I am.'], answer: 'I like pizza.', answerConfig: undefined,
    target: 'I like pizza.', modelSentence: 'I like pizza.', voiceEnabled: true, aiEnabled: false, allowMic: false, allowOptions: true, repeatRequired: false,
    content: { visualAssetKey: 'pizza', assetLabel: 'A delicious pizza' },
    metadata: { conversationMode: 'CONTROLLED', digitalType: 'MCQ', assetKey: 'pizza', learningObjectives: unit1LearningObjectives },
    source: syllabusSource(14, 14, 'Recognise a correct like sentence'),
  },
  {
    ...legacyUnit1Activities[3]!,
    activityKey: 'class4-unit1-favourites-speak', order: 4, stage: 'SPEAK', type: 'OPEN_CONVERSATION',
    title: 'Tell Julie What You Like', prompt: 'Tell Miss Julie one food you like in a full sentence.',
    teacherPrompt: 'What food do you like? You can say, “I like pizza.”',
    instruction: 'Say your own answer. Try: “I like ...”', target: 'I like pizza.', modelSentence: 'I like ___ .', choices: [],
    answer: undefined, answerConfig: undefined, aiEnabled: true, voiceEnabled: true, allowMic: true, allowOptions: false, repeatRequired: false, maxConversationTurns: 1,
    conversationGoal: { requiredConcepts: ['favourite_food', 'full_sentence'], minTurns: 1, maxTurns: 1 },
    metadata: { conversationMode: 'OPEN', digitalType: 'PERSONAL_FAVOURITES', useStudentMemory: true, learningObjectives: unit1LearningObjectives },
    source: syllabusSource(14, 15, 'Say a personal favourite food in a full sentence'),
  },
  {
    ...legacyUnit1Activities[0]!,
    activityKey: 'class4-unit1-favourites-favourite-hunt', order: 5, stage: 'WARM_UP', type: 'LIKE_DISLIKE',
    title: 'Favourite Hunt', prompt: 'Find out which things you like. Tap YES or NO for each picture.',
    teacherPrompt: 'Let us go on a favourite hunt!', instruction: 'Choose YES or NO for football, drawing, and mangoes.',
    choices: [], answer: undefined, answerConfig: undefined, target: 'I like drawing.', modelSentence: 'I like drawing.',
    voiceEnabled: true, aiEnabled: false, allowMic: false, allowOptions: false, repeatRequired: false, maxConversationTurns: 1,
    content: { visualPrompts: [
      { label: 'football', assetKey: 'football' },
      { label: 'drawing', assetKey: 'art' },
      { label: 'mangoes', assetKey: 'mango' },
    ] },
    metadata: { conversationMode: 'CONTROLLED', digitalType: 'VISUAL_WARM_UP', learningObjectives: unit1LearningObjectives },
    source: syllabusSource(15, 15, 'Favourite hunt with sport, hobby and food choices'),
  },
  {
    ...legacyUnit1Activities[5]!,
    activityKey: 'class4-unit1-favourites-sentence-builder', order: 6, stage: 'PRACTICE_ZONE', type: 'SENTENCE_BUILDER',
    title: 'Build a Favourite Sentence', prompt: 'Build a sentence: “My favourite ___ is ___.”',
    teacherPrompt: 'Let us build a sentence together!', instruction: 'Pick a category and something you like, then say the whole sentence.',
    target: 'My favourite food is pizza.', modelSentence: 'My favourite food is pizza.',
    choices: [], answer: 'My favourite food is pizza.',
    answerConfig: { acceptedAnswers: [
      'My favourite food is pizza.', 'My favourite food is noodles.', 'My favourite food is mangoes.',
      'My favourite sport is cricket.', 'My favourite sport is football.',
      'My favourite hobby is drawing.', 'My favourite hobby is music.',
    ] },
    voiceEnabled: false, aiEnabled: false, allowMic: false, allowOptions: true, repeatRequired: false, maxConversationTurns: 1,
    content: { sentenceBuilder: {
      prefix: 'My favourite', connector: 'is', categories: ['food', 'sport', 'hobby'],
      optionsByCategory: { food: ['pizza', 'noodles', 'mangoes'], sport: ['cricket', 'football'], hobby: ['drawing', 'music'] },
    } },
    metadata: { conversationMode: 'CONTROLLED', digitalType: 'SENTENCE_BUILDER', learningObjectives: unit1LearningObjectives },
    source: syllabusSource(15, 16, 'Build a personal favourite sentence'),
  },
  {
    ...legacyUnit1Activities[6]!,
    activityKey: 'class4-unit1-favourites-ai-conversation', order: 7, stage: 'INTERACT', type: 'OPEN_CONVERSATION',
    title: 'Talk With Miss Julie', prompt: 'Talk about a favourite food and drink. Tell Julie why you like them.',
    teacherPrompt: 'So, what is your favourite food?', instruction: 'Answer Julie, then keep the conversation going.',
    target: undefined, modelSentence: undefined, choices: [], answer: undefined, answerConfig: undefined,
    aiEnabled: true, voiceEnabled: true, allowMic: true, allowOptions: false, repeatRequired: false, maxConversationTurns: 5,
    conversationGoal: { requiredConcepts: ['favourite_food', 'food_reason', 'favourite_drink', 'full_sentence'], minTurns: 3, maxTurns: 5 },
    metadata: { conversationMode: 'OPEN', digitalType: 'GUIDED_FAVOURITES_CHAT', useStudentMemory: true, learningObjectives: unit1LearningObjectives },
    source: syllabusSource(16, 20, 'Guided favourite food and drink conversation'),
  },
  {
    ...legacyUnit1Activities[10]!,
    activityKey: 'class4-unit1-favourites-respect-differences', order: 8, stage: 'RESPECT_DIFFERENCES', type: 'MCQ',
    title: 'Different Favourites, Same Friends', prompt: 'Ali likes football. Sara likes drawing. What is true?',
    teacherPrompt: 'Listen to Ali and Sara’s choices.',
    instruction: 'Choose the kind and true answer.',
    choices: ['They must like the same thing.', 'They can like different things.', 'Nobody can choose.'],
    answer: 'They can like different things.', target: 'They can like different things.', answerConfig: undefined,
    modelSentence: undefined, voiceEnabled: true, aiEnabled: false, allowMic: false, allowOptions: true, repeatRequired: false,
    metadata: { conversationMode: 'CONTROLLED', digitalType: 'MCQ', learningObjectives: unit1LearningObjectives },
    source: syllabusSource(21, 23, 'Respect differences in preferences'),
  },
  {
    ...legacyUnit1Activities[12]!,
    activityKey: 'class4-unit1-favourites-final-challenge', order: 9, stage: 'FINAL_CHALLENGE', type: 'FINAL_CONVERSATION',
    title: 'Three Things I Like', prompt: 'Tell Miss Julie three things you like: a food, a sport, and a hobby.',
    teacherPrompt: 'Your final challenge! Tell me three things you like.',
    instruction: 'Use full sentences. You can say why you like one of them.',
    choices: [], answer: undefined, answerConfig: undefined, target: undefined, modelSentence: undefined,
    aiEnabled: true, voiceEnabled: true, allowMic: true, allowOptions: false, repeatRequired: false, maxConversationTurns: 3,
    conversationGoal: { requiredConcepts: ['favourite_food', 'favourite_sport', 'hobby', 'full_sentence'], minTurns: 1, maxTurns: 3 },
    metadata: { conversationMode: 'OPEN', digitalType: 'FINAL_CONVERSATION', finalConversation: true, useStudentMemory: true, learningObjectives: unit1LearningObjectives },
    source: syllabusSource(24, 25, 'Final challenge: share three real favourites'),
  },
  {
    ...legacyUnit1Activities[12]!,
    activityKey: 'class4-unit1-favourites-reward', order: 10, stage: 'REWARD', type: 'PICTURE_CHOICE',
    title: 'Favourite Finder Unlocked!', prompt: 'You did it! Your Favourite Finder badge is unlocked.',
    teacherPrompt: 'You did it! Your Favourite Finder badge is unlocked.',
    instruction: 'Celebrate the new things you can say.', target: 'Favourite Finder', modelSentence: undefined,
    choices: ['Ask and answer', 'Build a full sentence', 'Speak kindly', 'Share what you like'],
    answer: undefined, answerConfig: undefined, xp: 0, aiEnabled: false, voiceEnabled: false, allowMic: false, allowOptions: false, repeatRequired: false, maxConversationTurns: 1,
    content: { badge: 'Favourite Finder', skills: [
      'Say what you like in full sentences', 'Build a sentence about a favourite',
      'Keep a conversation going', 'Speak kindly when preferences differ',
    ], homePractice: 'Ask a family member about their favourite food, sport, or hobby. Tell them one of your favourites too.' },
    metadata: { digitalType: 'BADGE_REWARD', awardOnce: true },
    source: syllabusSource(25, 25, 'Favourite Finder badge and lesson reflection'),
  },
]
