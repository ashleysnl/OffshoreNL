# GRAND BANKS BLASTER: KITCHEN PARTY DEFENSE

A production-ready mobile-first browser game built with HTML, CSS, and vanilla JavaScript.

## Project Structure

- `index.html`
- `css/styles.css`
- `js/main.js`
- `js/game.js`
- `js/renderer.js`
- `js/audio.js`
- `js/storage.js`
- `docs/README.md`

## How to Run Locally

1. Download or clone the project folder.
2. Open `index.html` directly in your browser.
3. Tap/click `START GAME` to initialize audio and begin.

## How to Deploy to GitHub Pages

1. Push this folder to a GitHub repository.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, set:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main` (or your default branch)
   - `Folder`: `/ (root)`
4. Save and wait for GitHub Pages to publish.
5. Open the generated site URL.

## Controls

### Mobile

- Hold `◀` to move left
- Hold `▶` to move right
- Hold `FIRE` to auto-fire
- Tap `II` to pause

### Desktop

- `Arrow Left` / `Arrow Right` move
- Hold `Space` to fire
- `P` or `Esc` pauses/resumes

## Persistence

LocalStorage stores:

- High score
- Sound setting (on/off)

## Common Issues

### 1) Case Sensitivity

GitHub Pages is case-sensitive. Ensure file names and import paths match exactly:

- `./css/styles.css`
- `./js/main.js`

### 2) Blank Screen From Wrong Paths

If you move files, update all relative paths in `index.html` and JS imports.

### 3) Cache Problems

If changes do not appear:

1. Hard-refresh the page (`Cmd+Shift+R` on macOS, `Ctrl+F5` on Windows).
2. Clear browser cache for the site.

### 4) iOS Audio Requires Tapping Start

Sound will not play until the user taps `START GAME` due to iOS/Safari autoplay restrictions.

## Technical Notes

- No external image, SVG, font, or CDN assets are used.
- All art is generated with Canvas vector drawing and gradients.
- Audio is generated in real time using WebAudio oscillators.
- Designed to run smoothly on iPhone Safari, Android Chrome, and desktop browsers.
