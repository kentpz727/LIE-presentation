import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/black.css';
import './style.css';

import Reveal from 'reveal.js';

let quoteFragmentTimer = null;
let chartFragmentTimer = null;
let issueOverviewTimer = null;
let audioContext = null;
let soundEnabled = true;

const getCurrentPresentSlide = (matcher) => {
  const activeSlides = [...document.querySelectorAll('.slides section.present')];
  return [...activeSlides].reverse().find((slide) => matcher(slide)) || null;
};

const formatCurrencyValue = (value) => {
  const numericValue = Number(value);
  const formattedValue = Number.isInteger(numericValue)
    ? numericValue.toString()
    : numericValue.toFixed(1).replace(/\.0$/, '');

  return `$${formattedValue}B`;
};

const animateValue = (element) => {
  if (!element || element.dataset.animated === 'true') {
    return;
  }

  const finalValue = Number(element.dataset.value);
  if (!Number.isFinite(finalValue)) {
    return;
  }

  element.dataset.animated = 'true';
  const startValue = Math.min(0.1, finalValue * 0.05);
  const duration = 1100;
  const startTime = performance.now();

  const tick = (timestamp) => {
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = startValue + (finalValue - startValue) * eased;

    element.textContent = formatCurrencyValue(currentValue);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      element.textContent = formatCurrencyValue(finalValue);
    }
  };

  requestAnimationFrame(tick);
};

const ensureAudioContext = () => {
  if (audioContext) {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  }

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    return null;
  }

  audioContext = new AudioCtor();
  return audioContext;
};

const playTone = ({ frequency = 440, duration = 0.12, volume = 0.04, type = 'sine', start = 0, sweep = 0 }) => {
  if (!soundEnabled) {
    return;
  }

  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const now = context.currentTime + start;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (sweep) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(80, frequency + sweep), now + duration);
  }

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
};

const playValueTone = () => playTone({ frequency: 520, duration: 0.12, volume: 0.03, type: 'triangle', sweep: 120 });
const playChartTone = () => playTone({ frequency: 300, duration: 0.18, volume: 0.035, type: 'sine', sweep: 100 });
const playTextTone = () => playTone({ frequency: 660, duration: 0.1, volume: 0.025, type: 'triangle', sweep: 80 });
const playNavigationTone = () => playTone({ frequency: 480, duration: 0.08, volume: 0.02, type: 'sine', sweep: 40 });

const setSoundState = (nextState) => {
  soundEnabled = nextState;
  const toggle = document.querySelector('.sound-toggle');
  if (!toggle) {
    return;
  }

  toggle.textContent = soundEnabled ? 'Sound: on' : 'Sound: off';
  toggle.setAttribute('aria-pressed', String(soundEnabled));

  if (soundEnabled) {
    ensureAudioContext();
  }
};

const attachSoundControls = () => {
  const toggle = document.querySelector('.sound-toggle');
  if (!toggle) {
    return;
  }

  toggle.addEventListener('click', () => {
    setSoundState(!soundEnabled);
    if (soundEnabled) {
      playNavigationTone();
    }
  });

  window.addEventListener('pointerdown', () => {
    if (soundEnabled) {
      ensureAudioContext();
    }
  }, { once: true });
};

const scheduleSlideOneFragments = () => {
  clearTimeout(quoteFragmentTimer);

  const currentSlide = getCurrentPresentSlide((slide) => slide.classList.contains('quote-slide'));
  if (!currentSlide || !currentSlide.classList.contains('quote-slide')) {
    return;
  }

  if (currentSlide.id === 'final-question-slide') {
    const fragments = [...currentSlide.querySelectorAll('.fragment')];
    if (!fragments.length) {
      return;
    }

    quoteFragmentTimer = setTimeout(() => {
      const activeSlide = document.getElementById('final-question-slide');
      if (!activeSlide) {
        return;
      }

      Reveal.nextFragment();

      quoteFragmentTimer = setTimeout(() => {
        const slides = [...document.querySelectorAll('.slides > section')];
        const currentIndex = slides.indexOf(activeSlide);
        if (currentIndex >= 0 && currentIndex < slides.length - 1) {
          Reveal.slide(currentIndex + 1, 0);
        }
      }, 1800);
    }, 1500);

    return;
  }

  if (currentSlide.querySelector('.final-claim-slide')) {
    const fragments = [...currentSlide.querySelectorAll('.fragment')];
    if (!fragments.length) {
      return;
    }

    let fragmentIndex = 0;

    const advanceFragment = () => {
      const activeSlide = getCurrentPresentSlide((slide) => slide.classList.contains('final-claim-slide') && !slide.classList.contains('morph-copy'));
      if (!activeSlide || !activeSlide.classList.contains('final-claim-slide')) {
        return;
      }

      const activeFragments = [...activeSlide.querySelectorAll('.fragment')];
      if (fragmentIndex < activeFragments.length) {
        Reveal.nextFragment();
        fragmentIndex += 1;
        quoteFragmentTimer = setTimeout(advanceFragment, 1800);
        return;
      }

      quoteFragmentTimer = setTimeout(() => {
        const slides = [...document.querySelectorAll('.slides > section')];
        const currentIndex = slides.indexOf(activeSlide);
        if (currentIndex >= 0 && currentIndex < slides.length - 1) {
          Reveal.slide(currentIndex + 1, 0);
        }
      }, 1400);
    };

    quoteFragmentTimer = setTimeout(advanceFragment, 1200);
    return;
  }

  const fragments = [...currentSlide.querySelectorAll('.fragment')];
  if (!fragments.length) {
    return;
  }

  let fragmentIndex = 0;

  const advanceFragment = () => {
    const activeSlide = getCurrentPresentSlide((slide) => slide.classList.contains('quote-slide'));
    if (!activeSlide || !activeSlide.classList.contains('quote-slide')) {
      return;
    }

    const activeFragments = [...activeSlide.querySelectorAll('.fragment')];
    if (fragmentIndex < activeFragments.length) {
      Reveal.nextFragment();
      fragmentIndex += 1;
      quoteFragmentTimer = setTimeout(advanceFragment, 1800);
    }
  };

  quoteFragmentTimer = setTimeout(advanceFragment, 1200);
};

const scheduleChartFragments = () => {
  clearTimeout(chartFragmentTimer);

  const currentSlide = getCurrentPresentSlide((slide) => slide.querySelector('.chart-column') || slide.querySelector('.statement-line') || slide.querySelector('.newzoo-logo') || slide.querySelector('.culture-card'));
  if (!currentSlide || (!currentSlide.querySelector('.chart-column') && !currentSlide.querySelector('.statement-line') && !currentSlide.querySelector('.newzoo-logo') && !currentSlide.querySelector('.culture-card'))) {
    return;
  }

  const fragments = [...currentSlide.querySelectorAll('.chart-column.fragment, .newzoo-logo.fragment, .source-line.fragment, .statement-line.fragment, .more-indicator.fragment, .culture-card.fragment, .culture-title.fragment, .culture-intro.fragment')];
  if (!fragments.length) {
    return;
  }

  let fragmentIndex = 0;

  const advanceFragment = () => {
    const activeSlide = getCurrentPresentSlide((slide) => slide.querySelector('.chart-column') || slide.querySelector('.statement-line') || slide.querySelector('.newzoo-logo') || slide.querySelector('.culture-card'));
    if (!activeSlide || (!activeSlide.querySelector('.chart-column') && !activeSlide.querySelector('.statement-line') && !activeSlide.querySelector('.newzoo-logo') && !activeSlide.querySelector('.culture-card'))) {
      return;
    }

    const activeFragments = [...activeSlide.querySelectorAll('.chart-column.fragment, .newzoo-logo.fragment, .source-line.fragment, .statement-line.fragment, .more-indicator.fragment, .culture-card.fragment, .culture-title.fragment, .culture-intro.fragment')];
    if (fragmentIndex < activeFragments.length) {
      Reveal.nextFragment();
      fragmentIndex += 1;
      chartFragmentTimer = setTimeout(advanceFragment, 700);
    }
  };

  chartFragmentTimer = setTimeout(advanceFragment, 350);
};

const scheduleIssueOverviewFragments = () => {
  clearTimeout(issueOverviewTimer);

  const currentSlide = getCurrentPresentSlide((slide) => slide.classList.contains('issue-overview'));
  if (!currentSlide || !currentSlide.classList.contains('issue-overview')) {
    return;
  }

  const fragments = [...currentSlide.querySelectorAll('.issue-link.fragment')];
  if (!fragments.length) {
    return;
  }

  let fragmentIndex = 0;

  const advanceFragment = () => {
    const activeSlide = getCurrentPresentSlide((slide) => slide.classList.contains('issue-overview'));
    if (!activeSlide || !activeSlide.classList.contains('issue-overview')) {
      return;
    }

    const activeFragments = [...activeSlide.querySelectorAll('.issue-link.fragment')];
    if (fragmentIndex < activeFragments.length) {
      Reveal.nextFragment();
      fragmentIndex += 1;
      issueOverviewTimer = setTimeout(advanceFragment, 850);
    }
  };

  issueOverviewTimer = setTimeout(advanceFragment, 400);
};

Reveal.initialize({
  hash: true,
  slideNumber: true,
  controls: true,
  progress: true,
  center: true,
  transition: 'fade',
  plugins: []
});

Reveal.on('fragmentshown', (event) => {
  const fragment = event.fragment;
  const value = fragment.querySelector('.value');

  if (value) {
    animateValue(value);
    playValueTone();
  }

  if (fragment.classList.contains('chart-column') || fragment.classList.contains('comparison-row') || fragment.classList.contains('table-row')) {
    playChartTone();
  }

  if (fragment.classList.contains('fragment') && !fragment.querySelector('.value') && !fragment.classList.contains('chart-column') && !fragment.classList.contains('comparison-row') && !fragment.classList.contains('table-row')) {
    playTextTone();
  }
});

Reveal.on('slidechanged', (event) => {
  if (event.currentSlide) {
    playNavigationTone();
  }

  if (event.currentSlide && event.currentSlide.id === 'final-question-slide') {
    scheduleSlideOneFragments();
    return;
  }

  if (event.currentSlide && event.currentSlide.classList.contains('quote-slide')) {
    scheduleSlideOneFragments();
    return;
  }

  if (event.currentSlide && event.currentSlide.classList.contains('issue-overview')) {
    scheduleIssueOverviewFragments();
    return;
  }

  if (event.currentSlide && (event.currentSlide.querySelector('.chart-column') || event.currentSlide.querySelector('.statement-line') || event.currentSlide.querySelector('.newzoo-logo') || event.currentSlide.querySelector('.culture-card'))) {
    scheduleChartFragments();
    return;
  }

  clearTimeout(quoteFragmentTimer);
  clearTimeout(chartFragmentTimer);
  clearTimeout(issueOverviewTimer);

  document.querySelectorAll('.chart-column .value').forEach((value) => {
    value.dataset.animated = 'false';
    value.textContent = '$0.1B';
  });
});

document.querySelectorAll('.issue-link').forEach((link) => {
  link.addEventListener('click', () => {
    playNavigationTone();

    const parentSlide = link.closest('.horizontal-slide');
    const slides = [...document.querySelectorAll('.slides > section')];
    const parentIndex = slides.indexOf(parentSlide);
    const targetIndex = Number(link.dataset.targetIndex);

    if (parentIndex >= 0 && Number.isFinite(targetIndex)) {
      Reveal.slide(parentIndex, targetIndex);
    }
  });
});

Reveal.on('ready', () => {
  document.querySelectorAll('.chart-column .value').forEach((value) => {
    value.textContent = '$0.1B';
  });

  attachSoundControls();
  setSoundState(true);
  scheduleSlideOneFragments();
});
