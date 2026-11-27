---
title: Video Keyboard Controls
file: video-keyboard-controls.user.js
description: Space = play/pause, Left/Right = seek 10s, Up/Down = playback speed ±5% (hold to repeat).
---

# Video Keyboard Controls

Control HTML `<video>` elements on any page without reaching for the player's UI. The script intercepts its shortcuts only when a video is the clear target, so normal page scrolling and typing keep working.

## Controls

| Key | Action |
| --- | --- |
| <kbd>Space</kbd> | Play / pause (ignored while held down) |
| <kbd>←</kbd> | Seek back 10 seconds |
| <kbd>→</kbd> | Seek forward 10 seconds |
| <kbd>↑</kbd> | Increase playback speed by 5% |
| <kbd>↓</kbd> | Decrease playback speed by 5% |

Arrow keys can be held down: repeated events are throttled to 120 ms so seeking and speed changes stay controllable. Speed is clamped between 0.1× and 16×, and seeking is clamped to the video's seekable range. A small on-screen overlay confirms each action and fades after 0.8 seconds.

## How the target video is chosen

The script only handles keys when it can identify which video you mean. In order of priority:

1. The video in fullscreen.
2. The video under the mouse pointer.
3. The video you last clicked or focused (including its player controls).
4. The only visible video on the page.

If several videos are visible and none of the above applies, the keys are left to the website. Shortcuts are also ignored when you are typing in an input, textarea, select, or contenteditable element, or when combined with Ctrl, Alt, Shift, or Meta.

Videos inside open shadow roots are supported.

## Installation

Install the script from the [raw file](https://raw.githubusercontent.com/DilshanHarshajith/Tampermonkey-Scripts/main/video-keyboard-controls.user.js) through Tampermonkey (or a compatible userscript manager), then refresh any open video page.

## Configuration

Edit these constants near the top of the script to change the behaviour:

| Constant | Default | Meaning |
| --- | --- | --- |
| `SEEK_SECONDS` | `10` | Seconds jumped by the left/right arrows |
| `SPEED_STEP` | `0.05` | Speed change per up/down press |
| `SPEED_MIN` / `SPEED_MAX` | `0.1` / `16` | Speed limits |
| `REPEAT_DELAY_MS` | `120` | Minimum gap between held-key actions |

## Limitations

- Videos inside cross-origin iframes can only be controlled if the userscript manager injects the script into that frame.
- Sites that use non-`<video>` players (for example canvas-based or heavily custom DRM players) are not supported.
- If the site disallows programmatic playback, the overlay reports that play was blocked.
