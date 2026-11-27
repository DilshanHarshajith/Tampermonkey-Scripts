// ==UserScript==
// @name         Video Keyboard Controls
// @namespace    https://github.com/DilshanHarshajith/Tampermonkey-Scripts
// @version      1.1.0
// @description  Space = play/pause, Left/Right = seek 10s, Up/Down = playback speed ±5% (hold to repeat).
// @author       DilshanHarshajith
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @license      GPL-3.0-or-later
// ==/UserScript==

(function () {
  'use strict';

  const SEEK_SECONDS = 10;
  const SPEED_STEP = 0.05;
  const SPEED_MIN = 0.1;
  const SPEED_MAX = 16;
  const REPEAT_DELAY_MS = 120;
  const KEYS = [' ', 'Spacebar', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

  // Use the native DOM APIs in case the page has replaced them.
  const documentQueryAll = Document.prototype.querySelectorAll;
  const elementQueryAll = Element.prototype.querySelectorAll;
  const fragmentQueryAll = DocumentFragment.prototype.querySelectorAll;

  function queryAll(root, selector) {
    const query =
      root.nodeType === 9
        ? documentQueryAll
        : root.nodeType === 11
          ? fragmentQueryAll
          : elementQueryAll;
    return query.call(root, selector);
  }

  function collectVideos(root, result) {
    queryAll(root, 'video').forEach((video) => result.push(video));
    queryAll(root, '*').forEach((element) => {
      if (element.shadowRoot) collectVideos(element.shadowRoot, result);
    });
  }

  function visibleVideos() {
    const videos = [];
    collectVideos(document, videos);
    return videos.filter((video) => {
      if (video.hidden) return false;
      const rect = video.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  // ---------- which video should receive the keys? ----------
  let hoveredVideo = null;
  let clickedVideo = null;

  function isVideo(node) {
    return node && node.nodeType === 1 && node.tagName === 'VIDEO';
  }

  function videoFromEvent(event, includePlayerControls) {
    const path =
      typeof event.composedPath === 'function' ? event.composedPath() : [event.target];
    const direct = path.find(isVideo);
    if (direct) return direct;
    if (!includePlayerControls) return null;

    // Player buttons are usually siblings of <video> inside the same container.
    return (
      visibleVideos().find(
        (video) =>
          video.parentElement &&
          video.parentElement !== document.body &&
          path.indexOf(video.parentElement) !== -1
      ) || null
    );
  }

  function getVideo() {
    const videos = visibleVideos();
    if (!videos.length) return null;

    const fullscreen = document.fullscreenElement;
    if (fullscreen) {
      const inFullscreen = videos.find(
        (video) =>
          video === fullscreen ||
          fullscreen.contains(video) ||
          video.contains(fullscreen) ||
          (fullscreen.shadowRoot && queryAll(fullscreen.shadowRoot, 'video').indexOf(video) !== -1)
      );
      if (inFullscreen) return inFullscreen;
    }

    if (hoveredVideo && videos.indexOf(hoveredVideo) !== -1) return hoveredVideo;
    if (clickedVideo && videos.indexOf(clickedVideo) !== -1) return clickedVideo;

    const playing = videos.find((video) => !video.paused && !video.ended);
    if (playing) return playing;

    // With exactly one video on the page there is no ambiguity.
    return videos.length === 1 ? videos[0] : null;
  }

  document.addEventListener(
    'pointerover',
    (event) => {
      hoveredVideo = videoFromEvent(event, false);
    },
    true
  );
  document.addEventListener(
    'pointerout',
    (event) => {
      if (
        hoveredVideo &&
        !(event.relatedTarget && hoveredVideo.contains(event.relatedTarget))
      ) {
        hoveredVideo = null;
      }
    },
    true
  );
  document.addEventListener(
    'pointerdown',
    (event) => {
      // Clicking outside a player means the site should get its keys back.
      clickedVideo = videoFromEvent(event, true);
    },
    true
  );
  document.addEventListener(
    'focusin',
    (event) => {
      const video = videoFromEvent(event, true);
      if (video) clickedVideo = video;
    },
    true
  );

  // ---------- on-screen feedback ----------
  let osd = null;
  let osdTimer = 0;

  function showOSD(text) {
    let host = document.fullscreenElement;
    // A <video> cannot display child elements; put the overlay in its parent.
    if (host && isVideo(host)) host = host.parentElement;
    if (!host || !host.isConnected) host = document.body;
    if (!host) return;

    if (!osd) {
      osd = document.createElement('div');
      osd.setAttribute('role', 'status');
      osd.setAttribute('aria-live', 'polite');
      osd.style.cssText =
        'position:fixed;top:12%;left:50%;transform:translateX(-50%);z-index:2147483647;' +
        'padding:8px 16px;border-radius:8px;background:rgba(0,0,0,.75);color:#fff;' +
        'font:600 18px/1.2 system-ui,sans-serif;pointer-events:none;transition:opacity .2s;';
    }
    if (osd.parentNode !== host) host.appendChild(osd);
    osd.textContent = text;
    osd.style.opacity = '1';
    clearTimeout(osdTimer);
    osdTimer = setTimeout(() => {
      osd.style.opacity = '0';
    }, 800);
  }

  // ---------- actions ----------
  function togglePlay(video) {
    if (video.paused || video.ended) {
      showOSD('▶ Play');
      try {
        const result = video.play();
        // Autoplay policies can reject play(); do not leave an unhandled rejection.
        if (result && typeof result.catch === 'function') {
          result.catch(() => showOSD('▶ Play blocked by the browser'));
        }
      } catch (_) {
        showOSD('▶ Play unavailable');
      }
      return;
    }
    try {
      video.pause();
    } catch (_) {
      /* nothing useful to do */
    }
    showOSD('⏸ Pause');
  }

  function seekBy(video, seconds) {
    let min = 0;
    let max = Infinity;
    try {
      if (video.seekable && video.seekable.length) {
        min = video.seekable.start(0);
        max = video.seekable.end(video.seekable.length - 1);
      } else if (Number.isFinite(video.duration) && video.duration > 0) {
        max = video.duration;
      }
    } catch (_) {
      /* fall back to unbounded clamping */
    }

    const before = video.currentTime;
    try {
      video.currentTime = Math.min(max, Math.max(min, before + seconds));
    } catch (_) {
      showOSD('Seeking unavailable');
      return;
    }
    const moved = Math.round((video.currentTime - before) * 10) / 10;
    showOSD((moved >= 0 ? '⏩ +' : '⏪ −') + Math.abs(moved) + 's');
  }

  function changeSpeed(video, direction) {
    const next = Math.round((video.playbackRate + direction * SPEED_STEP) * 100) / 100;
    const rate = Math.min(SPEED_MAX, Math.max(SPEED_MIN, next));
    try {
      video.playbackRate = rate;
    } catch (_) {
      showOSD('Speed control unavailable');
      return;
    }
    showOSD('Speed ' + video.playbackRate.toFixed(2) + '×');
  }

  // ---------- key handling ----------
  function isTyping(target, path) {
    const nodes = path ? path.slice() : [];
    if (target && nodes.indexOf(target) === -1) nodes.unshift(target);

    let active = document.activeElement;
    while (active) {
      if (nodes.indexOf(active) === -1) nodes.push(active);
      active = active.shadowRoot && active.shadowRoot.activeElement;
    }

    return nodes.some((node) => {
      if (!node || node.nodeType !== 1) return false;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName)) return true;
      if (node.isContentEditable) return true;
      return (
        typeof node.getAttribute === 'function' &&
        node.hasAttribute('contenteditable') &&
        node.getAttribute('contenteditable') !== 'false'
      );
    });
  }

  let swallowSpace = false;
  let lastRepeat = 0;

  function onKeyDown(event) {
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    if (isTyping(event.target, typeof event.composedPath === 'function' ? event.composedPath() : null))
      return;
    if (KEYS.indexOf(event.key) === -1) return;

    const video = getVideo();
    // Never steal the site's shortcuts when there is no clear target video.
    if (!video) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.key === ' ' || event.key === 'Spacebar') {
      swallowSpace = true;
      if (event.repeat) return; // holding space must not flicker play/pause
      togglePlay(video);
      return;
    }

    const now = Date.now();
    if (event.repeat && now - lastRepeat < REPEAT_DELAY_MS) return;
    lastRepeat = now;

    switch (event.key) {
      case 'ArrowLeft':
        seekBy(video, -SEEK_SECONDS);
        break;
      case 'ArrowRight':
        seekBy(video, SEEK_SECONDS);
        break;
      case 'ArrowUp':
        changeSpeed(video, 1);
        break;
      case 'ArrowDown':
        changeSpeed(video, -1);
        break;
    }
  }

  function swallowSpaceEvents(event) {
    if (!swallowSpace) return;
    if (event.key !== ' ' && event.key !== 'Spacebar' && event.key !== 'Space') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type === 'keyup') swallowSpace = false;
  }

  // Capture phase so we run before the site's own handlers.
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', swallowSpaceEvents, true);
  window.addEventListener('keypress', swallowSpaceEvents, true);
})();
