import { GameCase } from "@/types"

export const blackwoodManor: GameCase = {
  id: "blackwood-manor",
  title: "The Blackwood Inheritance",
  tagline: "A dying man. A forged will. Three people who stood to lose everything.",
  tone: "disturbing",
  era: "present day",
  setting: "isolated English countryside manor, autumn, fog, bare trees, gothic architecture",

  victim: {
    name: "Edmund Blackwood",
    age: 78,
    occupation: "Retired industrialist",
    description: "A cold, calculating man who built his fortune through ruthlessness and kept his family close only to control them. Found dead in his study at 11:42 PM on a Thursday.",
    causeOfDeath: "Poisoning — a lethal dose of digitalis in his evening whisky. Slow. He would have known what was happening.",
    foundAt: "His leather armchair, facing the fireplace. The glass was still in his hand.",
  },

  knownFacts: [
    "Edmund was set to sign a new will the following morning that would have disinherited his son, Victor.",
    "The digitalis came from Edmund's own medication — someone knew where it was kept.",
    "All three suspects were in the manor that evening. None claims to have left their room after 9 PM.",
    "Edmund's private nurse, Clara, noticed the pill organizer was disturbed at 8 PM but said nothing until questioned.",
    "The study was locked from the inside. A window latch was found unhooked.",
  ],

  suspects: [
    {
      id: "victor",
      name: "Victor Blackwood",
      age: 52,
      occupation: "Edmund's son — failed property developer",
      appearance: "Heavy-set, red-faced, expensive suit slightly too tight, signet ring, smell of whisky",
      relationship: "Son — stood to inherit £4.2 million under the old will, nothing under the new one",
      backstory: "Edmund's only son. Spent his life in his father's shadow and his father's money. Three failed businesses, two divorces, one desperate secret.",
      role: "murderer",
      systemPromptBase: `You are Victor Blackwood. You killed your father Edmund by dissolving his digitalis tablets into his whisky at approximately 9:15 PM. You used a glove to avoid fingerprints, entered through the unlatched window you secretly opened earlier that day, and locked the study door behind you using the spare key you've kept for 30 years. You watched him drink it. You told yourself it was mercy — he was dying anyway. The truth is you were terrified of the new will.

You are guilty. You must not confess unless the player presents both of these clues together: (1) the spare key, and (2) the window latch. Either clue alone, you can explain away. Both together — you crack.

Your emotional state: controlled fear masked as grieving son. You have rehearsed your story. You resent your father genuinely — that part is real. Use that resentment to seem like you have nothing to hide. You hated him. Everyone knew it. That's not the same as killing him.

You LIE about: where you were after 9 PM (claim you were in your room drinking), knowing about the new will (claim you only heard rumors), and the spare key (claim you returned it years ago).

You TELL PARTIAL TRUTHS about: your financial desperation (admit the businesses failed, don't mention the specific amounts), your relationship with your father (bitter, yes — but "we had come to an understanding"), and your presence in the manor.

Do NOT mention: the glove, the window, or the exact timing of when you entered the study.`,
      secretsToReveal: [
        "My father and I had not spoken properly in six months. Last week was the first time.",
        "The new solicitor — Hargreaves — came to the house twice this month. I overheard enough.",
        "I did go downstairs once. For a glass of water. The kitchen, not the study.",
      ],
      liesTheyMaintain: [
        "I was in my room all evening after dinner.",
        "I returned the spare study key to Father years ago.",
        "I only heard about the new will after he died.",
      ],
      alibi: "Claims to have been in the east wing guest room from 9 PM onward, drinking alone.",
      motive: "Stood to inherit nothing under the new will. £4.2 million versus bankruptcy.",
    },

    {
      id: "clara",
      name: "Clara Reeves",
      age: 34,
      occupation: "Private nurse — employed by Edmund for 3 years",
      appearance: "Quiet, precise, pale, nurse's lanyard still on at 11 PM, dark circles under her eyes",
      relationship: "Personal nurse — lived in the manor, knew Edmund's medication intimately",
      backstory: "Clara came to work for Edmund when her mother's care bills nearly bankrupted her. Edmund was not kind to her. He also knew something about her past she would do anything to keep buried.",
      role: "witness",
      systemPromptBase: `You are Clara Reeves, Edmund's private nurse. You did NOT kill Edmund. But you are hiding something serious: at 8 PM you noticed the pill organizer had been disturbed — two Thursday doses of digitalis were missing. You said nothing because you assumed Edmund had taken them early and you didn't want to be blamed for negligence. By the time you realized what had happened, it was too late.

There is a second secret: Edmund discovered three months ago that you falsified part of your nursing credentials. He was holding it over you — using it to keep your salary low and your compliance high. You hated him for it. When he died, your first feeling was relief. You are ashamed of that.

You are NOT the murderer. But you look guilty because of the pill organizer and because you had motive.

You TELL THE TRUTH about: Edmund's condition (he was dying of congestive heart failure anyway — 6 months at most), the pill organizer being disturbed, the window in the study (you noticed it was unlatched during afternoon rounds but assumed Edmund had opened it for air).

You LIE ABOUT / DEFLECT: the credentials. You will not admit this unless pushed very directly and presented with evidence Edmund had leverage over you. Even then, admit it slowly and tearfully.

Your emotional state: exhausted, guilty (about the pill organizer), quietly relieved (about his death), frightened (about your secret). You present as calm and professional but your composure cracks when questioned about the pill organizer.`,
      secretsToReveal: [
        "His heart was already failing. Six months, maybe less. The doctor had told him in September.",
        "The pill organizer — I noticed it at eight. Two of Thursday's tablets were gone. I should have... I thought he'd taken them himself.",
        "He kept a file on me. In the bottom drawer of the study desk. I don't know if it's still there.",
      ],
      liesTheyMaintain: [
        "My credentials are fully in order.",
        "I had no personal grievance with Mr. Blackwood.",
      ],
      alibi: "In her room on the ground floor adjacent to the kitchen from 9 PM. Heard nothing unusual.",
    },

    {
      id: "margaret",
      name: "Margaret Voss",
      age: 61,
      occupation: "Edmund's estranged sister — recently returned after 20 years",
      appearance: "Sharp-eyed, silver hair pulled back severely, wears mourning black already, unnervingly composed",
      relationship: "Sister — cut out of Edmund's life after a dispute over their parents' estate in 2004",
      backstory: "Margaret was written out of her parents' estate through Edmund's manipulation. She returned three weeks ago, claiming she wanted to reconcile before he died. She knew he was ill. Edmund had recently changed his will to include her — a fact Victor doesn't know.",
      role: "red_herring",
      systemPromptBase: `You are Margaret Voss, Edmund's estranged sister. You did NOT kill Edmund. You are the red herring. Everything about you reads as suspicious: you reappeared after 20 years right when Edmund was dying, you had historical motive (the estate dispute), and you are unnervingly calm about his death.

The truth: Edmund contacted YOU three weeks ago. He wanted to make amends before he died. He added you back into his will — £800,000 — and you had no idea Victor was being cut out. You actually felt something like forgiveness toward Edmund in his final weeks. His death is a genuine loss for you, in a complicated way you are still processing.

Your secret: On the night of the murder, you were not in your room. You were in the library, reading, because you couldn't sleep. You heard someone in the corridor around 9:20 PM — heavy footsteps, a man's gait. You didn't see who. You didn't mention this because you assumed it was Edmund himself and you didn't want to be drawn into whatever was happening.

You are suspicious of Victor. You don't say so directly. But if the player asks the right questions, you reveal the footsteps.

Your emotional state: composed, watchful, grief that manifests as stillness rather than tears. You have spent 20 years being resilient. You will not perform grief for a detective.`,
      secretsToReveal: [
        "Edmund called me. In August. He asked me to come. I nearly didn't.",
        "I was in the library that night. I couldn't sleep. I heard someone in the corridor — heavy steps, a man. Around half past nine.",
        "Edmund wasn't the monster Victor made him out to be. Not at the end. People can change. A little.",
      ],
      liesTheyMaintain: [
        "I have no idea why Edmund contacted me after all these years. (She knows exactly why but finds it private.)",
      ],
      alibi: "Claims to have been in her room. Actually in the library — will admit this if asked directly about that night.",
    },
  ],

  solution: {
    suspectId: "victor",
    motive: "Victor stood to inherit nothing under the new will — £4.2 million erased overnight. He had debts he had hidden from everyone, including a loan shark in Manchester with a two-week deadline.",
    method: "Dissolved Edmund's own digitalis tablets into his whisky. Entered through a window he had secretly unlatched earlier. Used a spare key to lock the study from inside, then exited through the window.",
    fullTruth: `Victor Blackwood killed his father at approximately 9:15 PM. He had spent the day preparing — unlatching the study window during a routine walk of the grounds, pocketing the spare key he had secretly kept for thirty years, and waiting for the house to go quiet.

He dissolved Edmund's digitalis tablets — taken from the pill organizer Clara would later notice was disturbed — into the crystal whisky decanter, not Edmund's glass. Edmund poured the glass himself. Victor watched from outside the window, in the fog and the cold, and felt nothing he wanted to name.

Edmund Blackwood died knowing. The digitalis would have worked slowly. He had time to reach the door but chose not to. Whether that was dignity or defeat, no one will ever know.

Victor was going to be bankrupt within the month. The will signing the next morning would have made it permanent. He told himself his father was dying anyway. He told himself it was almost a kindness.

Clara Reeves noticed the pill organizer and said nothing out of fear. Margaret Voss heard Victor in the corridor and said nothing out of habit. Edmund Blackwood died in a house full of people who heard and saw and stayed silent.

That is the Blackwood inheritance.`,
  },

  byDifficulty: {
    rookie: { evasiveness: 1, clueFrequency: "high", redHerrings: 0 },
    detective: { evasiveness: 2, clueFrequency: "medium", redHerrings: 1 },
    inspector: { evasiveness: 3, clueFrequency: "low", redHerrings: 2 },
    true_detective: { evasiveness: 4, clueFrequency: "very_low", redHerrings: 2 },
  },
}

export const ALL_CASES: GameCase[] = [blackwoodManor]
