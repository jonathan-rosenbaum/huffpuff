// Affirmation library — all original writing.
// Use {name} as a substitution token for the user's first name.
// Framed mostly in second/third person to match "{Name} Is" / "She Is" tone.

export const FOCUS_AREAS = [
  { id: 'worth',      label: 'Worth',      hint: 'enoughness, deserving'       },
  { id: 'calm',       label: 'Calm',       hint: 'peace, stillness, breath'    },
  { id: 'confidence', label: 'Confidence', hint: 'courage, voice, capability'  },
  { id: 'love',       label: 'Love',       hint: 'tenderness, receiving, soft' },
  { id: 'rest',       label: 'Rest',       hint: 'permission, slow, recover'   },
  { id: 'growth',     label: 'Growth',     hint: 'becoming, patience, change'  },
];

// Each entry: { id, focus, text }
// Keep lines short — hero type is huge. Break lines with \n for intentional phrasing.
export const AFFIRMATIONS = [
  // --- WORTH ---
  { id: 'w01', focus: 'worth', text: '{name} is\nradiant, rooted,\n& enough.' },
  { id: 'w02', focus: 'worth', text: 'She is\nthe answer\nshe\u2019s been\nlooking for.' },
  { id: 'w03', focus: 'worth', text: '{name} does not\nhave to earn\nher place here.' },
  { id: 'w04', focus: 'worth', text: 'She is worthy\non the quiet days,\ntoo.' },
  { id: 'w05', focus: 'worth', text: '{name} is not\ntoo much.\nShe is\nexactly enough.' },
  { id: 'w06', focus: 'worth', text: 'She belongs\nin the rooms\nshe walks into.' },
  { id: 'w07', focus: 'worth', text: '{name}\u2019s worth\nis not a\nperformance.' },
  { id: 'w08', focus: 'worth', text: 'She is allowed\nto take up\nthe space\nshe needs.' },
  { id: 'w09', focus: 'worth', text: '{name} is whole\nbefore anyone\narrives to see it.' },
  { id: 'w10', focus: 'worth', text: 'She owes\nno explanation\nfor being\nherself.' },
  { id: 'w11', focus: 'worth', text: '{name} is\nthe real thing.' },

  // --- CALM ---
  { id: 'c01', focus: 'calm', text: 'She breathes in.\nShe breathes out.\nShe is here.' },
  { id: 'c02', focus: 'calm', text: '{name} is\nthe calm eye\nof her\nown storm.' },
  { id: 'c03', focus: 'calm', text: 'She does not\nhave to hurry\nto belong\nto herself.' },
  { id: 'c04', focus: 'calm', text: '{name} is safe\nin this moment.\nThis moment\nis enough.' },
  { id: 'c05', focus: 'calm', text: 'She lets\nthe noise\npass through\nand stays.' },
  { id: 'c06', focus: 'calm', text: '{name} is\nsoft water.\nShe shapes\nthe stone.' },
  { id: 'c07', focus: 'calm', text: 'She is steady,\neven when\nnothing around her\nis.' },
  { id: 'c08', focus: 'calm', text: '{name} can\nput it down\nfor a little while.' },
  { id: 'c09', focus: 'calm', text: 'She is allowed\nto not know,\nand still\nbe okay.' },
  { id: 'c10', focus: 'calm', text: '{name} returns\nto her breath\nand finds\nherself there.' },

  // --- CONFIDENCE ---
  { id: 'f01', focus: 'confidence', text: '{name} says it\nthe way\nshe means it.' },
  { id: 'f02', focus: 'confidence', text: 'She trusts\nthe voice\ninside her.' },
  { id: 'f03', focus: 'confidence', text: '{name} is\nbuilt for\nthis.' },
  { id: 'f04', focus: 'confidence', text: 'She has done\nharder things\nthan this.' },
  { id: 'f05', focus: 'confidence', text: '{name}\u2019s no\nis a complete\nsentence.' },
  { id: 'f06', focus: 'confidence', text: 'She does not\nshrink\nto be liked.' },
  { id: 'f07', focus: 'confidence', text: '{name} walks in\nwith her\nwhole self.' },
  { id: 'f08', focus: 'confidence', text: 'She can be\nscared\nand brave\nat the same time.' },
  { id: 'f09', focus: 'confidence', text: '{name} leads\nwith her\nquiet, certain\ntruth.' },
  { id: 'f10', focus: 'confidence', text: 'She does not\nneed the room\nto agree\nto be right.' },

  // --- LOVE ---
  { id: 'l01', focus: 'love', text: '{name} is\nsoftly, fiercely\nloved.' },
  { id: 'l02', focus: 'love', text: 'She is allowed\nto be held.' },
  { id: 'l03', focus: 'love', text: '{name} meets\nherself\nwith tenderness.' },
  { id: 'l04', focus: 'love', text: 'She can\nreceive it.\nShe does\ndeserve it.' },
  { id: 'l05', focus: 'love', text: '{name} is\nher own\nfirst kindness.' },
  { id: 'l06', focus: 'love', text: 'She loves\nfrom fullness,\nnot from fear.' },
  { id: 'l07', focus: 'love', text: '{name} is\nsoftened\nby her own\ncompassion.' },
  { id: 'l08', focus: 'love', text: 'She speaks\nto herself\nlike someone\nshe loves.' },
  { id: 'l09', focus: 'love', text: '{name} is worth\nthe kind of love\nshe gives\nto others.' },
  { id: 'l10', focus: 'love', text: 'Her heart\nis not\na burden.' },

  // --- REST ---
  { id: 'r01', focus: 'rest', text: '{name} is\nallowed to\nrest\nwithout earning it.' },
  { id: 'r02', focus: 'rest', text: 'She can\nslow down\nand still\nbe moving forward.' },
  { id: 'r03', focus: 'rest', text: '{name} is not\nbehind.\nShe is\non her own time.' },
  { id: 'r04', focus: 'rest', text: 'She is allowed\nto do less\ntoday.' },
  { id: 'r05', focus: 'rest', text: '{name}\u2019s body\nknows things\nher mind\nis still learning.' },
  { id: 'r06', focus: 'rest', text: 'She puts down\nwhat\nwas never\nhers to carry.' },
  { id: 'r07', focus: 'rest', text: '{name} is\na human,\nnot a task list.' },
  { id: 'r08', focus: 'rest', text: 'She trusts that\nrest is part\nof the work.' },
  { id: 'r09', focus: 'rest', text: '{name} can close\nthe day\neven if\nit isn\u2019t done.' },
  { id: 'r10', focus: 'rest', text: 'She does not\nhave to prove\nher tiredness\nto anyone.' },

  // --- GROWTH ---
  { id: 'g01', focus: 'growth', text: '{name} is\nbecoming\nslowly,\nthen all at once.' },
  { id: 'g02', focus: 'growth', text: 'She is not\nthe same\nas yesterday.\nShe is allowed\nto change.' },
  { id: 'g03', focus: 'growth', text: '{name} is\nproud\nof the one\nshe is becoming.' },
  { id: 'g04', focus: 'growth', text: 'She is patient\nwith the\nunfinished parts\nof herself.' },
  { id: 'g05', focus: 'growth', text: '{name} does not\nhave to\nfigure it\nall out today.' },
  { id: 'g06', focus: 'growth', text: 'She is learning\nwhat was\nnever taught.' },
  { id: 'g07', focus: 'growth', text: '{name} is\nplanting things\nshe won\u2019t\nsee bloom yet.' },
  { id: 'g08', focus: 'growth', text: 'She is allowed\nto try,\nand to try\ndifferently.' },
  { id: 'g09', focus: 'growth', text: '{name} is\nmore than\nher history.' },
  { id: 'g10', focus: 'growth', text: 'She is\nbegun.\nShe is\nnot yet finished.' },
];

// Replace {name} in text. Fallback to "She" if no name.
export function personalize(text, name) {
  const n = (name || '').trim();
  return n ? text.replaceAll('{name}', n) : text.replaceAll('{name}', 'She');
}

// Get today's affirmation deterministically from a seed (YYYY-MM-DD + focus + name).
// Returns the affirmation object (unpersonalized text).
export function pickForDate(dateStr, focus, name, excludeIds = []) {
  const pool = focus && focus.length
    ? AFFIRMATIONS.filter(a => focus.includes(a.focus))
    : AFFIRMATIONS.slice();
  const candidates = pool.filter(a => !excludeIds.includes(a.id));
  const list = candidates.length ? candidates : pool;
  const seed = hash(`${dateStr}|${(focus || []).join(',')}|${name || ''}`);
  return list[seed % list.length];
}

export function pickRandom(focus, name, excludeIds = []) {
  const pool = focus && focus.length
    ? AFFIRMATIONS.filter(a => focus.includes(a.focus))
    : AFFIRMATIONS.slice();
  const candidates = pool.filter(a => !excludeIds.includes(a.id));
  const list = candidates.length ? candidates : pool;
  return list[Math.floor(Math.random() * list.length)];
}

export function byId(id) {
  return AFFIRMATIONS.find(a => a.id === id);
}

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
