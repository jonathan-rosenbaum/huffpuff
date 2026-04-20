# Affirmations Data

This folder holds every affirmation the app rotates through. Content is organized
by **source** — one JSON file per author, work, or tradition.

Adding content is expandable: drop a new JSON file in `sources/`, add its
filename to `index.json`, and the app picks it up on next load. No code changes
needed.

## File schema

Each file in `sources/` is:

```json
{
  "source": {
    "author": "Marcus Aurelius",
    "work": "Meditations",
    "era": "c. 170 CE",
    "translator": "George Long (1862, public domain)"
  },
  "entries": [
    {
      "id": "aur-001",
      "text": "You have power over your mind — not outside events. Realize this, and you will find strength.",
      "long": "Optional longer passage giving context or the full verse. Shown when the reader taps \"read more\".",
      "focus": ["confidence", "calm"],
      "ref": "Meditations VIII.47"
    }
  ]
}
```

### Fields

**source** (object, required on every file)
- `author` — primary author (e.g. "Lao Tzu", "Rumi"). For anonymous traditions use the tradition name (e.g. "Zen", "Japanese proverb").
- `work` — optional specific work (e.g. "Tao Te Ching", "The Prophet"). Omit for loose quote collections.
- `era` — free-text era/year (e.g. "c. 500 BCE", "1923"). Helps the detail screen contextualize.
- `translator` — required when the original isn't in English. Note the public-domain status if relevant.

**entries[]**
- `id` — **must be globally unique** across all files. Convention: `<3–4-char-source-slug>-NNN` (e.g. `aur-001`, `tao-012`, `dhp-033`). Never renumber — IDs persist in users' saved affirmations.
- `text` — the quote itself. Keep ≤ 160 characters when possible so it renders at hero size. Use `—` (em dash) not `--`. Use curly quotes.
- `long` — optional. A longer passage, or a 1–2 sentence reflection connecting the quote to daily life. Shown as an expandable bubble.
- `focus` — array of focus-area IDs. Valid values: `worth`, `calm`, `confidence`, `love`, `rest`, `growth`. A quote can belong to multiple. Every entry needs at least one.
- `ref` — optional citation string (verse, chapter, page) shown in the source bubble.

## Rules for curation

1. **Do not fabricate quotes.** If you can't verify attribution, leave it out. The internet is full of misattributed quotes — we won't add to the pile.
2. **Respect copyright.** Public-domain works (generally pre-1929 in the US) can be quoted freely. For modern writers, limit to short, famous lines used under fair-use commentary with attribution.
3. **Note translations carefully.** Many popular "Rumi" and "Hafiz" quotes online are modern paraphrases, not translations. When in doubt, use older public-domain translations (Nicholson for Rumi, Bell for Hafiz, Long/Farquharson for Marcus Aurelius, Müller for Upanishads, Legge for Confucius).
4. **Keep the tone reflective, not motivational-poster.** This app is for quiet mornings, not Instagram.
5. **Diverse voices.** Aim across traditions, genders, eras, and cultures.

## Adding a file

1. Create `sources/your-source.json` following the schema above.
2. Add its filename to `index.json`:
   ```json
   { "files": [ "marcus-aurelius.json", "your-source.json" ] }
   ```
3. That's it. Reload the app.

## ID prefix registry

Keep prefixes short and unambiguous. Current assignments:

| Prefix | Source |
|---|---|
| `aur` | Marcus Aurelius, Meditations |
| `tao` | Lao Tzu, Tao Te Ching |
| `dhp` | Dhammapada |
| `gita` | Bhagavad Gita |
| `epi` | Epictetus (Enchiridion + Discourses) |
| `sen` | Seneca |
| `con` | Confucius, Analects |
| `bib` | Bible (KJV) |
| `rum` | Rumi |
| `haf` | Hafiz |
| `ril` | Rilke |
| `eme` | Emerson |
| `thor` | Thoreau |
| `whit` | Whitman |
| `tag` | Tagore |
| `gib` | Gibran |
| `upa` | Upanishads |
| `hav` | Hávamál |
| `prov` | Proverbs (mixed traditions) |
| `mod` | Modern voices (Jung, Frankl, bell hooks, etc.) |
