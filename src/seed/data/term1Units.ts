import type { ActivityStage, ActivityType } from '../../models/Activity'

type A = {
  order: number
  stage: ActivityStage
  core: boolean
  type: ActivityType
  title: string
  prompt: string
  target: string
  choices?: string[]
  answer?: string
  hint?: string
  difficulty: 'easy' | 'medium' | 'hard'
  xp: number
  estimatedSeconds: number
  voiceEnabled: boolean
  aiEnabled: boolean
  metadata?: Record<string, unknown>
  content?: Record<string, unknown>
  activityKey?: string
  instruction?: string
  teacherPrompt?: string
  modelSentence?: string
  conversationGoal?: {
    requiredConcepts: string[]
    minTurns: number
    maxTurns: number
  }
  source?: {
    sourceType: 'SYLLABUS' | 'ENRICHMENT'
    pdf?: string
    pageStart?: number
    pageEnd?: number
    label?: string
  }
}

const base = {
  core: true,
  difficulty: 'easy' as const,
  estimatedSeconds: 75,
}

const choice = (
  order: number,
  stage: ActivityStage,
  title: string,
  prompt: string,
  choices: string[],
  answer: string,
  digitalType: string,
): A => ({
  ...base,
  order,
  stage,
  type: 'MCQ',
  title,
  prompt,
  target: answer,
  choices,
  answer,
  xp: 15,
  voiceEnabled: true,
  aiEnabled: false,
  metadata: {
    digitalType,
    optionMode: true,
    micMode: false,
    allowMic: false,
    expectedPhrase: answer,
    conversationMode: 'CONTROLLED',
    followUpEnabled: false,
    ttsText: prompt,
  },
})

const speak = (
  order: number,
  stage: ActivityStage,
  title: string,
  prompt: string,
  target: string,
  digitalType: string,
  conversationMode: 'OPEN' | 'CONTROLLED' =
    stage === 'INTERACT' || stage === 'FINAL_TALK' ? 'OPEN' : 'CONTROLLED',
): A => ({
  ...base,
  order,
  stage,
  type:
    stage === 'INTERACT' || stage === 'FINAL_TALK'
      ? 'CONVERSATION'
      : stage === 'PRESENT' || stage === 'FINAL_CHALLENGE'
        ? 'PRESENTATION'
        : 'SPEAKING',
  title,
  prompt,
  target,
  xp: 20,
  voiceEnabled: true,
  aiEnabled: true,
  metadata: {
    digitalType,
    micMode: true,
    allowMic: true,
    expectedPhrase: target,
    conversationMode,
    followUpEnabled: conversationMode === 'OPEN',
    ttsText: prompt,
  },
})

const unit2Profile = {
  name: 'Maya',
  age: '9',
  favouriteFood: 'dosa',
  afterSchoolActivity: 'playing with her dog',
  hobby: 'drawing',
  bestFriend: 'Anaya',
}

const unit2LearningObjectives = [
  'Interview a partner and listen for accurate personal details',
  'Check notes with follow-up questions before making a poster',
  'Organise partner facts into full sentences and present clearly',
]

function unit2Metadata(
  digitalType: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    digitalType,
    learningObjectives: unit2LearningObjectives,
    allowedVocabulary: [
      'partner',
      'interview',
      'favourite',
      'after school',
      'hobby',
      'best friend',
      'poster',
      'present',
    ],
    ...extra,
  }
}

function unit2Source(label: string) {
  return {
    sourceType: 'SYLLABUS' as const,
    pdf: 'Talkora syllabus,1.pdf',
    pageStart: 27,
    pageEnd: 42,
    label,
  }
}

const unit2AuthoredActivities: A[] = [
  choice(
    1,
    'PRACTICE_ZONE',
    'A Kind First Question',
    'Which polite question helps you learn about a new partner?',
    ['How old are you?', 'Give me your paper.', 'Why are you so quiet?'],
    'How old are you?',
    'INTERVIEW',
  ),
  {
    ...base,
    order: 2,
    stage: 'LISTEN_REPEAT',
    type: 'LISTEN_MODEL',
    title: 'Listen to a Partner Interview',
    prompt: 'Listen to Maya and her partner. Notice how each question helps collect one fact.',
    target: 'Listen to all the questions and answers.',
    xp: 15,
    voiceEnabled: true,
    aiEnabled: false,
    content: {
      dialogueTurns: [
        { role: 'missJulie', text: 'What is your name?' },
        { role: 'modelStudent', text: 'My name is Maya.' },
        { role: 'missJulie', text: 'How old are you?' },
        { role: 'modelStudent', text: 'I am nine years old.' },
        { role: 'missJulie', text: 'What is your favourite food?' },
        { role: 'modelStudent', text: 'My favourite food is dosa.' },
        { role: 'missJulie', text: 'What do you like to do after school?' },
        { role: 'modelStudent', text: 'I like playing with my dog after school.' },
        { role: 'missJulie', text: 'What is your hobby?' },
        { role: 'modelStudent', text: 'My hobby is drawing.' },
        { role: 'missJulie', text: 'Who is your best friend?' },
        { role: 'modelStudent', text: 'My best friend is Anaya.' },
      ],
    },
    metadata: unit2Metadata('MODEL_CONVERSATION', {
      conversationMode: 'CONTROLLED',
      listenOnly: true,
      ttsText: 'Listen to Maya and her partner. Notice how each question helps collect one fact.',
    }),
    source: unit2Source('Partner interview model'),
  },
  {
    ...base,
    order: 3,
    stage: 'LISTEN_REPEAT',
    type: 'REPEAT_SENTENCE',
    title: 'Practise an Interview Question',
    prompt: 'Listen, then say the question clearly.',
    instruction: 'Ask one question at a time and listen carefully to the answer.',
    target: 'What do you like to do after school?',
    modelSentence: 'What do you like to do after school?',
    xp: 20,
    voiceEnabled: true,
    aiEnabled: false,
    metadata: unit2Metadata('READ_REPEAT', {
      conversationMode: 'CONTROLLED',
      micMode: true,
      allowMic: true,
      repeatRequired: true,
      expectedPhrase: 'What do you like to do after school?',
    }),
    source: unit2Source('Interview question practice'),
  },
  {
    ...choice(
      4,
      'PRACTICE_ZONE',
      'Check What You Heard',
      'Maya said her hobby is drawing. What can you ask to check your notes?',
      [
        'You said your hobby is drawing. Is that right?',
        'What is your favourite colour?',
        'Can I draw for you?',
      ],
      'You said your hobby is drawing. Is that right?',
      'FOLLOW_UP_QUESTION',
    ),
    source: unit2Source('Check partner details'),
  },
  {
    ...base,
    order: 5,
    stage: 'INTERACT',
    type: 'CONVERSATION',
    title: 'Interview Your Practice Partner',
    prompt: 'Pretend Miss Julie is your practice partner. Ask about her name, age, favourite food, after-school activity, hobby and best friend.',
    instruction: 'Ask one question at a time. Listen to the answer and use a full question.',
    target: 'Ask your partner questions to learn six facts.',
    xp: 25,
    voiceEnabled: true,
    aiEnabled: true,
    conversationGoal: {
      requiredConcepts: [
        'partner_name',
        'partner_age',
        'partner_favourite_food',
        'partner_after_school_activity',
        'partner_hobby',
        'partner_best_friend',
        'ask_follow_up_question',
      ],
      minTurns: 5,
      maxTurns: 8,
    },
    metadata: unit2Metadata('PARTNER_INTERVIEW', {
      conversationMode: 'OPEN',
      micMode: true,
      allowMic: true,
      followUpEnabled: true,
      julieProfile: unit2Profile,
      partnerProfile: unit2Profile,
      roleplay: 'Miss Julie is the practice partner Maya. Answer only from the supplied partner profile.',
    }),
    source: unit2Source('Interview a partner'),
  },
  {
    ...choice(
      6,
      'FOLLOW_UP',
      'Verify a Partner Fact',
      'You wrote that Maya likes playing with her dog after school. What should you do before making the poster?',
      [
        'Ask Maya to check that you heard correctly.',
        'Guess another activity.',
        'Leave the poster blank.',
      ],
      'Ask Maya to check that you heard correctly.',
      'FOLLOW_UP_QUESTION',
    ),
    source: unit2Source('Check partner details'),
  },
  {
    ...base,
    order: 7,
    stage: 'PRACTICE_ZONE',
    type: 'SENTENCE_BUILDER',
    title: 'Build a True Poster Sentence',
    prompt: 'Use your interview notes to make a clear “All About” poster.',
    instruction: 'Say or type a full sentence. Use he or she for your partner.',
    target: 'This is Maya. She is nine years old. Her favourite food is dosa.',
    modelSentence: 'This is Maya. She is nine years old. Her favourite food is dosa.',
    xp: 20,
    voiceEnabled: true,
    aiEnabled: false,
    metadata: unit2Metadata('FILL_BLANK_PRACTICE', {
      conversationMode: 'CONTROLLED',
      micMode: true,
      allowMic: true,
      allowTypedAnswer: true,
      expectedPhrase: 'This is Maya. She is nine years old. Her favourite food is dosa.',
    }),
    source: unit2Source('Make an All About poster'),
  },
  {
    ...speak(
      8,
      'PRESENT',
      'Add More Partner Details',
      'Add your partner’s after-school activity, hobby and best friend to the poster.',
      'She likes playing with her dog after school. Her hobby is drawing. Her best friend is Anaya.',
      'PRESENTATION',
      'CONTROLLED',
    ),
    source: unit2Source('Make an All About poster'),
  },
  {
    ...choice(
      9,
      'PRESENT',
      'Ready to Present',
      'What helps your class understand your poster?',
      [
        'Stand straight, look at the group and speak clearly.',
        'Turn away and whisper.',
        'Read every word as fast as possible.',
      ],
      'Stand straight, look at the group and speak clearly.',
      'PRESENTATION_SKILLS',
    ),
    source: unit2Source('Present to a group'),
  },
  {
    ...speak(
      10,
      'FINAL_CHALLENGE',
      'Partner Presenter Challenge',
      'Introduce your partner in an organised short speech. Begin with their name, share checked details and finish politely.',
      'Hello. This is my partner Maya. She is nine years old. Her favourite food is dosa. She likes drawing. Thank you for listening.',
      'FINAL_CHALLENGE',
      'OPEN',
    ),
    source: unit2Source('Final partner presentation challenge'),
  },
  {
    ...speak(
      11,
      'FINAL_TALK',
      'Present Your Partner',
      'Present your “All About” poster. Speak clearly, look at your audience and use your notes only when needed.',
      'This is my partner Maya. She is nine years old. Her favourite food is dosa. She likes playing with her dog after school. Her hobby is drawing, and her best friend is Anaya.',
      'PRESENTATION',
      'OPEN',
    ),
    source: unit2Source('Final partner presentation'),
  },
]

export const unit2PartnerActivities = unit2AuthoredActivities.map((activity) => ({
  ...activity,
  activityKey: `class4-unit2-partner-v2-activity${activity.order}`,
  source: activity.source || unit2Source(activity.title),
}))

export const unit3OrderActivities: A[] = [
  choice(1,'WARM_UP','Taste and texture','Which word describes a crispy dosa?',['crispy','sleepy','late'],'crispy','IMAGE_CHOICE'),
  speak(2,'LISTEN_REPEAT','Polite order model','Listen and repeat.','I would like a dosa, please.','LISTEN_REPEAT'),
  choice(3,'SPEAK','Choose your order','What would you like to order?',['I would like a dosa, please.','Give dosa.','Yesterday dosa.'],'I would like a dosa, please.','MIC_RESPONSE'),
  speak(4,'INTERACT','Talkora Café waiter','Order one food and one drink from Miss Julie.','I would like idli and a glass of water, please.','ROLEPLAY'),
  choice(5,'PRACTICE_ZONE','Confirm the order','The waiter repeats your order correctly. What do you say?',['Yes, thank you.','No calendar.','I wake up.'],'Yes, thank you.','MULTIPLE_CHOICE'),
  choice(6,'PRACTICE_ZONE','Ask for repetition','You did not hear the waiter. What can you say?',['Can you please repeat that?','No, thank you.','It is crispy.'],'Can you please repeat that?','MODEL_DIALOGUE'),
  speak(7,'INTERACT','Food feedback','Tell the waiter how your food tastes.','The dosa is crispy and delicious. Thank you.','MIC_RESPONSE'),
  choice(8,'PRACTICE_ZONE','Polite refusal','The waiter offers another drink. You do not want it.',['No, thank you.','Go away.','I yesterday.'],'No, thank you.','MULTIPLE_CHOICE'),
  speak(9,'FINAL_CHALLENGE','Menu Master roleplay','Complete an order, confirmation and polite thank-you.','I would like chole bhature, please. Yes, that is my order. Thank you.','FINAL_CHALLENGE'),
  speak(10,'FINAL_TALK','Final café talk','Have a complete restaurant conversation with Miss Julie.','Good afternoon. May I see the menu, please?','BADGE_REWARD'),
]

export const unit4CalendarActivities: A[] = [
  choice(1,'WARM_UP','Past, routine or future','Which word tells us about the past?',['yesterday','every day','tomorrow'],'yesterday','ORDERING'),
  speak(2,'LISTEN_REPEAT','Yesterday model','Listen and repeat.','Yesterday I went to the park with my sister. I felt happy.','LISTEN_REPEAT'),
  speak(3,'SPEAK','Talk about the past','Say where you went, who went with you and how you felt.','Yesterday I went to the market with my mother. I felt excited.','MIC_RESPONSE'),
  choice(4,'PRACTICE_ZONE','Order the morning routine','What happens first?',['I wake up at seven.','I go to school.','I go to bed.'],'I wake up at seven.','ORDERING'),
  speak(5,'INTERACT','Daily routine interview','Answer Miss Julie’s routine questions.','I wake up at seven and eat idli for breakfast.','INTERVIEW'),
  choice(6,'PRACTICE_ZONE','Travel to school','Complete the sentence: I go to school ___.',['by bus','tomorrow','happy'],'by bus','FILL_BLANK'),
  speak(7,'SPEAK','After school','Tell what you do after school and when you go to bed.','After school I play outside. I go to bed at nine.','MIC_RESPONSE'),
  speak(8,'LISTEN_REPEAT','Future model','Listen and repeat.','Tomorrow I will visit my grandmother with my family.','LISTEN_REPEAT'),
  speak(9,'INTERACT','Future plans','Say where and when you will go, who will join you and how you feel.','Next week I will visit Pune with my family. I feel excited.','FOLLOW_UP_QUESTION'),
  speak(10,'FINAL_CHALLENGE','Calendar challenge','Combine yesterday, your daily routine and tomorrow.','Yesterday I played cricket. Every day I go to school. Tomorrow I will visit my cousin.','FINAL_CHALLENGE'),
  speak(11,'FINAL_TALK','Final calendar talk','Have a complete past, routine and future conversation with Miss Julie.','Let me tell you about yesterday, every day and tomorrow.','BADGE_REWARD'),
]
