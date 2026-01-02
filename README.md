# Goals Bingo

Track your yearly goals with a 5x5 bingo board. Add goals, check them off, get a BINGO.

## Features

- **Bingo Board** - 5x5 grid with 24 goals + free center space
- **Local Draft Mode** - Works without sign-in (saved to localStorage)
- **Email Auth** - OTP sign-in via Resend
- **Goal Types**
  - One-time goals - Mark complete when done
  - Streak goals - Track consecutive days (e.g., "30 days sober") with live timer
  - Progress goals - Counter-based (e.g., "Visit 5 restaurants" - 0/5, 1/5...)
- **Board Sharing** - Public read-only links
- **Community Feed** - Opt-in to see others' activity with reactions and comments
- **Private Groups** - Create invite-only communities to share progress with friends
- **User Profiles** - Custom username and avatar
- **AI Features**
  - Import goals from photo (GPT-4o-mini vision)
  - Difficulty ranking for your board

## Tech Stack

- **Frontend**: TanStack Start, React, Vite, Tailwind CSS
- **Backend**: Convex (real-time database + serverless functions)
- **Auth**: Convex Auth (email OTP via Resend)
- **AI**: OpenRouter (GPT-4o-mini, GPT-3.5)

## Getting Started

```bash
# Enter dev shell
nix develop

# Install deps
bun install

# Start Convex backend
cd apps/bingo
bun run dev:convex

# In another terminal, start the app
bun run dev
```

## Roadmap

- [ ] Progress goals UI in goal-cell component
- [ ] Streak milestone events (7d, 30d, 60d, 90d)
- [ ] Board templates / presets
- [ ] Mobile app (React Native)
- [ ] Weekly/monthly email digests
- [ ] Gamification (points, badges, leaderboards)

## License

MIT - do whatever you want with it.
