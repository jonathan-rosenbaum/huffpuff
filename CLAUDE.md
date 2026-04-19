# Sabrina Is — Project Context

## Overview
Personalized affirmation + reflection PWA, inspired by the "I am" app but named for the user. Calm, minimal, serif-forward. Works offline. Installable to home screen.

## Tech Stack
- Vanilla JS + HTML + CSS (no framework)
- PWA: manifest + service worker for offline, Notifications API for reminders
- localStorage for all state (no backend, no accounts)
- Served statically via `http-server` (replit-compatible)

## Aesthetic: Calm Minimal
- Background: linear gradient pink → lavender → periwinkle
  `linear-gradient(165deg, #FDE5EC 0%, #F4DDEB 35%, #E8D5F2 65%, #C9D8F0 100%)`
- Text: deep plum `#3A2D4A`
- Headline: Playfair Display italic (serif)
- Body: Georgia / system serif
- Accent: rose `#D07A9C`, lavender `#A890C4`
- Generous whitespace, centered layouts, soft shadows

## Personalization
- User's name (e.g. "Sabrina") slotted into affirmations via `{name}` token
- User picks 2–5 focus areas during onboarding — affirmations shown weight to those
- No AI/API — curated pre-written library, rotated by seeded daily pick so each day is consistent

## Focus Areas
`worth`, `calm`, `confidence`, `love`, `rest`, `growth`

## Screens
- **Onboarding** — name → focus areas → notification opt-in → done
- **Today** — today's affirmation in hero type, save/reflect/next
- **Reflect** — journal entry tied to today's affirmation
- **Collection** — saved affirmations grid/list
- **Settings** — rename, change focus areas, notification times, reset

## State (localStorage keys)
- `sabrina.v1.profile` — { name, focus[], onboarded, created }
- `sabrina.v1.saved` — array of { id, text, date }
- `sabrina.v1.reflections` — array of { date, affirmationId, text }
- `sabrina.v1.daily` — { date: YYYY-MM-DD, affirmationId }
- `sabrina.v1.streak` — { last, count }
- `sabrina.v1.notify` — { enabled, times: ['HH:MM', ...] }

## Run
```
npm start   # http-server on :8080
```

## Branch
Work on `claude/build-s-is-app-4WH6t`.
