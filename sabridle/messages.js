// ============================================
// SABRIDLE - Messages Pool
// ============================================
// These show up when a guess doesn't match a trigger word.
// Organized by match quality.
//
// CUSTOMIZE THESE! Replace with real quotes, inside jokes,
// and references from your texts.
// ============================================

// Messages for guesses with NO matching letters (all gray)
const MISS_MESSAGES = [
    "Not the word, but you're still a gift",
    "Nope! But here's a hug anyway",
    "Wrong word, right person",
    "The word is hiding, but you're still shining",
    "Keep going, birthday queen",
    "Not it, but every guess is a celebration",
    "Swing and a miss, but you're still the MVP",
    "The tiles may be gray but you're golden",
    "Nah, but I believe in you",
    "Try again! The word isn't going anywhere",
    "Not even close, but neither is giving up",
    "Gray tiles, full heart, can't lose",

    // ADD MORE — especially from your texts!
];

// Messages for guesses with YELLOW letters (right letter, wrong spot)
const YELLOW_MESSAGES = [
    "Getting warmer! You've got the right letters",
    "So close! Just needs a little rearranging",
    "You're circling it like Scully circles her bed",
    "Right letters, wrong address — keep shuffling!",
    "The letters are there, they just need a new home",
    "Almost! Like finding the right key for the wrong lock",
    "You've got the ingredients, now find the recipe",
    "Warm! Rearrange and try again",
    "The letters are vibing, just not in order",
    "You're onto something!",

    // ADD MORE — especially from your texts!
];

// Messages for guesses with GREEN letters (right letter, right spot)
const GREEN_MESSAGES = [
    "YES! Locked in!",
    "That's it! You're cracking the code",
    "Green means GO — you're on your way!",
    "Nailed it! Those letters aren't moving",
    "Look at you! Wordle queen energy",
    "Sabrina figured it out (obviously)",
    "The smartest person I know, confirmed",
    "Unstoppable!",

    // ADD MORE — especially from your texts!
];

// Message when she solves it (before the celebration overlay)
const SOLVE_MESSAGES = [
    "YOU GOT IT!!! ",
    "BRILLIANT! Of course you did!",
    "Was there ever any doubt?!",
    "The birthday queen solves it again!",
];
