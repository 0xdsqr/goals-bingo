# Goals Bingo

Track your yearly goals on a 5x5 bingo board. Complete goals, get BINGO!

## Features

- **Bingo Board** - 5x5 grid to track 24 goals + free space
- **Local Draft Mode** - Create and edit boards without signing in
- **Real-time Sync** - Sign in to save boards, syncs instantly across all devices
- **Streak Goals** - Track daily habits like "Run 30 days" or "Sober 90 days"
  - Choose goal type upfront: one-time or streak
  - Set target days (30, 60, 90, or custom)
  - Optional custom start date (for streaks already in progress)
  - Visual progress ring shows days completed
  - Reset button if you need to restart
- **Board Sharing** - Generate public links to share your board
- **Community Feed** - Opt-in to see others' goal activity
- **AI Features**
  - Import goals from photo (extracts handwritten/typed goals)
  - AI difficulty ranking (Easy/Medium/Hard/Expert)
- **Mobile-friendly** - Responsive layout, native share on mobile

## Potential Features

- [ ] Reminders - Daily notifications for streak goals
- [ ] Streak grace period - Allow 1 missed day without losing streak
- [ ] Goal categories - Health, Career, Personal, etc.
- [ ] Yearly templates - Pre-made boards for common goal themes
- [ ] Progress analytics - Charts showing completion over time
- [ ] Achievements/badges - Gamification for milestones
- [ ] Export to image - Share board as PNG/PDF

## Development Setup

```bash
bun install
bun run dev
```

Requires Convex backend - see `convex/` directory.
