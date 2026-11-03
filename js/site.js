// =========================================================
// SITE BOILERPLATE: Barba + GSAP + Lenis + ScrollTrigger
// Transition: Shutter Page Transition (Osmo Supply)
// Component init functions live in js/main.js
// =========================================================


// ---------------------------------------------------------
// SETUP
// ---------------------------------------------------------

const hasLenis = typeof window.Lenis !== 'undefined';
const hasScrollTrigger = typeof window.ScrollTrigger !== 'undefined';

gsap.registerPlugin(CustomEase, SplitText);
if (typeof Draggable !== 'undefined') gsap.registerPlugin(Draggable);
if (hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);

history.scrollRestoration = 'manual';

let lenis = null;
let scope = document;          // container the registry checks against; swapped on every navigation
let siteInitialized = false;
let pageCleanups = [];         // cleanups for the page currently shown
let leavingCleanups = [];      // cleanups for the page on its way out

// Live reduced-motion flag (users can toggle it while the site is open)
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = reducedMotionQuery.matches;
reducedMotionQuery.addEventListener('change', (e) => { reducedMotion = e.matches; });

// Custom eases, same curves as --sys-motion-easing-* in tokens.css
CustomEase.create('osmo', '0.625, 0.05, 0, 1');
CustomEase.create('energy', '0.32, 0.72, 0, 1');
CustomEase.create('smooth', '0.38, 0.005, 0.215, 1');
CustomEase.create('punch', '0.19, 1, 0.22, 1');
CustomEase.create('brand', '0.625, 0.05, 0, 1'); // default site ease (osmo)
CustomEase.create('relaxed', '0.7, 0, 0.3, 1');
CustomEase.create('expo-in-out', '0.87, 0, 0.13, 1');
CustomEase.create('jump', '0.35, 1.5, 0.6, 1');
CustomEase.create('pop', '0.17, 0.67, 0.3, 1.33');
CustomEase.create('anticipate', '0.8, -0.4, 0.5, 1');
CustomEase.create('fade', '0.25, 0.1, 0.25, 1');
CustomEase.create('elastic', 'M0,0 C0.0127,0.0956 0.0562,0.434 0.076,0.5737 C0.0958,0.7134 0.1077,0.7761 0.1187,0.8382 C0.1297,0.9003 0.1341,0.9145 0.1419,0.9463 C0.1497,0.9781 0.1574,1.0055 0.1654,1.0292 C0.1734,1.0529 0.1814,1.0725 0.1897,1.0886 C0.198,1.1047 0.2086,1.1177 0.2153,1.1258 C0.222,1.1339 0.2248,1.1342 0.2297,1.137 C0.2346,1.1398 0.2396,1.1415 0.2448,1.1424 C0.25,1.1433 0.2554,1.1433 0.261,1.1423 C0.2666,1.1413 0.2704,1.1409 0.2786,1.1366 C0.2868,1.1323 0.2922,1.1308 0.3101,1.1165 C0.328,1.1022 0.3669,1.0665 0.3862,1.0507 C0.4055,1.0349 0.4118,1.0304 0.4257,1.0219 C0.4397,1.0134 0.4548,1.0053 0.4699,0.9995 C0.485,0.9937 0.4967,0.9898 0.5163,0.9872 C0.5359,0.9846 0.5383,0.9819 0.5877,0.9842 C0.6371,0.9865 0.7439,0.9985 0.8126,1.0011 C0.8813,1.0037 0.9688,1.0002 1,1');

// Bounce is a CSS linear() curve: read it from the token so CSS and GSAP share one source
function registerLinearEase(name, token) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const match = raw.match(/^linear\((.*)\)$/);
  if (!match) return;

  // "0.5 20%" -> { value: 0.5, at: 0.2 }. Stops without a percentage are filled in evenly.
  const stops = match[1].split(',').map((part) => {
    const [value, pct] = part.trim().split(/\s+/);
    return { value: parseFloat(value), at: pct ? parseFloat(pct) / 100 : null };
  });
  stops[0].at ??= 0;
  stops[stops.length - 1].at ??= 1;

  gsap.registerEase(name, (progress) => {
    for (let i = 1; i < stops.length; i++) {
      if (progress <= stops[i].at) {
        const from = stops[i - 1];
        const to = stops[i];
        const span = to.at - from.at || 1;
        return from.value + ((progress - from.at) / span) * (to.value - from.value);
      }
    }
    return 1;
  });
}
registerLinearEase('bounce', '--sys-motion-easing-bounce');
gsap.defaults({ ease: 'brand', duration: 0.6 });

const exists = (selector) => !!scope.querySelector(selector);

// Init functions that return a cleanup register it here; it runs when the page leaves
const onPageLeave = (cleanup) => {
  if (typeof cleanup === 'function') pageCleanups.push(cleanup);
};


// ---------------------------------------------------------
// INIT REGISTRY
// ---------------------------------------------------------

// Once, on first load: persistent UI outside the container
function initSite() {
  initLenis();
  if (siteInitialized) return;
  siteInitialized = true;

  initThemeToggle();
  initFixedUnderlayNavigation();
  initDynamicCurrentTime();
}

// Barba also fires the enter hooks on first load, so each stage runs only once per container
const initializedBefore = new WeakSet();
const initializedAfter = new WeakSet();

// Every page, before it becomes visible: set initial states
function initPageBeforeEnter(container) {
  scope = container || document;
  if (initializedBefore.has(scope)) return;
  initializedBefore.add(scope);

  if (exists('[data-button-animate-chars]')) initButtonCharacterStagger(scope);
  initUiSounds();
}

// Every page, after the enter animation: reveals and anything that measures layout or scroll
function initPageAfterEnter(container) {
  scope = container || document;
  if (initializedAfter.has(scope)) return;
  initializedAfter.add(scope);

  // Pinned sections go first: ScrollTriggers created after a pin measure the space its spacer adds
  if (exists('[data-sticky-feature-wrap]')) onPageLeave(initStickyFeatures(scope));
  if (exists('[data-feature-pills-init]')) onPageLeave(initExpandingFeaturePills(scope));

  if (exists('[data-split="heading"]')) onPageLeave(initMaskTextScrollReveal(scope));
  if (exists('[data-mask-reveal]')) initMaskBlockScrollReveal(scope);
  if (exists('[data-logo-wall-cycle-init]')) onPageLeave(initLogoWallCycle(scope));
  if (exists('.canvas-matter__target')) onPageLeave(initFalling2DMatterJS(scope));
  if (exists('[data-hero-parallax]')) onPageLeave(initHeroParallax(scope));
  if (exists('[data-token-value]')) onPageLeave(initTokenValues(scope));
  if (exists('[data-highlight-text]')) onPageLeave(initHighlightText(scope));
  if (exists('[data-marquee-scroll-direction-target]')) onPageLeave(initMarqueeScrollDirection(scope));
  if (exists('[data-rotating-title]')) onPageLeave(initRotatingText(scope));
  if (exists('[data-shutter-scroll-transition]')) onPageLeave(initShutterScrollTransition(scope));
  if (exists('[data-dropping-stack-init]')) onPageLeave(initDroppingCardsStack(scope));
  if (exists('[data-step-timeline-init]')) onPageLeave(initStepByStepTimeline(scope));
  if (exists('[data-showcase-slider-init]')) onPageLeave(initShowcaseSlider(scope));
  if (exists('[data-image-cycle]')) onPageLeave(initImageCycle(scope));
  if (exists('[data-experience-parallax]')) onPageLeave(initExperienceParallax(scope));
  if (exists('[data-experience-gather]')) onPageLeave(initExperienceGather(scope));
  if (exists('[data-click-zoom], [data-click-zoom-article]')) onPageLeave(initClickToZoomBasic(scope));
  if (exists('[data-stacking-cards-item]')) onPageLeave(initStackingCardsParallax(scope));
  if (exists('[data-follower-wrap]')) onPageLeave(initPreviewFollower(scope));
  if (exists('[data-cursor-marquee-status]')) onPageLeave(initCursorMarqueeEffect(scope));
  if (exists('[data-directional-hover]')) initDirectionalListHover(scope);
  if (exists('[data-odometer-group]')) onPageLeave(initNumberOdometer(scope));
  if (exists('[data-tabs="wrapper"]')) onPageLeave(initTabSystem(scope));
  if (exists('[data-testimonial-wrap]')) onPageLeave(initLineRevealTestimonials(scope));
  if (exists('[data-centered-slider="wrapper"]')) onPageLeave(initCenteredLoopingSlider(scope));
  if (exists('[data-logo-testimonials-init]')) onPageLeave(initLogoCardTestimonials(scope));
  if (exists('[data-toc-wrap]')) onPageLeave(initTableOfContents(scope));
  if (exists('[data-footer-parallax]')) onPageLeave(initFooterParallax(scope));
  if (exists('[data-share]')) onPageLeave(initShareLinks(scope));
  if (exists('[data-face]')) onPageLeave(initFaceFollowCursor(scope));
  if (exists('.copy-email-button')) initCopyEmailClipboard(scope);
  if (exists('[data-back-to-top], [data-scroll-link]')) initBackToTop(scope);

  refreshScroll();
}


// ---------------------------------------------------------
// TRANSITIONS
// Shutter Page Transition (Osmo Supply)
// ---------------------------------------------------------

const shutterAmountConfig = {
  desktop: 10,
  tablet: 10,
  mobileLandscape: 10,
  mobile: 10
};

const transitionDuration = 0.5;
const shutterStaggerAmount = 0.3;

function runPageOnceAnimation(next) {
  const tl = gsap.timeline();

  tl.call(() => {
    resetPage(next);
  }, null, 0);

  return tl;
}

function runPageLeaveAnimation(current, next) {

  generateShutters(); // Run shutters Helper

  const transitionPanel = document.querySelector("[data-transition-panel]");
  const allShutters = transitionPanel.querySelectorAll("[data-transition-shutter]");

  const tl = gsap.timeline({
    onComplete: () => { current.remove() }
  });

  if (reducedMotion) {
    // Immediate swap behavior if user prefers reduced motion
    return tl.set(current, { autoAlpha: 0 });
  }

  tl.set(next, {
    autoAlpha: 0,
  }, 0);

  tl.set(transitionPanel, {
    opacity: 1,
    pointerEvents: "none"
  }, 0);

  tl.set(allShutters, {
    scaleY: 1.02,
    yPercent: 50,
    clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
  }, 0);

  tl.to(allShutters, {
    duration: transitionDuration,
    ease: "power3.in",
    yPercent: 0,
    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    yPercent: 0,
    stagger: {
      amount: shutterStaggerAmount,
      from: "end"
    }
  }, 0);

  tl.fromTo(current,{
    y: "0vh"
  },{
    y: "-15vh",
    ease: "power3.in",
    duration: transitionDuration * 1.5
  }, 0);

  return tl;
}

function runPageEnterAnimation(next) {
  const transitionPanel = document.querySelector("[data-transition-panel]");
  const allShutters = transitionPanel.querySelectorAll("[data-transition-shutter]");

  const tl = gsap.timeline();

  if (reducedMotion) {
    // Immediate swap behavior if user prefers reduced motion
    tl.set(next, { autoAlpha: 1 });
    tl.add("pageReady")
    tl.call(resetPage, [next], "pageReady");
    return new Promise(resolve => tl.call(resolve, null, "pageReady"));
  }

  const totalCoverDuration = transitionDuration + shutterStaggerAmount;
  tl.add("startEnter", totalCoverDuration);

  tl.set(next, {
    autoAlpha: 1
  }, "startEnter");

  tl.to(allShutters, {
    duration: transitionDuration * 1.5,
    ease: "expo.out",
    clipPath: "polygon(0% 0%, 100% 0%, 100% -2%, 0% -2%)",
    yPercent: -50,
    stagger: {
      amount: shutterStaggerAmount,
      from: "end"
    },
    overwrite: "auto",
  }, "startEnter");

  tl.add("pageReady");
  tl.call(resetPage, [next], "pageReady");

  tl.from(next, {
    ease: "expo.out",
    y: "20vh",
    duration: totalCoverDuration,
  }, "startEnter");

  return new Promise(resolve => {
    tl.call(resolve, null, "pageReady");
  });
}

// Helper: Generate the Shutters
function generateShutters() {
  const panel = document.querySelector("[data-transition-panel]");
  if (!panel) return;

  const width = window.innerWidth;
  const isLandscape = window.innerWidth > window.innerHeight;

  let shutterAmount = shutterAmountConfig.desktop;

  if (width <= 479) {
    shutterAmount = shutterAmountConfig.mobile;
  } else if (width <= 767) {
    shutterAmount = isLandscape ? shutterAmountConfig.mobileLandscape : shutterAmountConfig.mobile;
  } else if (width <= 991) {
    shutterAmount = shutterAmountConfig.tablet;
  }

  const shutters = panel.querySelectorAll("[data-transition-shutter]");

  if (shutters.length === shutterAmount) return;

  const template = shutters[0];
  if (!template) return;

  const frag = document.createDocumentFragment();

  for (let i = 0; i < shutterAmount; i++) {
    frag.appendChild(template.cloneNode(true));
  }

  panel.replaceChildren(frag);
}


// ---------------------------------------------------------
// LIFECYCLE
// ---------------------------------------------------------

barba.hooks.beforeEnter(({ next }) => {
  // Hand the outgoing page's cleanups over before the new page registers its own
  leavingCleanups = pageCleanups;
  pageCleanups = [];

  // Stack the incoming page on top of the outgoing one while they overlap
  gsap.set(next.container, { position: 'fixed', top: 0, left: 0, right: 0 });
  lenis?.stop();
  initPageBeforeEnter(next.container);
});

// In sync mode the new page is already initialized here, so only tear down what belonged to the old one
barba.hooks.afterLeave(({ current }) => {
  leavingCleanups.forEach((cleanup) => cleanup());
  leavingCleanups = [];

  if (hasScrollTrigger) {
    ScrollTrigger.getAll().forEach((trigger) => {
      if (trigger.trigger && current.container.contains(trigger.trigger)) trigger.kill();
    });
  }
});

barba.hooks.afterEnter(({ next }) => {
  initPageAfterEnter(next.container);

  // The navigation is persistent, so make sure its menu is shut on the new page
  window.closeUnderlayNav?.();

});

// The transition is over (page in place, scroll reset): re-measure pins and scroll to a #hash target.
// Doing this earlier measured the page while it was still fixed and shifted, which broke the pinned sections.
barba.hooks.after(({ next }) => {
  refreshScroll();
  gsap.delayedCall(0.1, refreshScroll);

  // A link like index.html#about: scroll to that section
  const hash = (next.url && (next.url.hash || new URL(next.url.href, window.location.href).hash.slice(1))) || window.location.hash.slice(1);
  const target = hash && next.container.querySelector('#' + CSS.escape(hash.replace(/^#/, '')));
  if (target) gsap.delayedCall(0.3, () => scrollToAnchor(target));
});

barba.init({
  debug: false,           // set to true while building
  timeout: 7000,
  preventRunning: true,
  transitions: [
    {
      name: 'default',
      sync: true,

      async once({ next }) {
        initSite();
        initPageBeforeEnter(next.container);
        await runPageOnceAnimation(next.container);

        // First visit: background, header, marquee and overlay play first, then the reveals and the falling objects start together
        await initHeroIntro(next.container);
        initPageAfterEnter(next.container);
      },

      async leave({ current, next }) {
        return runPageLeaveAnimation(current.container, next.container);
      },

      async enter({ next }) {
        return runPageEnterAnimation(next.container);
      },
    },
  ],
});


// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

// Initialize Lenis (with GSAP ScrollTrigger)
function initLenis() {
  if (lenis || !hasLenis || reducedMotion) return;

  lenis = new Lenis();
  window.lenis = lenis;

  if (hasScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
}

function resetPage(container) {
  window.scrollTo(0, 0);
  lenis?.scrollTo(0, { immediate: true, force: true });
  gsap.set(container, { clearProps: 'position,top,left,right' });
  lenis?.resize();
  lenis?.start();
}

function refreshScroll() {
  lenis?.resize();
  if (hasScrollTrigger) ScrollTrigger.refresh();
}
