# Implementation Plan: AutoPilot AI Frontend Redesign

## Task Type
- [x] Frontend only — no backend changes

---

## Technical Solution

Completely rewrite the AutoPilot AI frontend with a dark/light theme-switchable, glassmorphic UI using:
- **Tailwind v4** `@theme` CSS API (no tailwind.config.ts — it doesn't exist in this project)
- **CSS custom properties** for full design token system
- **class-based dark mode** via `.dark` on `<html>` with flash-free initialization
- **Web Speech API** for voice input (no new packages)
- All new components + rewrites of existing ones

---

## Critical Technical Notes

### Tailwind v4 (MUST follow — breaks silently otherwise)
- Custom utilities go in `globals.css` inside `@theme { }` block
- Color tokens: `--color-accent-500: #6c47ff` → generates `bg-accent-500`, `text-accent-500`, etc.
- Animation tokens: `--animate-fadeSlideUp: fadeSlideUp 0.4s ease forwards` → generates `animate-fadeSlideUp`
- Keyframes go OUTSIDE `@theme {}`, declared as `@keyframes name { ... }`
- Custom blur: `--blur-xs: 2px` in `@theme {}` → generates `blur-xs`, `backdrop-blur-xs`
- Dark mode variant: declare `@variant dark { ... }` OR use `@custom-variant dark (&:where(.dark, .dark *));`
- CSS vars like `--bg-glass` are NOT Tailwind utilities — reference them inline or via `bg-[var(--bg-glass)]`

### Dark Mode Flash Prevention
- `layout.tsx` needs an inline `<script>` that runs before React hydration
- The script reads `localStorage.autopilot-theme` and sets `document.documentElement.classList`
- `<html>` needs `suppressHydrationWarning={true}`

### Animation Delays
- Tailwind v4 has no `animation-delay-*` utilities built-in
- Use `style={{ animationDelay: '75ms' }}` inline on JSX elements

### VoiceButton Safety
- Must guard: `typeof window === 'undefined'` → return null (SSR safety)
- `isSupported` state initialized after mount via `useEffect`

---

## Implementation Steps

### Step 1 — Update `frontend/app/layout.tsx`
**Deliverable**: Flash-free dark mode init + updated metadata

Changes:
- Add `suppressHydrationWarning` to `<html>`
- Add inline `<script dangerouslySetInnerHTML>` before `{children}` that reads `localStorage['autopilot-theme']` and adds class `dark` to `documentElement` if value is `'dark'` (or if not set, default to `'dark'`)
- Update metadata title/description
- Keep Geist font setup unchanged

```tsx
// Inline script (runs before hydration):
const themeScript = `
  (function() {
    var theme = localStorage.getItem('autopilot-theme') || 'dark';
    if (theme === 'dark') document.documentElement.classList.add('dark');
  })();
`;
```

---

### Step 2 — Rewrite `frontend/app/globals.css`
**Deliverable**: Full design token system + keyframe animations

Structure:
```css
@import "tailwindcss";

/* 1. Tailwind v4 dark mode variant */
@custom-variant dark (&:where(.dark, .dark *));

/* 2. Design tokens (CSS custom properties) */
:root { /* light mode */ }
.dark { /* dark mode overrides */ }

/* 3. Tailwind v4 theme extension */
@theme {
  /* Colors */
  --color-accent-50: #f3f0ff;
  --color-accent-100: #e9e3ff;
  /* ... all accent shades ... */

  /* Animations */
  --animate-fadeSlideUp: fadeSlideUp 0.4s ease forwards;
  --animate-fadeSlideIn: fadeSlideIn 0.4s ease forwards;
  --animate-pulse-glow: pulse-glow 2s ease-in-out infinite;
  --animate-float: float 6s ease-in-out infinite;
  --animate-shimmer: shimmer 1.5s linear infinite;
  --animate-ripple: ripple 0.6s ease forwards;
  --animate-blink: blink 1s step-end infinite;
  --animate-voice-wave: voice-wave 0.8s ease-in-out infinite alternate;
  --animate-typing-dot: typing-dot 1.2s ease-in-out infinite;

  /* Blur */
  --blur-xs: 2px;

  /* Font */
  --font-sans: 'Geist', system-ui, sans-serif;
}

/* 4. Keyframes (outside @theme) */
@keyframes fadeSlideUp { ... }
@keyframes fadeSlideIn { ... }
@keyframes pulse-glow { ... }
@keyframes float { ... }
@keyframes shimmer { ... }
@keyframes ripple { ... }
@keyframes blink { ... }
@keyframes voice-wave { ... }
@keyframes typing-dot { ... }

/* 5. Global styles */
body { ... }
::selection { ... }
::-webkit-scrollbar { ... }
```

**CSS Custom Properties (light/dark)**:
```
Light: --bg-primary:#fff, --bg-secondary:#f8f7ff, --bg-tertiary:#f0eeff
       --bg-glass:rgba(255,255,255,0.7), --accent-primary:#6c47ff
       --accent-secondary:#a78bfa, --accent-glow:rgba(108,71,255,0.15)
       --text-primary:#0f0a1e, --text-secondary:#4a4560, --text-muted:#9891b0
       --border-color:rgba(108,71,255,0.12), --timeline-line:#e0d9ff
       --shadow-sm/md/lg (box-shadow values)

Dark:  --bg-primary:#0a0812, --bg-secondary:#110e1f, --bg-tertiary:#1a1530
       --bg-glass:rgba(17,14,31,0.8), --accent-primary:#8b6fff
       --accent-secondary:#c4b5fd, --accent-glow:rgba(139,111,255,0.2)
       --text-primary:#f0ecff, --text-secondary:#b8afd4, --text-muted:#6b6385
       --border-color:rgba(139,111,255,0.15), --timeline-line:#2a2245
```

**Keyframe definitions**:
```css
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 var(--accent-glow); }
  50%       { box-shadow: 0 0 0 12px var(--accent-glow); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
}
@keyframes shimmer {
  from { background-position: -200% center; }
  to   { background-position:  200% center; }
}
@keyframes ripple {
  from { transform: scale(0); opacity: 0.4; }
  to   { transform: scale(2.5); opacity: 0; }
}
@keyframes blink {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes voice-wave {
  from { transform: scaleY(0.3); }
  to   { transform: scaleY(1.0); }
}
@keyframes typing-dot {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
}
```

---

### Step 3 — Create `frontend/components/ThemeToggle.tsx`
**Deliverable**: Pill toggle button, no hydration flash

```tsx
'use client'
// State: mounted (bool), isDark (bool)
// useEffect on mount: read localStorage['autopilot-theme'] || 'dark', setIsDark, setMounted(true)
// toggle(): flip isDark, update localStorage, toggle document.documentElement.classList('dark')
// Render: if !mounted → return <div w-14 h-7 /> (placeholder to avoid layout shift)
// Button: w-14 h-7 rounded-full, bg transitions amber-200 (light) ↔ slate-700 (dark)
//   Inside: div w-5 h-5 rounded-full bg-white shadow, translate-x-1 (light) or translate-x-8 (dark)
//   transition-transform duration-300 ease-in-out
// SVG icons positioned absolutely inside pill
```

---

### Step 4 — Create `frontend/components/AnimatedBackground.tsx`
**Deliverable**: Fixed decorative blur orbs

```tsx
'use client'
// position: fixed, inset-0, pointer-events-none, z-0
// Three divs: orb1 (top-left, accent-primary, animate-float)
//             orb2 (bottom-right, accent-secondary, animate-float delay-2s)
//             orb3 (center-left, purple-400, animate-float delay-4s)
// All: rounded-full, blur-[80-120px], low opacity
// Uses style={{ animationDelay }} for delays since no Tailwind utility
```

---

### Step 5 — Create `frontend/components/ScheduleTimeline.tsx`
**Deliverable**: Beautiful vertical timeline (replaces ScheduleCard)

Props: `{ items: ScheduleItem[], compact?: boolean }`

```tsx
// Container: relative pl-8
// Spine: absolute left-3 top-0 bottom-0 w-px
//        background: linear-gradient(to bottom, var(--accent-primary), var(--accent-secondary), transparent)
// Per item (index):
//   Wrapper: relative flex gap-4 pb-6 animate-fadeSlideUp (style={{ animationDelay: `${index*75}ms` }})
//   Dot: absolute left-[-21px] top-1 w-3.5 h-3.5 rounded-full
//        high → bg accent-primary + animate-pulse-glow
//        medium → bg accent-secondary
//        low → bg-transparent border-2 border accent-secondary
//   Card: flex-1 bg-[var(--bg-glass)] backdrop-blur-xs border border-[var(--border-color)]
//         rounded-xl px-4 py-3 shadow-sm group
//         hover: shadow-md, border-accent-200/accent-700, transition-all duration-200
//     Top row: task name (text-sm font-medium, group-hover:text-accent-500) + time badge (font-mono bg-tertiary)
//     Bottom (if duration): flex items-center gap-2 mt-1.5
//       Duration bar: h-1 bg-[var(--bg-tertiary)] rounded-full, inner width = (min/120)*100%
//       Duration text: text-[11px] text-[var(--text-muted)] tabular-nums
```

Note: `bg-[var(--bg-glass)]`, `border-[var(--border-color)]` etc. use Tailwind's arbitrary value syntax since these are CSS vars, not Tailwind tokens.

---

### Step 6 — Create `frontend/components/VoiceButton.tsx`
**Deliverable**: Web Speech API mic button with wave animation

```tsx
'use client'
// Props: { onTranscript: (text: string) => void }
// State: isListening, isSupported, recognition ref
// useEffect on mount (client-only):
//   const SR = window.SpeechRecognition || window.webkitSpeechRecognition
//   setIsSupported(!!SR)
//   if (SR) recognition.current = new SR()
// if !isSupported → return null
// startListening(): set up .continuous=false, .interimResults=true, .lang='en-US'
//   .onresult → capture final transcript, call onTranscript(text), setIsListening(false)
//   .onerror → setIsListening(false)
//   .start(), setIsListening(true)
// stopListening(): recognition.stop(), setIsListening(false)
// Button appearance:
//   base: w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
//   idle: bg-[var(--bg-tertiary)] hover:text-accent-500 border border-[var(--border-color)]
//   listening: bg-accent-500 shadow-lg (shadow uses --accent-glow)
//     → 4 bars: each w-0.5 h-4 bg-white rounded-full animate-voice-wave staggered delays
// Mic SVG (idle): simple path M12,2 a3,5...
```

---

### Step 7 — Rewrite `frontend/components/ChatInput.tsx`
**Deliverable**: Glass-morphic input with voice + auto-resize

```tsx
'use client'
// Props: { onSend: (msg: string) => void, disabled: boolean }
// State: value (string)
// ref: textareaRef
// Container: relative bg-[var(--bg-glass)] backdrop-blur-sm border border-[var(--border-color)]
//   rounded-2xl shadow-md p-3 flex items-end gap-2
//   focus-within: border-accent-300 (light) / border-accent-600 (dark), shadow-lg
//   transition-all duration-200
// Left: <VoiceButton onTranscript={(t) => setValue(t)} />
// Textarea: flex-1, bg-transparent, resize-none, text-sm, text-[var(--text-primary)]
//   placeholder: 'Plan my day, add a meeting, reschedule...'
//   placeholder color: text-[var(--text-muted)]
//   focus:outline-none, min-h-[40px] max-h-[120px], py-2 leading-relaxed
//   Auto-resize: onInput → el.style.height='auto'; el.style.height=el.scrollHeight+'px'
//   Enter sends, Shift+Enter = newline
// Send button: w-10 h-10 rounded-xl bg-accent-500 hover:bg-accent-600
//   disabled:opacity-40, text-white, transition-all, active:scale-95
//   idle: right-arrow SVG (→)
//   loading: spinning circle SVG (border-2 border-white/30 border-t-white rounded-full animate-spin w-4 h-4)
```

---

### Step 8 — Rewrite `frontend/components/ChatMessage.tsx`
**Deliverable**: Animated message bubbles with embedded timeline

```tsx
// No 'use client' needed (no hooks, pure display)
// Import ScheduleTimeline (not ScheduleCard)
// User bubble: animate-fadeSlideUp, justify-end
//   bg-accent-500 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-md max-w-[75%]
// Assistant bubble: animate-fadeSlideIn, justify-start gap-3
//   Avatar: w-8 h-8 rounded-xl bg-gradient-to-br from-accent-500 to-accent-400
//     flex items-center justify-center shadow-md animate-pulse-glow
//     ✦ symbol: text-white text-xs font-bold
//   Bubble: bg-[var(--bg-glass)] backdrop-blur-sm border border-[var(--border-color)]
//     rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm max-w-[80%] text-sm
//     text-[var(--text-secondary)] leading-relaxed
// Timestamp: text-[10px] text-[var(--text-muted)] mt-1
//   format: new Date(msg.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
// Schedule inline: if msg.schedule → <ScheduleTimeline items={...} compact /> below bubble
//   wrapped in div: mt-3 w-full animate-fadeSlideUp style={{ animationDelay: '150ms' }}
```

---

### Step 9 — Create `frontend/components/TypingIndicator.tsx`
**Deliverable**: Three-dot animated typing indicator

```tsx
// Pure display component (no 'use client' needed)
// Same avatar as assistant messages (w-8 h-8 gradient rounded-xl, ✦)
// Bubble: bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-2xl rounded-bl-sm
//   px-4 py-3.5 flex gap-1.5 items-center
// 3 spans: w-1.5 h-1.5 rounded-full bg-accent-400
//   animate-typing-dot with style={{ animationDelay: '0ms', '150ms', '300ms' }}
```

---

### Step 10 — Create `frontend/components/EmptyState.tsx`
**Deliverable**: Centered empty state with suggestion chips

```tsx
'use client'
// Props: { onSuggestion: (text: string) => void }
// Helper: getGreeting() → checks new Date().getHours():
//   0-11 → 'Good morning', 12-16 → 'Good afternoon', else 'Good evening'
// Container: flex flex-col items-center gap-4 py-16 animate-fadeSlideUp
// Icon: w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-400
//   flex items-center justify-center shadow-lg animate-pulse-glow
//   ✦ text-white text-2xl
// Heading: getGreeting() → text-xl font-semibold text-[var(--text-primary)]
// Subtext: 'What would you like to plan today?' → text-sm text-[var(--text-muted)]
// Chips row: flex flex-wrap gap-2 mt-2 justify-center
//   Each chip: px-4 py-2 rounded-xl bg-[var(--bg-tertiary)]
//     hover:bg-accent-50 dark:hover:bg-[rgba(139,111,255,0.1)]
//     border border-[var(--border-color)] hover:border-accent-300
//     text-sm text-[var(--text-secondary)] hover:text-accent-500
//     cursor-pointer transition-all duration-150 active:scale-95
//   Chips: ['Plan my day 🗓️', 'I woke up late ⏰', 'Add a meeting 📅']
//   onClick: onSuggestion(chip text stripped of emoji)
//     — actually pass full text so backend gets context
```

---

### Step 11 — Create `frontend/components/PrefsCard.tsx`
**Deliverable**: Glassmorphic preferences display card

```tsx
// Props: { prefs: UserPrefs }
// Helper: hasAnyPref = Object.values(prefs).some(Boolean)
// if !hasAnyPref → return null
// Container: bg-[var(--bg-glass)] backdrop-blur-sm border border-[var(--border-color)]
//   rounded-2xl p-4 animate-fadeSlideUp
// Header: flex items-center gap-2 mb-3
//   ◈ icon: text-accent-500 text-sm
//   'Learned about you': text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider
// Pref rows (only non-null): border-b border-[var(--border-color)] last:border-0 py-2 flex items-center gap-2
//   Dot: w-1.5 h-1.5 rounded-full bg-accent-400
//   Label: text-xs text-[var(--text-muted)] capitalize (replace _ with space)
//   Value: text-xs font-medium text-[var(--text-primary)] ml-auto
// Fields: wake_time, work_preference, break_pattern, sleep_time
```

---

### Step 12 — Rewrite `frontend/app/page.tsx`
**Deliverable**: Full new layout with all components wired

```tsx
'use client'
// Imports: all new components + existing hooks + sendMessage + types

// STATE:
//   messages: ChatMessage[]  — useState([])
//   currentSchedule: ScheduleItem[] | null — useState(null)
//   userPrefs: UserPrefs | null — useState(null)
//   isLoading: bool — useState(false)
//   threadId: string — useState('')
//   inputValue: string — useState('') — shared between ChatInput and suggestion chips

// EFFECTS:
//   Mount: read/generate threadId from localStorage('autopilot-thread')
//   messages change: scroll messagesEndRef into view

// HANDLERS:
//   handleSend(content: string):
//     if !threadId || !content.trim() → return
//     add user message, setIsLoading(true)
//     await sendMessage(content, threadId)
//     add assistant message, update schedule/prefs, setIsLoading(false)
//     catch → add error message
//   handleSuggestion(text: string):
//     immediately call handleSend(text)

// LAYOUT (outer):
//   <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
//     <AnimatedBackground />  {/* z-0, fixed */}
//     <div className="relative z-10 flex flex-col h-screen">
//       {/* HEADER */}
//       {/* BODY */}
//     </div>
//   </div>

// HEADER:
//   sticky/fixed top, px-6 py-4 flex justify-between items-center
//   border-b border-[var(--border-color)] bg-[var(--bg-glass)] backdrop-blur-sm
//   Left: Logo pill + 'AutoPilot' + <span style accent-primary>AI</span> + green pulse dot
//   Right: thread ID pill (first 8 chars) + <ThemeToggle />

// BODY (flex flex-1 overflow-hidden):
//   LEFT PANEL (flex-[3] border-r border-[var(--border-color)]):
//     Chat subheader: 'Chat' + message count badge
//     Messages scroll area:
//       if no messages → <EmptyState onSuggestion={handleSuggestion} />
//       map messages → <ChatMessage key={msg.id} message={msg} />
//       if isLoading → <TypingIndicator />
//       <div ref={messagesEndRef} />
//     Input area: bg-[var(--bg-glass)] border-t, px-6 py-4
//       <ChatInput onSend={handleSend} disabled={isLoading} />
//
//   RIGHT PANEL (flex-[2] bg-[var(--bg-secondary)]/30):
//     Schedule subheader: 📅 icon + 'Schedule' + date pill
//     Schedule content area (overflow-y-auto):
//       if currentSchedule → <ScheduleTimeline items={currentSchedule} />
//       else → float calendar emoji empty state
//     Prefs area (border-t):
//       if userPrefs → <PrefsCard prefs={userPrefs} />

// DATE FORMATTING:
//   new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
//   → 'Mon, Mar 24'
```

---

### Step 13 — Cleanup
- Delete `frontend/components/ScheduleCard.tsx` (replaced by ScheduleTimeline)
- Verify all imports are correct
- Ensure every interactive component has `'use client'` at top

---

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| `frontend/app/layout.tsx` | Modify | Add flash-free dark mode init script + suppressHydrationWarning |
| `frontend/app/globals.css` | Rewrite | Full design token system + keyframes + Tailwind v4 @theme |
| `frontend/app/page.tsx` | Rewrite | New two-panel layout with all components |
| `frontend/components/ChatMessage.tsx` | Rewrite | Animated bubbles + embedded ScheduleTimeline |
| `frontend/components/ChatInput.tsx` | Rewrite | Glass input + VoiceButton integration |
| `frontend/components/ScheduleCard.tsx` | Delete | Replaced by ScheduleTimeline |
| `frontend/components/ThemeToggle.tsx` | Create | Pill toggle for dark/light mode |
| `frontend/components/AnimatedBackground.tsx` | Create | Fixed decorative blur orbs |
| `frontend/components/ScheduleTimeline.tsx` | Create | Vertical timeline with gradient spine |
| `frontend/components/VoiceButton.tsx` | Create | Web Speech API mic with wave animation |
| `frontend/components/TypingIndicator.tsx` | Create | Three-dot pulsing indicator |
| `frontend/components/EmptyState.tsx` | Create | Greeting + suggestion chips |
| `frontend/components/PrefsCard.tsx` | Create | Glassmorphic prefs display |

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Tailwind v4 `@theme` tokens not generating utilities | Use exact `--color-*` naming; test with `bg-accent-500` in browser |
| Dark mode flash on page load | Inline `<script>` in layout.tsx runs before React hydration |
| `backdrop-blur-xs` not working | Declare `--blur-xs: 2px` in `@theme {}` |
| `animate-*` classes not found | All animations must be defined as `--animate-name: name duration easing` in `@theme {}` |
| VoiceButton SSR crash | `typeof window !== 'undefined'` guard + `useEffect` for API detection |
| `animation-delay` no Tailwind utility | Always use `style={{ animationDelay: '...' }}` inline |
| ScheduleCard still imported somewhere | After creating ScheduleTimeline, grep for ScheduleCard imports and replace all |
| CSS vars (`--bg-glass` etc.) not usable as Tailwind classes | Use arbitrary value syntax: `bg-[var(--bg-glass)]` |

## SESSION_ID (for /ccg:execute use)
- CODEX_SESSION: N/A (backend unavailable)
- GEMINI_SESSION: N/A (backend unavailable)
- Plan generated by Claude direct analysis
