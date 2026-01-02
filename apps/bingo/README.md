# Goals Bingo

A goal tracking app where you fill out a 5x5 bingo board with your yearly goals. Complete goals, get BINGO!

## Features

- **Bingo Board** - 5x5 grid to track 24 goals + free space
- **Local Draft Mode** - Create and edit boards without signing in
- **Real-time Sync** - Sign in to save boards, syncs instantly across all devices
- **Three Goal Types**
  - **One-time** - Simple checkbox goals
  - **Streak** - Track daily habits (30, 60, 90, or custom days)
  - **Progress** - Count-based goals (e.g., "Read 12 books")
- **Board Sharing** - Generate public links to share your board
- **User Profiles** - Auto-generated usernames, custom avatars
- **Community Features**
  - Public feed showing everyone's progress
  - Private communities with invite links
  - Reactions and comments on events
  - Watch other users' boards
- **AI Features**
  - Import goals from photo
  - AI difficulty ranking
- **Mobile-friendly** - Responsive layout, native share on mobile

## Ideas

- [ ] Community leaderboard - Most BINGOs, most goals completed, longest streaks
- [ ] Reminders - Daily notifications for streak goals
- [ ] Streak grace period - Allow 1 missed day without losing streak
- [ ] Export to image - Share board as PNG/PDF
- [ ] Goal categories - Health, Career, Personal, etc.
- [ ] Yearly templates - Pre-made boards for common goal themes
- [ ] Progress analytics - Charts showing completion over time
- [ ] Achievements/badges - Gamification for milestones
- [ ] Goal challenges - Community-wide challenges
- [ ] Accountability partners - Pair up with someone for mutual motivation
- [ ] Board themes - Custom colors and styles
- [ ] Goal notes - Add private notes/journal entries to goals
- [ ] Dark mode toggle
- [ ] Offline support with sync

## Development

From the repo root:

```bash
nix run .#dev
```

Or separately:

```bash
nix run .#convex  # Start Convex backend
nix run .#ui      # Start UI
```
