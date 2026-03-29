// ============================================
// SABRIDLE - Solution Words & Acrostics
// ============================================

const SOLUTIONS = [
    {
        word: "SMILE",
        acrostic: [
            "Sabrina",
            "Makes",
            "It",
            "Look",
            "Easy"
        ],
        // Add photo filenames here — one per letter position
        // Photos go in the photos/ folder
        photos: [
            "photos/smile-1.jpg",
            "photos/smile-2.jpg",
            "photos/smile-3.jpg",
            "photos/smile-4.jpg",
            "photos/smile-5.jpg"
        ],
        celebrationMessage: "That smile lights up every room you walk into. Happy 56th!"
    },
    {
        word: "HEART",
        acrostic: [
            "Her",
            "Energy",
            "Always",
            "Radiates",
            "Tenderness"
        ],
        photos: [
            "photos/heart-1.jpg",
            "photos/heart-2.jpg",
            "photos/heart-3.jpg",
            "photos/heart-4.jpg",
            "photos/heart-5.jpg"
        ],
        celebrationMessage: "Your heart is the biggest thing about you, and that's saying something. Happy 56th!"
    },
    {
        word: "SWEET",
        acrostic: [
            "Sabrina's",
            "Warmth",
            "Enriches",
            "Every",
            "Tomorrow"
        ],
        photos: [
            "photos/sweet-1.jpg",
            "photos/sweet-2.jpg",
            "photos/sweet-3.jpg",
            "photos/sweet-4.jpg",
            "photos/sweet-5.jpg"
        ],
        celebrationMessage: "Life is sweeter with you in it. Happy 56th!"
    },
    {
        word: "RARER",
        acrostic: [
            "Rooted",
            "And",
            "Rising,",
            "Endlessly",
            "Radiant"
        ],
        photos: [
            "photos/rarer-1.jpg",
            "photos/rarer-2.jpg",
            "photos/rarer-3.jpg",
            "photos/rarer-4.jpg",
            "photos/rarer-5.jpg"
        ],
        celebrationMessage: "Rooted and rising, always. There's no one rarer than you. Happy 56th!"
    }
];

// ============================================
// TRIGGER WORDS
// Specific guessed words that fire a custom message
// Add as many as you want!
// ============================================

const TRIGGER_WORDS = {
    // Example entries — replace/add with real ones from your texts
    "BEACH": "That sunset walk was everything",
    "PIZZA": "Scully would like a word about the missing slice",
    "DANCE": "You on the dance floor is a force of nature",
    "LUNCH": "The luncheon queen! Rooted and rising, always",
    "QUEEN": "Okay, queen. We see you.",
    "HAPPY": "Happy is your default setting and I love that about you",
    "PARTY": "Nobody throws a party like you do",
    "LOVED": "More than you know",
    "ADORE": "Right back at you",
    "LIGHT": "You are one",
    "GRACE": "In every sense of the word",
    "MAGIC": "You really are",
    "BRAIN": "Biggest one in the room, always",
    "FUNNY": "The funniest person I know, and I'm not just saying that",
    "WINE" : "Pour me one too",

    // ADD MORE HERE from your texts!
    // "WORD": "Message that appears",
};
