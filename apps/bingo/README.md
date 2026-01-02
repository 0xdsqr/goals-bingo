# Goals Bingo

Track your yearly goals on a 5x5 bingo board. Complete goals, get BINGO!

## Features

- **Bingo Board** - 5x5 grid to track 24 goals + free space
- **Local Draft Mode** - Create and edit boards without signing in
- **Real-time Sync** - Sign in to save boards, syncs instantly across all devices
- **Three Goal Types**
  - **One-time** - Simple checkbox goals
  - **Streak** - Track daily habits (30, 60, 90, or custom days)
    - Visual progress ring shows days completed
    - Optional custom start date for existing streaks
    - Reset button if you need to restart
  - **Progress** - Count-based goals (e.g., "Read 12 books")
    - Shows progress bar + X/Y counter
    - Increment/decrement buttons
    - Auto-completes when target reached
- **Board Sharing** - Generate public links to share your board
- **User Profiles**
  - Auto-generated fun usernames (e.g., "CosmicQuest42")
  - Custom avatar upload
  - Edit username anytime
- **Community Features**
  - Public feed showing everyone's progress
  - Auto opt-in on first board (can leave anytime)
  - Private communities with invite links
  - Reactions and comments on events
  - Avatars and usernames shown in feed
- **AI Features**
  - Import goals from photo (extracts handwritten/typed goals)
  - AI difficulty ranking (Easy/Medium/Hard/Expert)
- **Mobile-friendly** - Responsive layout, native share on mobile

## Potential Features

### High Priority
- [ ] Reminders - Daily notifications for streak goals
- [ ] Streak grace period - Allow 1 missed day without losing streak
- [ ] Goal categories - Health, Career, Personal, etc.
- [ ] Export to image - Share board as PNG/PDF

### Medium Priority
- [ ] Yearly templates - Pre-made boards for common goal themes
- [ ] Progress analytics - Charts showing completion over time
- [ ] Achievements/badges - Gamification for milestones
- [ ] Board themes - Custom colors and styles
- [ ] Goal notes - Add private notes/journal entries to goals
- [ ] Recurring goals - Goals that reset weekly/monthly

### Community Enhancements
- [ ] Community leaderboards - Most goals completed, longest streaks
- [ ] Goal challenges - Community-wide challenges (e.g., "30 day fitness")
- [ ] Accountability partners - Pair up with someone for mutual motivation
- [ ] Community goal templates - Share and copy goals from others

### Nice to Have
- [ ] Dark mode
- [ ] Offline support with sync
- [ ] Desktop notifications
- [ ] iCal/Google Calendar integration for streaks

## Development Setup

```bash
bun install
bun run dev
```

Requires Convex backend - see `convex/` directory.
