/* ==========================================================================
   Smooth anchor scroll: a long page needs a slower, eased scroll (duration grows with the distance)
   ========================================================================== */

const anchorScroll = {
  pixelsPerSecond: 1200, // lower = slower
  minDuration: 1.6,
  maxDuration: 3.2,
  ease: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) // ease in-out cubic: gentle start and end
};

function scrollToAnchor(target) {
  const top = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY;
  if (!window.lenis) {
    window.scrollTo({ top, behavior: 'smooth' });
    return;
  }
  const distance = Math.abs(top - window.scrollY);
  const duration = Math.min(anchorScroll.maxDuration, Math.max(anchorScroll.minDuration, distance / anchorScroll.pixelsPerSecond));
  window.lenis.scrollTo(top, { duration, easing: anchorScroll.ease });
}

/* ==========================================================================
   Masked Text Reveal (GSAP SplitText) - Osmo Supply
   ========================================================================== */

const splitConfig = {
  lines: { duration: 0.8, stagger: 0.08 },
  words: { duration: 0.6, stagger: 0.06 },
  chars: { duration: 0.4, stagger: 0.01 }
}

function initMaskTextScrollReveal(root = document) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const splits = [];

  root.querySelectorAll('[data-split="heading"]').forEach(heading => {
    // Reset CSS visibility here
    gsap.set(heading, { autoAlpha: 1 });
    if (reduceMotion) return;

    // Find the split type, the default is 'lines'
    const type = heading.dataset.splitReveal || 'lines'
    const typesToSplit =
      type === 'lines' ? ['lines'] :
      type === 'words' ? ['lines','words'] :
      ['lines','words','chars']

    // Split the text
    const split = SplitText.create(heading, {
      type: typesToSplit.join(', '), // split into required elements
      mask: 'lines', // wrap each line in an overflow:hidden div
      autoSplit: true,
      linesClass: 'line',
      wordsClass: 'word',
      charsClass: 'letter',
      onSplit: function(instance) {
        const targets = instance[type] // Register animation targets
        const config = splitConfig[type] // Find matching duration and stagger from our splitConfig

        return gsap.from(targets, {
          yPercent: 110,
          duration: config.duration,
          stagger: config.stagger,
          ease: 'osmo',
          scrollTrigger: {
            trigger: heading,
            start: 'top 80%', // no clamp: these headings sit above the fold and must play at load
            once: true
          }
        });
      }
    })
    splits.push(split)
  })

  // Revert the splits when the page leaves
  return () => splits.forEach(split => split.revert())
}

// Same reveal for blocks such as buttons: [data-mask-reveal] clips, its child slides up
function initMaskBlockScrollReveal(root = document) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const config = splitConfig.lines;

  root.querySelectorAll('[data-mask-reveal]').forEach((wrapper) => {
    gsap.set(wrapper, { autoAlpha: 1 });
    const target = wrapper.firstElementChild;
    if (reduceMotion || !target) {
      wrapper.style.overflow = 'visible';
      return;
    }

    gsap.from(target, {
      yPercent: 110,
      duration: config.duration, // no delay: starts together with the text lines
      ease: 'osmo',
      scrollTrigger: {
        trigger: wrapper,
        start: 'top 95%', // above the fold, plays at load
        once: true
      },
      onComplete: () => {
        // Release the mask so focus rings and press states are not clipped
        wrapper.style.overflow = 'visible';
        gsap.set(target, { clearProps: 'transform' });
      }
    });
  });
}

/* ==========================================================================
   Button with CSS Character Stagger (Osmo Supply)
   ========================================================================== */

function initButtonCharacterStagger(root = document) {
  const offsetIncrement = 0.01; // Transition offset increment in seconds
  const buttons = root.querySelectorAll('[data-button-animate-chars]');

  buttons.forEach(button => {
    const text = button.textContent; // Get the button's text content
    button.innerHTML = ''; // Clear the original content

    [...text].forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.transitionDelay = `${index * offsetIncrement}s`;

      // Handle spaces explicitly
      if (char === ' ') {
        span.style.whiteSpace = 'pre'; // Preserve space width
      }

      button.appendChild(span);
    });
  });
}

/* ==========================================================================
   Marquee with Scroll Direction (Osmo Supply)
   ========================================================================== */

function initMarqueeScrollDirection(root = document) {
  const cleanups = [];

  root.querySelectorAll('[data-marquee-scroll-direction-target]').forEach((marquee) => {
    // Query marquee elements
    const marqueeContent = marquee.querySelector('[data-marquee-collection-target]');
    const marqueeScroll = marquee.querySelector('[data-marquee-scroll-target]');
    if (!marqueeContent || !marqueeScroll) return;

    // Get data attributes
    const { marqueeSpeed: speed, marqueeDirection: direction, marqueeDuplicate: duplicate, marqueeScrollSpeed: scrollSpeed } = marquee.dataset;

    // Convert data attributes to usable types
    const marqueeSpeedAttr = parseFloat(speed);
    const marqueeDirectionAttr = direction === 'right' ? 1 : -1; // 1 for right, -1 for left
    const duplicateAmount = parseInt(duplicate || 0);
    const scrollSpeedAttr = parseFloat(scrollSpeed);
    const speedMultiplier = window.innerWidth < 479 ? 0.25 : window.innerWidth < 991 ? 0.5 : 1;

    let marqueeSpeed = marqueeSpeedAttr * (marqueeContent.offsetWidth / window.innerWidth) * speedMultiplier;

    // Precompute styles for the scroll container
    marqueeScroll.style.marginLeft = `${scrollSpeedAttr * -1}%`;
    marqueeScroll.style.width = `${(scrollSpeedAttr * 2) + 100}%`;

    // Duplicate marquee content
    if (duplicateAmount > 0) {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < duplicateAmount; i++) {
        fragment.appendChild(marqueeContent.cloneNode(true));
      }
      marqueeScroll.appendChild(fragment);
    }

    // GSAP animation for marquee content
    const marqueeItems = marquee.querySelectorAll('[data-marquee-collection-target]');
    const animation = gsap.to(marqueeItems, {
      xPercent: -100, // Move completely out of view
      repeat: -1,
      duration: marqueeSpeed,
      ease: 'linear'
    }).totalProgress(0.5);

    // Initialize marquee in the correct direction
    gsap.set(marqueeItems, { xPercent: marqueeDirectionAttr === 1 ? 100 : -100 });
    animation.timeScale(-marqueeDirectionAttr); // Start in the direction set on the attribute (left = content moves left)
    animation.play(); // Start animation immediately

    // Set initial marquee status
    marquee.setAttribute('data-marquee-status', 'normal');

    // ScrollTrigger logic for direction inversion
    let lastScroll = window.scrollY;
    const directionTrigger = ScrollTrigger.create({
      trigger: marquee,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        // Ignore the update ScrollTrigger fires on load, only react to real scrolling
        if (self.scroll() === lastScroll) return;
        lastScroll = self.scroll();

        const isInverted = self.direction === 1; // Scrolling down inverts the direction
        const currentDirection = isInverted ? marqueeDirectionAttr : -marqueeDirectionAttr;

        // Update animation direction and marquee status
        animation.timeScale(currentDirection);
        marquee.setAttribute('data-marquee-status', isInverted ? 'inverted' : 'normal');
      }
    });

    // Extra speed effect on scroll
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: marquee,
        start: '0% 100%',
        end: '100% 0%',
        scrub: 0
      }
    });

    // Shift the row opposite to the (inverted) marquee movement while scrolling down
    const scrollStart = marqueeDirectionAttr === -1 ? -scrollSpeedAttr : scrollSpeedAttr;
    const scrollEnd = -scrollStart;

    tl.fromTo(marqueeScroll, { x: `${scrollStart}vw` }, { x: `${scrollEnd}vw`, ease: 'none' });

    // Stop everything when the page leaves
    cleanups.push(() => {
      animation.kill();
      directionTrigger.kill();
      tl.scrollTrigger?.kill();
      tl.kill();
    });
  });

  return () => cleanups.forEach(cleanup => cleanup());
}

/* ==========================================================================
   Theme toggle (light / dark)
   Tokens live in css/tokens.css, the theme is data-theme on <html>.
   ========================================================================== */

function initThemeToggle() {
  const toggles = document.querySelectorAll('[data-theme-toggle]');
  if (!toggles.length) return;

  const root = document.documentElement;

  const sync = () => {
    const isDark = root.dataset.theme === 'dark';
    toggles.forEach(toggle => {
      toggle.setAttribute('aria-pressed', String(isDark));
      toggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    });
  };

  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      sync();
    });
  });

  sync();
}

/* ==========================================================================
   Highlight Text on Scroll (Osmo Supply)
   ========================================================================== */

function initHighlightText(root = document){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const splits = [];

  let splitHeadingTargets = root.querySelectorAll("[data-highlight-text]")
  splitHeadingTargets.forEach((heading) => {
    // Reduced motion: leave the text fully visible
    if (reduceMotion) return;

    const scrollStart = heading.getAttribute("data-highlight-scroll-start") || "top 90%"
    const scrollEnd = heading.getAttribute("data-highlight-scroll-end") || "center 40%"
    const fadedValue = heading.getAttribute("data-highlight-fade") || 0.2 // Opacity of letter
    const staggerValue =  heading.getAttribute("data-highlight-stagger") || 0.1 // Smoother reveal
    
    const split = new SplitText(heading, {
      type: "words, chars",
      autoSplit: true,
      onSplit(self) {
        let ctx = gsap.context(() => {
          let tl = gsap.timeline({
            scrollTrigger: {
              scrub: true,
              trigger: heading, 
              start: scrollStart,
              end: scrollEnd,
            }
          })
          tl.from(self.chars,{
            autoAlpha: fadedValue,
            stagger: staggerValue,
            ease: "linear"
          })
        });
        return ctx; // return our animations so GSAP can clean them up when onSplit fires
      }
    });
    splits.push(split);
  });

  // Revert the splits when the page leaves
  return () => splits.forEach((split) => split.revert());
}

/* ==========================================================================
   Design system reference: print live token values
   Elements with data-token-value="--token-name" show the resolved value and
   update when the theme changes.
   ========================================================================== */

function initTokenValues(root = document) {
  const targets = root.querySelectorAll('[data-token-value]');
  if (!targets.length) return;

  const update = () => {
    const styles = getComputedStyle(document.documentElement);
    targets.forEach((el) => {
      el.textContent = styles.getPropertyValue(el.dataset.tokenValue).trim();
    });
  };

  update();
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return () => observer.disconnect();
}

/* ==========================================================================
   Hero parallax
   The hero is sticky (the photo stays put). The content moves up on scroll
   while the next section slides over it.
   data-hero-parallax                  on the hero
   data-hero-parallax-content          on every element that moves up: content, marquee and the photo.
                                       Give the photo a lower speed (0.1) so it lags behind: that is the parallax.
   data-hero-parallax-speed            1 = moves like normal scroll, 0.5 = half, 1.5 = faster. Default 1
   data-hero-parallax-fade             "true" fades the content out while it moves. Default "false"
   ========================================================================== */

function initHeroParallax(root = document) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tweens = [];
  if (reduceMotion) return;

  root.querySelectorAll('[data-hero-parallax]').forEach((hero) => {
    // Every content element moves, each with its own optional speed and fade
    hero.querySelectorAll('[data-hero-parallax-content]').forEach((content) => {
      // Read config, falling back to defaults
      const speed = parseFloat(content.getAttribute('data-hero-parallax-speed')) || 1;
      const fade = content.getAttribute('data-hero-parallax-fade') === 'true';

      const tween = gsap.to(content, {
        y: () => -hero.offsetHeight * speed,
        autoAlpha: fade ? 0 : 1,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true
        }
      });
      tweens.push(tween);
    });
  });

  return () => tweens.forEach((tween) => {
    tween.scrollTrigger?.kill();
    tween.kill();
  });
}

/* ==========================================================================
   Hero Intro
   Order: background image, then the header comes down, the marquee comes up and the overlay fades in. Resolves with true once the hero text can start revealing.
   Only plays while <html data-intro="pending"> (set in the head, first visit per session).
   ========================================================================== */

async function initHeroIntro(root = document) {
  const html = document.documentElement;
  if (html.dataset.intro !== 'pending') return false;

  const hero = root.querySelector('[data-hero-parallax]');
  const bgImg = hero?.querySelector('.hero__bg-img');
  const overlay = hero?.querySelector('.hero__overlay');
  const marquee = hero?.querySelector('.marquee-advanced');
  const header = document.querySelectorAll('.underlay-nav__logo, .underlay-nav__actions .theme-toggle, .underlay-nav__toggle');

  if (!hero || !bgImg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    html.removeAttribute('data-intro');
    return false;
  }

  try { sessionStorage.setItem('heroIntro', '1'); } catch (e) {}
  window.lenis?.stop();

  // Wait for the photo so the first thing on screen is not an empty frame (max 2.5s)
  await Promise.race([
    bgImg.decode ? bgImg.decode().catch(() => {}) : Promise.resolve(),
    new Promise((resolve) => setTimeout(resolve, 2500))
  ]);

  // Hand the start state over from CSS to GSAP in the same frame
  gsap.set(bgImg, { autoAlpha: 0, scale: 1.15 });
  gsap.set(overlay, { autoAlpha: 0 });
  gsap.set(marquee, { autoAlpha: 1, yPercent: 100 });
  gsap.set(header, { autoAlpha: 1, y: (i, el) => -(el.getBoundingClientRect().bottom + 8) });
  html.removeAttribute('data-intro');

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      defaults: { ease: 'osmo' },
      onComplete: () => {
        gsap.set([bgImg, overlay, marquee, header], { clearProps: 'transform,opacity,visibility' });
        window.lenis?.start(); // scroll was locked for the intro
      }
    });

    // 1. Background image
    tl.to(bgImg, { autoAlpha: 1, scale: 1, duration: 1.4 }, 0);
    // 2. Header comes down, marquee comes up, overlay fades in
    tl.addLabel('chrome', 1);
    tl.to(header, { y: 0, duration: 0.9, stagger: 0.06 }, 'chrome');
    tl.to(marquee, { yPercent: 0, duration: 1 }, 'chrome');
    tl.to(overlay, { autoAlpha: 1, duration: 0.9 }, 'chrome');
    // 3. Hero text and buttons start (the page's own reveals take over), then the objects fall
    tl.call(() => resolve(true), null, 'chrome+=0.6');
  });
}

/* ==========================================================================
   Falling 2D Objects (MatterJS) - Osmo Supply
   Config on #canvas-target (all optional):
   data-falling-amount       number of objects, default 15
   data-falling-size         object size = canvas width / this number, default 7.5
   data-falling-gravity      default 2
   data-falling-restitution  bounciness, default 0.75
   data-falling-textures     comma separated list of SVG paths. Objects then keep each image's own
                             proportions, and "size" = canvas width / this number gives the width of 100 SVG units.
   On screens up to 767px objects are larger and fewer so they stay readable.
   ========================================================================== */

/* Rasterises an SVG to a crisp texture at the size it will be drawn (viewBox proportions are kept) */
const fallingTextureCache = new Map();
function loadFallingTexture(src, unitPx, pixelRatio) {
  const key = `${src}|${Math.round(unitPx)}|${pixelRatio}`;
  if (fallingTextureCache.has(key)) return fallingTextureCache.get(key);

  const promise = fetch(src)
    .then((res) => res.text())
    .then((svg) => {
      const box = svg.match(/viewBox="[\d.\-]+[\s,]+[\d.\-]+[\s,]+([\d.]+)[\s,]+([\d.]+)"/);
      if (!box) throw new Error(`No viewBox in ${src}`);
      const w = (parseFloat(box[1]) * unitPx) / 100;
      const h = (parseFloat(box[2]) * unitPx) / 100;
      const sized = svg.replace('<svg ', `<svg width="${w * pixelRatio}" height="${h * pixelRatio}" `);
      const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const raster = document.createElement('canvas');
          raster.width = Math.ceil(w * pixelRatio);
          raster.height = Math.ceil(h * pixelRatio);
          raster.getContext('2d').drawImage(img, 0, 0, raster.width, raster.height);
          URL.revokeObjectURL(url);
          resolve({ texture: raster.toDataURL('image/png'), w, h, scale: 1 / pixelRatio });
        };
        img.onerror = reject;
        img.src = url;
      });
    })
    .catch(() => null);

  fallingTextureCache.set(key, promise);
  return promise;
}

function initFalling2DMatterJS(root = document) {
  // Every .canvas-matter__target on the page is its own simulation (the hero and the footer)
  const canvases = root.querySelectorAll('.canvas-matter__target');
  if (!canvases.length) return;

  const cleanups = Array.from(canvases).map(initFalling2DCanvas).filter(Boolean);
  return () => cleanups.forEach((fn) => fn());
}

function initFalling2DCanvas(canvas) {
  // Check if canvas is on page
  if (!canvas || typeof Matter === 'undefined') {
    return;
  }

  // Reduced motion: no simulation
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  let destroyCurrent = null;

  function build() {
    canvas.replaceChildren();

    const isSmall = window.innerWidth <= 767;
    const canvasWidth = canvas.clientWidth + 2;
    const canvasHeight = canvas.clientHeight + 2;
    const canvasWallDepth = canvasWidth / 4;
    const smileyAmount = isSmall
      ? Math.ceil((parseFloat(canvas.dataset.fallingAmount) || 15) * 0.6)
      : (parseFloat(canvas.dataset.fallingAmount) || 15); // Amount of objects added to the canvas
    const customTextures = (canvas.dataset.fallingTextures || '').split(',').map((t) => t.trim()).filter(Boolean);
    const smileySize = canvasWidth / (isSmall ? (customTextures.length ? 8 : 7) : (parseFloat(canvas.dataset.fallingSize) || 7.5)); // Size of objects
    const smileySizeTexture = 512; // Size of object texture in pixels
    const smileySizeScale = smileySize / smileySizeTexture;
    const smileyRestitution = parseFloat(canvas.dataset.fallingRestitution) || 0.75; // Bounciness
    const worldGravity = parseFloat(canvas.dataset.fallingGravity) || 2; // Gravity

    // Modules
    let { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter;

    // Create an engine
    let engine = Engine.create();
    engine.world.gravity.y = worldGravity;

    // Create a renderer
    let render = Render.create({
      element: canvas,
      engine: engine,
      options: {
        background: "transparent",
        wireframes: false,
        width: canvasWidth,
        height: canvasHeight,
        pixelRatio: 2,
        border: "none",
      }
    });

    // Generate a random number between min (inclusive) and max (exclusive)
    function getRandomNumber(min, max) {
      return Math.random() * (max - min) + min;
    }

        // Textures
    let textureArray = [
      'img/objects/object-01__seo.svg',
      'img/objects/object-02__geo.svg',
      'img/objects/object-03__aeo.svg',
      'img/objects/object-04__aso.svg',
      'img/objects/object-05__cro.svg',
      'img/objects/object-06__aio.svg'
    ];
    // Every object is { texture, w, h, scale }. Without custom textures they are the square, round objects.
    const legacyEntries = textureArray.map((texture) => ({
      texture, w: smileySize, h: smileySize, scale: smileySizeScale, round: true
    }));
    const entriesReady = customTextures.length
      ? Promise.all(customTextures.map((src) => loadFallingTexture(src, smileySize, 2))).then((list) => list.filter(Boolean))
      : Promise.resolve(legacyEntries);

    // Function to loop trough all textures
    let entries = legacyEntries;
    let textureIndex = 0;
    function getNextEntry() {
      const entry = entries[textureIndex];
      textureIndex = (textureIndex + 1) % entries.length;
      return entry;
    }

    // Create smiley
    const smileyCreate = () => {
      const entry = getNextEntry();
      // Spawn fully above the canvas so objects enter from the very top edge
      let smiley = Bodies.rectangle(
        getRandomNumber(entry.w / 2, Math.max(entry.w / 2, canvasWidth - entry.w / 2)),
        entry.h * -1, entry.w, entry.h, {
          chamfer: { 
            radius: entry.round ? entry.w / 2 : Math.min(entry.w, entry.h) * 0.12
          },
          angle: entry.round ? 0 : getRandomNumber(-0.5, 0.5),
          restitution: smileyRestitution,
          render: {
            sprite: {
              texture: entry.texture,
              xScale: entry.scale,
              yScale: entry.scale
            }
          }
        });
      Composite.add(engine.world, smiley);
    };

    // Create a box with rectangle(x, y, width, height)
    let boxTop = Bodies.rectangle(canvasWidth / 2 + (canvasWallDepth * 2), canvasHeight +
      canvasWallDepth, canvasWidth + (canvasWallDepth * 4), (canvasWallDepth * 2), {
        isStatic: true
      });

    let boxLeft = Bodies.rectangle((canvasWallDepth * -1), canvasHeight / 2, (canvasWallDepth * 2),
      canvasHeight, {
        isStatic: true
      });

    let boxRight = Bodies.rectangle(canvasWidth + canvasWallDepth, canvasHeight / 2, (
      canvasWallDepth * 2), canvasHeight, {
      isStatic: true
    });

    // Ceiling sits above the spawn point, so nothing blocks the objects entering
    let boxBottom = Bodies.rectangle(canvasWidth / 2 + (canvasWallDepth * 2), (canvasWallDepth * -1) - (smileySize * (customTextures.length ? 5 : 3)),
      canvasWidth + (canvasWallDepth * 4), (canvasWallDepth * 2), {
        isStatic: true
      });

    // Add all of the bodies to the world
    Composite.add(engine.world, [boxTop, boxLeft, boxRight, boxBottom]);

    // Run the renderer
    Render.run(render);

    // Create runner
    let runner = Runner.create();

    // Run the engine
    Matter.Runner.run(runner, engine);

    // Custom Function: 
    // To run the function X amount of times
    const timers = [];
    function repeatedFunction(count, maxCount) {
      if (count < maxCount) {
        smileyCreate();
        timers.push(setTimeout(() => {
          repeatedFunction(count + 1, maxCount);
        }, 100)); // Delay in milliseconds
      }
    }
    let destroyed = false;
    entriesReady.then((list) => {
      if (destroyed || !list.length) return;
      entries = list;
      repeatedFunction(0, smileyAmount);
    });

    // Create mouse
    let mouse = Mouse.create(render.canvas);
    let mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false
        }
      }
    });

    Composite.add(engine.world, mouseConstraint);

    // Fix: Allow native page scroll
    mouseConstraint.mouse.element.removeEventListener("mousewheel", mouseConstraint.mouse.mousewheel);
    mouseConstraint.mouse.element.removeEventListener("DOMMouseScroll", mouseConstraint.mouse.mousewheel);
    
    // Fix: Scroll on touch devices
    mouseConstraint.mouse.element.removeEventListener('touchstart', mouseConstraint.mouse.mousedown);
    mouseConstraint.mouse.element.removeEventListener('touchmove', mouseConstraint.mouse.mousemove);
    mouseConstraint.mouse.element.removeEventListener('touchend', mouseConstraint.mouse.mouseup);

    mouseConstraint.mouse.element.addEventListener('touchstart', mouseConstraint.mouse.mousedown, { passive: true });
    mouseConstraint.mouse.element.addEventListener('touchmove', (e) => {
      if (mouseConstraint.body) {
        mouseConstraint.mouse.mousemove(e);
      }
    });
    mouseConstraint.mouse.element.addEventListener('touchend', (e) => {
      if (mouseConstraint.body) {
        mouseConstraint.mouse.mouseup(e);
      }
    });

    // Pause the simulation while the canvas is off screen
    const visibility = new IntersectionObserver(([entry]) => {
      runner.enabled = entry.isIntersecting;
      if (entry.isIntersecting) Render.run(render);
      else Render.stop(render);
    });
    visibility.observe(canvas);

    // Teardown for page changes and resizes
    return () => {
      destroyed = true;
      timers.forEach(clearTimeout);
      visibility.disconnect();
      Render.stop(render);
      Runner.stop(runner);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      canvas.replaceChildren();
    };
  }

  destroyCurrent = build();

  // Rebuild when the width or the height changes (the canvas size is fixed at creation; the footer's height can change as the page settles)
  let lastWidth = canvas.clientWidth;
  let lastHeight = canvas.clientHeight;
  const resizeObserver = new ResizeObserver(() => {
    if (canvas.clientWidth === lastWidth && canvas.clientHeight === lastHeight) return;
    lastWidth = canvas.clientWidth;
    lastHeight = canvas.clientHeight;
    destroyCurrent?.();
    destroyCurrent = build();
  });
  resizeObserver.observe(canvas);

  return () => {
    resizeObserver.disconnect();
    destroyCurrent?.();
  };
}

/* ==========================================================================
   Logo Wall Cycle (Osmo Supply)
   ========================================================================== */

function initLogoWallCycle(root = document) {
  const loopDelay = 1.5;   // Loop Duration
  const duration  = 0.9;   // Animation Duration
  const cleanups = [];

  root.querySelectorAll('[data-logo-wall-cycle-init]').forEach(wall => {
    const list   = wall.querySelector('[data-logo-wall-list]');
    const items  = Array.from(list.querySelectorAll('[data-logo-wall-item]'));

    const shuffleFront = wall.getAttribute('data-logo-wall-shuffle') !== 'false';
    const originalTargets = items
      .map(item => item.querySelector('[data-logo-wall-target]'))
      .filter(Boolean);

    let visibleItems   = [];
    let visibleCount   = 0;
    let pool           = [];
    let pattern        = [];
    let patternIndex   = 0;
    let tl;

    function isVisible(el) {
      return window.getComputedStyle(el).display !== 'none';
    }

    function shuffleArray(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function setup() {
      if (tl) {
        tl.kill();
      }
      visibleItems = items.filter(isVisible);
      visibleCount = visibleItems.length;

      pattern = shuffleArray(
        Array.from({ length: visibleCount }, (_, i) => i)
      );
      patternIndex = 0;

      // remove all injected targets
      items.forEach(item => {
        item.querySelectorAll('[data-logo-wall-target]').forEach(old => old.remove());
      });

      pool = originalTargets.map(n => n.cloneNode(true));

      let front, rest;
      if (shuffleFront) {
        const shuffledAll = shuffleArray(pool);
        front = shuffledAll.slice(0, visibleCount);
        rest  = shuffleArray(shuffledAll.slice(visibleCount));
      } else {
        front = pool.slice(0, visibleCount);
        rest  = shuffleArray(pool.slice(visibleCount));
      }
      pool = front.concat(rest);

      for (let i = 0; i < visibleCount; i++) {
        const parent =
          visibleItems[i].querySelector('[data-logo-wall-target-parent]') ||
          visibleItems[i];
        parent.appendChild(pool.shift());
      }

      tl = gsap.timeline({ repeat: -1, repeatDelay: loopDelay });
      tl.call(swapNext);
      tl.play();
    }

    function swapNext() {
      const nowCount = items.filter(isVisible).length;
      if (nowCount !== visibleCount) {
        setup();
        return;
      }
      if (!pool.length) return;

      const idx = pattern[patternIndex % visibleCount];
      patternIndex++;

      const container = visibleItems[idx];
      const parent =
        container.querySelector('[data-logo-wall-target-parent]') ||
        container.querySelector('*:has(> [data-logo-wall-target])') ||
        container;
      const existing = parent.querySelectorAll('[data-logo-wall-target]');
      if (existing.length > 1) return;

      const current  = parent.querySelector('[data-logo-wall-target]');
      const incoming = pool.shift();

      gsap.set(incoming, { yPercent: 50, autoAlpha: 0 });
      parent.appendChild(incoming);

      if (current) {
        gsap.to(current, {
          yPercent: -50,
          autoAlpha: 0,
          duration,
          ease: "expo.inOut",
          onComplete: () => {
            current.remove();
            pool.push(current);
          }
        });
      }

      gsap.to(incoming, {
        yPercent: 0,
        autoAlpha: 1,
        duration,
        delay: 0.1,
        ease: "expo.inOut"
      });
    }

    setup();

    const trigger = ScrollTrigger.create({
      trigger: wall,
      start: 'top bottom',
      end: 'bottom top',
      onEnter:     () => tl.play(),
      onLeave:     () => tl.pause(),
      onEnterBack: () => tl.play(),
      onLeaveBack: () => tl.pause()
    });

    const onVisibilityChange = () =>
      document.hidden ? tl.pause() : tl.play();
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Stop everything when the page leaves
    cleanups.push(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      trigger.kill();
      tl.kill();
      gsap.killTweensOf(wall.querySelectorAll('[data-logo-wall-target]'));
    });
  });

  return () => cleanups.forEach(cleanup => cleanup());
}

/* ==========================================================================
   Rotating Text (Osmo Supply)
   Library code, plus: reduced-motion fallback, a line reveal on scroll, and a
   cleanup so a re-split (resize) or a page change never leaves a loop running.
   ========================================================================== */

function initRotatingText(root = document) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [];

  root.querySelectorAll('[data-rotating-title]').forEach((heading) => {
    // Reduced motion: keep the static heading, no split, no rotation
    if (reduceMotion) {
      gsap.set(heading, { autoAlpha: 1 });
      return;
    }

    const stepDuration = parseFloat(heading.getAttribute('data-step-duration') || '1.75');
    let loop = null; // the pending delayedCall of the current split

    const split = SplitText.create(heading, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      linesClass: 'rotating-line',
      onSplit(instance) {
        // A re-split restarts the rotation, so stop the previous loop first
        if (loop) loop.kill();
        gsap.set(heading, { autoAlpha: 1 });

        const rotatingSpan = heading.querySelector('[data-rotating-words]');
        if (!rotatingSpan) return;

        const rawWords = rotatingSpan.getAttribute('data-rotating-words') || '';
        const words = rawWords
          .split(',')
          .map((w) => w.trim())
          .filter(Boolean);

        if (!words.length) return;

        // Build inner wrapper with stacked words
        const wrapper = document.createElement('span');
        wrapper.className = 'rotating-text__inner';

        const wordEls = words.map((word) => {
          const el = document.createElement('span');
          el.className = 'rotating-text__word';
          el.textContent = word;
          wrapper.appendChild(el);
          return el;
        });

        // Replace the original content of the highlight span
        rotatingSpan.textContent = '';
        rotatingSpan.appendChild(wrapper);

        requestAnimationFrame(() => {
          // Define duration of your in + out movement
          const inDuration = 0.75;
          const outDuration = 0.6;

          // Initial state: everyone hidden below
          gsap.set(wordEls, { yPercent: 150, autoAlpha: 0 });

          // Show first word immediately
          let activeIndex = 0;
          const firstWord = wordEls[activeIndex];
          gsap.set(firstWord, { yPercent: 0, autoAlpha: 1 });

          // Set initial width to first word
          const firstWidth = firstWord.getBoundingClientRect().width;
          wrapper.style.width = firstWidth + 'px';

          function showNext() {
            const nextIndex = (activeIndex + 1) % wordEls.length;
            const prev = wordEls[activeIndex];
            const current = wordEls[nextIndex];

            const targetWidth = current.getBoundingClientRect().width;

            // Animate wrapper width to match new word
            gsap.to(wrapper, {
              width: targetWidth,
              duration: inDuration,
              ease: 'power4.inOut'
            });

            // Move old word out
            if (prev && prev !== current) {
              gsap.to(prev, {
                yPercent: -150,
                autoAlpha: 0,
                duration: outDuration,
                ease: 'power4.inOut'
              });
            }

            // Reveal new word
            gsap.fromTo(
              current,
              { yPercent: 150, autoAlpha: 0 },
              {
                yPercent: 0,
                autoAlpha: 1,
                duration: inDuration,
                ease: 'power4.inOut'
              }
            );

            activeIndex = nextIndex;

            loop = gsap.delayedCall(stepDuration, showNext);
          }

          // First word is already visible, start rotating after a full step
          if (wordEls.length > 1) {
            loop = gsap.delayedCall(stepDuration, showNext);
          }
        });

        // Lines slide up once when the heading scrolls into view
        return gsap.from(instance.lines, {
          yPercent: 110,
          duration: 0.8,
          stagger: 0.08,
          ease: 'osmo',
          scrollTrigger: {
            trigger: heading,
            start: 'top 85%',
            once: true
          }
        });
      }
    });

    cleanups.push(() => {
      if (loop) loop.kill();
      split.revert();
    });
  });

  return () => cleanups.forEach((cleanup) => cleanup());
}

/* ==========================================================================
   Dropping Cards Stack (Osmo Supply)
   Library code, plus: a root argument, reduced motion (no tween), and a
   cleanup that removes listeners, the Draggable and the loop clones.
   ========================================================================== */

function initDroppingCardsStack(root = document) {
  const stacks = root.querySelectorAll('[data-dropping-stack-init]');
  if (!stacks.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [];

  // Settings
  const visibleCount = 4;
  const minTotalForLoop = 5;
  const duration = reduceMotion ? 0 : 0.75;
  const mainEase = "osmo";
  const dragThresholdPercent = 20;

  const getUnitValue = (val, depth) => {
    const num = parseFloat(val) || 0;
    const unit = String(val).replace(/[0-9.-]/g, '') || 'px';
    return (num * depth) + unit;
  };

  // Controls
  stacks.forEach((stackEl) => {
    const nextBtn = stackEl.querySelector('[data-dropping-stack-next]');
    const prevBtn = stackEl.querySelector('[data-dropping-stack-prev]');

    const list = stackEl.querySelector('.dropping-stack__list');
    let cards = Array.from(list.querySelectorAll('[data-dropping-stack-item]'));
    if (cards.length < 3) return;

    // Fill the loop with clones when there are too few cards
    const clones = [];
    const originalCount = cards.length;
    if (cards.length < minTotalForLoop) {
      const setsNeeded = Math.ceil(minTotalForLoop / originalCount);
      const clonesToAdd = (setsNeeded * originalCount) - originalCount;

      for (let i = 0; i < clonesToAdd; i++) {
        const clone = cards[i % originalCount].cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        list.appendChild(clone);
        clones.push(clone);
      }

      cards = Array.from(list.querySelectorAll('[data-dropping-stack-item]'));
    }

    const total = cards.length;
    let activeIndex = 0;
    let isAnimating = false;

    let dragCard = null;
    let draggableInstance = null;

    let limitX = 1;
    let limitY = 1;

    let offsetX = "0em";
    let offsetY = "0em";

    let isActive = false;

    const mod = (n, m) => ((n % m) + m) % m;
    const cardAt = (offset) => cards[mod(activeIndex + offset, total)];

    function updateOffsetsFromPadding() {
      const collectionEl = stackEl.querySelector('[data-dropping-stack-collection]');
      if (!collectionEl) return;

      const styles = getComputedStyle(collectionEl);

      const padRight = parseFloat(styles.paddingRight) || 0;
      const padLeft = parseFloat(styles.paddingLeft) || 0;

      const padBottom = parseFloat(styles.paddingBottom) || 0;
      const padTop = parseFloat(styles.paddingTop) || 0;

      const steps = Math.max(1, visibleCount - 1);

      const usePadX = Math.max(padRight, padLeft);
      const usePadY = Math.max(padBottom, padTop);

      const signX = padLeft > padRight ? -1 : 1;
      const signY = padTop > padBottom ? -1 : 1;

      const xStep = (usePadX / steps) * signX;
      const yStep = (usePadY / steps) * signY;

      offsetX = xStep + "px";
      offsetY = yStep + "px";
    }

    function updateDragLimits() {
      if (!dragCard) return;
      const cardRect = dragCard.getBoundingClientRect();
      limitX = cardRect.width || 1;
      limitY = cardRect.height || 1;
    }

    // Sets cards to their static stack positions
    function applyState() {
      updateOffsetsFromPadding();

      cards.forEach((card) => {
        gsap.set(card, {
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 0,
          x: 0,
          y: 0,
          xPercent: 0,
          yPercent: 0
        });
      });

      for (let depth = 0; depth < visibleCount; depth++) {
        const card = cardAt(depth);
        const xVal = getUnitValue(offsetX, depth);
        const yVal = getUnitValue(offsetY, depth);

        const state = {
          opacity: 1,
          zIndex: 999 - depth,
          pointerEvents: depth === 0 ? 'auto' : 'none'
        };

        if (offsetX.includes('%')) state.xPercent = parseFloat(xVal); else state.x = xVal;
        if (offsetY.includes('%')) state.yPercent = parseFloat(yVal); else state.y = yVal;

        gsap.set(card, state);
      }

      dragCard = cardAt(0);
      gsap.set(dragCard, { touchAction: 'none' });

      updateDragLimits();

      if (draggableInstance) {
        draggableInstance.kill();
        draggableInstance = null;
      }

      const magnetize = (raw, limit) => {
        const sign = Math.sign(raw) || 1;
        const abs = Math.abs(raw);
        const out = limit * Math.tanh(abs / limit);
        return sign * out;
      };

      draggableInstance = Draggable.create(dragCard, {
        type: 'x,y',
        inertia: false,
        onPress: function () {
          if (isAnimating) return;
          gsap.killTweensOf(dragCard);
          gsap.set(dragCard, { zIndex: 2000, opacity: 1 });
        },
        onDrag: function () {
          if (isAnimating) return;

          const x = magnetize(this.x, limitX);
          const y = magnetize(this.y, limitY);

          gsap.set(dragCard, { x, y, opacity: 1 });
        },
        onRelease: function () {
          if (isAnimating) return;

          const currentX = gsap.getProperty(dragCard, 'x');
          const currentY = gsap.getProperty(dragCard, 'y');

          const movedXPercent = Math.abs(currentX) / limitX * 100;
          const movedYPercent = Math.abs(currentY) / limitY * 100;
          const movedPercent = Math.max(movedXPercent, movedYPercent);

          if (movedPercent >= dragThresholdPercent) {
            animateNext(true, currentX, currentY);
            return;
          }

          // Move back to stack if threshold is not reached
          gsap.to(dragCard, {
            x: 0,
            y: 0,
            opacity: 1,
            duration: reduceMotion ? 0 : 1,
            ease: 'elastic.out(1, 0.7)',
            onComplete: () => {
              applyState();
            }
          });
        }
      })[0];
    }

    function animateNext(fromDrag = false, releaseX = 0, releaseY = 0) {
      if (isAnimating) return;
      isAnimating = true;

      const outgoing = cardAt(0);
      const incomingBack = cardAt(visibleCount);
      const tl = gsap.timeline({
        defaults: { duration, ease: mainEase },
        onComplete: () => {
          activeIndex = mod(activeIndex + 1, total);
          applyState();
          isAnimating = false;
        }
      });

      gsap.set(outgoing, { zIndex: 2000, opacity: 1 });
      if (fromDrag) gsap.set(outgoing, { x: releaseX, y: releaseY });

      // Next: Move top card down and fade it out late
      tl.to(outgoing, { yPercent: 200 }, 0);
      tl.to(outgoing, { opacity: 0, duration: duration * 0.2, ease: 'none' }, duration * 0.4);

      // Next: Shift existing stack cards forward
      for (let depth = 1; depth < visibleCount; depth++) {
        const xVal = getUnitValue(offsetX, depth - 1);
        const yVal = getUnitValue(offsetY, depth - 1);
        const move = { zIndex: 999 - (depth - 1) };

        if (offsetX.includes('%')) move.xPercent = parseFloat(xVal); else move.x = xVal;
        if (offsetY.includes('%')) move.yPercent = parseFloat(yVal); else move.y = yVal;

        tl.to(cardAt(depth), move, 0);
      }

      // Next: Bring new card in from the "invisible" position
      const backX = getUnitValue(offsetX, visibleCount);
      const backY = getUnitValue(offsetY, visibleCount);
      const startX = getUnitValue(offsetX, visibleCount - 1);
      const startY = getUnitValue(offsetY, visibleCount - 1);

      const incomingSet = { opacity: 0, zIndex: 999 - visibleCount };
      if (offsetX.includes('%')) incomingSet.xPercent = parseFloat(backX); else incomingSet.x = backX;
      if (offsetY.includes('%')) incomingSet.yPercent = parseFloat(backY); else incomingSet.y = backY;
      gsap.set(incomingBack, incomingSet);

      const incomingTo = { opacity: 1 };
      if (offsetX.includes('%')) incomingTo.xPercent = parseFloat(startX); else incomingTo.x = startX;
      if (offsetY.includes('%')) incomingTo.yPercent = parseFloat(startY); else incomingTo.y = startY;
      tl.to(incomingBack, incomingTo, 0);
    }

    function animatePrev() {
      if (isAnimating) return;
      isAnimating = true;

      const incomingTop = cardAt(-1);
      const leavingBack = cardAt(visibleCount - 1);
      const tl = gsap.timeline({
        defaults: { duration, ease: mainEase },
        onComplete: () => {
          activeIndex = mod(activeIndex - 1, total);
          applyState();
          isAnimating = false;
        }
      });

      gsap.set(leavingBack, { zIndex: 1 });

      // Prev: Move a card from top-offset to active position
      gsap.set(incomingTop, { opacity: 0, x: 0, xPercent: 0, yPercent: -200, zIndex: 2000 });
      tl.to(incomingTop, { yPercent: 0 }, 0);
      tl.to(incomingTop, { opacity: 1, duration: duration * 0.2, ease: 'none' }, duration * 0.3);

      // Prev: Push current stack cards back one level
      for (let depth = 0; depth < visibleCount - 1; depth++) {
        const xVal = getUnitValue(offsetX, depth + 1);
        const yVal = getUnitValue(offsetY, depth + 1);
        const move = { zIndex: 999 - (depth + 1) };

        if (offsetX.includes('%')) move.xPercent = parseFloat(xVal); else move.x = xVal;
        if (offsetY.includes('%')) move.yPercent = parseFloat(yVal); else move.y = yVal;

        tl.to(cardAt(depth), move, 0);
      }

      // Prev: Slide the back-most card into the "invisible" position
      const backX = getUnitValue(offsetX, visibleCount);
      const backY = getUnitValue(offsetY, visibleCount);
      const hideBack = { opacity: 0 };
      if (offsetX.includes('%')) hideBack.xPercent = parseFloat(backX); else hideBack.x = backX;
      if (offsetY.includes('%')) hideBack.yPercent = parseFloat(backY); else hideBack.y = backY;
      tl.to(leavingBack, hideBack, 0);
    }

    // Keyboard Arrow controls next/prev
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isActive = entry.isIntersecting && entry.intersectionRatio >= 0.6;
      });
    }, { threshold: [0, 0.6, 1] });

    observer.observe(stackEl);

    const onKeyDown = (e) => {
      if (!isActive) return;
      if (isAnimating) return;

      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable);
      if (isTyping) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        animateNext(false);
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        animatePrev();
      }
    };

    const onNext = () => animateNext(false);
    const onResize = () => applyState();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);

    applyState();

    if (nextBtn) nextBtn.addEventListener('click', onNext);
    if (prevBtn) prevBtn.addEventListener('click', animatePrev);

    cleanups.push(() => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      if (nextBtn) nextBtn.removeEventListener('click', onNext);
      if (prevBtn) prevBtn.removeEventListener('click', animatePrev);
      observer.disconnect();
      if (draggableInstance) draggableInstance.kill();
      gsap.killTweensOf(cards);
      clones.forEach((clone) => clone.remove());
    });
  });

  return () => cleanups.forEach((cleanup) => cleanup());
}

/* ==========================================================================
   Shutter Scroll Transition (Osmo Supply)
   Library code, plus a root argument and a returned cleanup (matchMedia revert).
   ========================================================================== */

function initShutterScrollTransition(root = document) {
  // Defaults: edit these to change fallbacks if no data-attribute is added
  const defaultRows = 6;
  const defaultMode = "cover";
  const defaultScrollStart = { cover: "bottom bottom", reveal: "top bottom" };
  const defaultScrollEnd = { cover: "bottom top", reveal: "top center" };
  const defaultScrub = 0.3;
  const defaultShutterDuration = 0.1;
  const defaultStaggerAmount = 0.01;

  // Class names applied to generated elements
  const panelClass = "shutter-scroll-transition__panel";
  const rowClass = "shutter-scroll-transition__row";

  // Breakpoints
  const breakpoints = {
    mobile: "(max-width: 478px)",
    landscape: "(max-width: 767px)",
    tablet: "(max-width: 991px)",
  };

  const instances = [];
  let mm = null;

  function getMode(wrapper) {
    return wrapper.dataset.mode === "reveal" ? "reveal" : defaultMode;
  }

  function getRows(wrapper) {
    const base = parseInt(wrapper.dataset.rows, 10) || defaultRows;

    if (window.matchMedia(breakpoints.mobile).matches) {
      return parseInt(wrapper.dataset.rowsMobile, 10) || base;
    }
    if (window.matchMedia(breakpoints.landscape).matches) {
      return parseInt(wrapper.dataset.rowsLandscape, 10) || base;
    }
    if (window.matchMedia(breakpoints.tablet).matches) {
      return parseInt(wrapper.dataset.rowsTablet, 10) || base;
    }
    return base;
  }

  function getScrollStart(wrapper, mode) {
    return wrapper.dataset.scrollStart || defaultScrollStart[mode];
  }

  function getScrollEnd(wrapper, mode) {
    return wrapper.dataset.scrollEnd || defaultScrollEnd[mode];
  }

  function createRow() {
    const row = document.createElement("div");
    row.classList.add(rowClass);
    row.setAttribute("data-shutter-scroll-row", "");
    return row;
  }

  function buildRows(wrapper, rows) {
    const panel = document.createElement("div");
    panel.classList.add(panelClass);
    panel.setAttribute("data-shutter-scroll-panel", "");

    const fragment = document.createDocumentFragment();
    for (let r = 0; r < rows; r++) {
      fragment.appendChild(createRow());
    }
    panel.appendChild(fragment);
    wrapper.appendChild(panel);

    return { panel };
  }

  function collectRows(panel) {
    return Array.from(panel.children);
  }

  function createAnimation(wrapper, rows, section, mode) {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: getScrollStart(wrapper, mode),
        end: getScrollEnd(wrapper, mode),
        scrub: defaultScrub,
        invalidateOnRefresh: true,
      },
    });

    const fromScale = mode === "cover" ? 0 : 1;
    const toScale = mode === "cover" ? 1 : 0;
    const origin = mode === "cover" ? "bottom center" : "top center";

    gsap.set(rows, {
      scaleY: fromScale,
      transformOrigin: origin,
    });

    tl.to(rows, {
      scaleY: toScale,
      duration: defaultShutterDuration,
      stagger: { each: defaultStaggerAmount, from: "end" },
      ease: "none",
    });

    return tl;
  }

  function setupInstance(wrapper) {
    const section = wrapper.closest("section") || wrapper.parentElement;
    const rows = getRows(wrapper);
    const mode = getMode(wrapper);

    const { panel } = buildRows(wrapper, rows);
    const rowList = collectRows(panel);
    const tl = createAnimation(wrapper, rowList, section, mode);

    return { wrapper, tl };
  }

  function destroyInstance(instance) {
    if (instance.tl) {
      instance.tl.scrollTrigger?.kill();
      instance.tl.kill();
    }
    const panel = instance.wrapper.querySelector("[data-shutter-scroll-panel]");
    if (panel) panel.remove();
  }

  function buildAll() {
    const wrappers = root.querySelectorAll("[data-shutter-scroll-transition]");
    wrappers.forEach((wrapper) => {
      instances.push(setupInstance(wrapper));
    });
    ScrollTrigger.refresh();
  }

  function destroyAll() {
    instances.forEach(destroyInstance);
    instances.length = 0;
  }

  const wrappers = root.querySelectorAll("[data-shutter-scroll-transition]");
  if (!wrappers.length) return;

  mm = gsap.matchMedia();

  mm.add(
    {
      isDesktop: "(min-width: 992px)",
      isTablet: "(min-width: 768px) and (max-width: 991px)",
      isLandscape: "(min-width: 479px) and (max-width: 767px)",
      isMobile: "(max-width: 478px)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      if (context.conditions.reduceMotion) return;

      buildAll();

      return () => {
        destroyAll();
      };
    }
  );

  return () => mm.revert();
}

/* ==========================================================================
   Step-by-step Timeline - Osmo Supply
   Config on [data-step-timeline-init]: data-step-timeline-activation (0 to 1, default 0.5)
   ========================================================================== */

function initStepByStepTimeline(scope = document) {
  const root = scope.querySelector("[data-step-timeline-init]");
  if (!root) return;

  const line = root.querySelector("[data-step-timeline-line]");
  const fill = root.querySelector("[data-step-timeline-fill]");
  const items = Array.from(root.querySelectorAll("[data-step-timeline-item]"));
  if (!line || !fill || !items.length) return;

  const anchors = items.map(
    (item) => item.querySelector("[data-step-timeline-marker]") || item
  );

  const activationInput = parseFloat(root.dataset.stepTimelineActivation);
  const activation = Number.isNaN(activationInput)
    ? 0.5
    : Math.min(Math.max(activationInput, 0), 1);
  const activationPercent = activation * 100;
  const lastIndex = items.length - 1;

  let anchorFractions = [0];

  function measureLine() {
    if (items.length < 2) {
      line.style.height = "0px";
      anchorFractions = [0];
      return;
    }
    const base = line.parentElement.getBoundingClientRect().top;
    const centers = anchors.map((anchor) => {
      const box = anchor.getBoundingClientRect();
      return box.top + box.height / 2 - base;
    });
    const firstCenter = centers[0];
    const span = centers[lastIndex] - firstCenter;
    line.style.top = firstCenter + "px";
    line.style.height = span + "px";
    anchorFractions = centers.map((center) =>
      span > 0 ? (center - firstCenter) / span : 0
    );
  }

  let currentIndex = -2;

  function setCurrentIndex(index) {
    if (index === currentIndex) return;
    currentIndex = index;
    items.forEach((item, i) => {
      const status = index >= 0 && i <= index ? "active" : "inactive";
      if (item.getAttribute("data-status") !== status) {
        item.setAttribute("data-status", status);
      }
      item.toggleAttribute("data-current", i === index);
      item.toggleAttribute("data-previous", i === index - 1);
      item.toggleAttribute("data-next", i === index + 1);
    });
  }

  function indexForProgress(reached, progress) {
    if (!reached) return -1;
    let index = 0;
    for (let i = 0; i < anchorFractions.length; i++) {
      if (progress + 0.0001 >= anchorFractions[i]) index = i;
    }
    return index;
  }

  function updateFromScroll(self) {
    const reached = self.isActive || self.progress >= 1;
    setCurrentIndex(indexForProgress(reached, self.progress));
  }

  setCurrentIndex(-1);
  gsap.set(fill, { transformOrigin: "top", scaleY: 0 });

  if (root._stepTimelineMedia) root._stepTimelineMedia.revert();
  const mediaQueries = gsap.matchMedia();
  root._stepTimelineMedia = mediaQueries;

  mediaQueries.add("(prefers-reduced-motion: no-preference)", () => {
    measureLine();
    ScrollTrigger.addEventListener("refreshInit", measureLine);

    if (items.length > 1) {
      gsap.fromTo(
        fill,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: line,
            start: "top " + activationPercent + "%",
            end: "bottom " + activationPercent + "%",
            scrub: true,
            onUpdate: updateFromScroll,
            onToggle: updateFromScroll,
            onRefresh: updateFromScroll,
          },
        }
      );
    } else {
      setCurrentIndex(0);
    }

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

    ScrollTrigger.refresh();

    return () => {
      window.removeEventListener("load", refresh);
      ScrollTrigger.removeEventListener("refreshInit", measureLine);
    };
  });

  mediaQueries.add("(prefers-reduced-motion: reduce)", () => {
    measureLine();
    gsap.set(fill, { scaleY: 1 });
    setCurrentIndex(lastIndex);
  });

  return () => mediaQueries.revert();
}

/* ==========================================================================
   Experience background parallax
   Each [data-experience-parallax] moves by its own height * speed percent while
   its section scrolls past (data-experience-parallax-speed, default 10).
   Off for reduced motion and on screens up to 767px.
   ========================================================================== */

function initExperienceParallax(root = document) {
  const items = root.querySelectorAll('[data-experience-parallax]');
  if (!items.length) return;

  const mm = gsap.matchMedia();

  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    items.forEach((item) => {
      // Read config, falling back to defaults
      const speed = parseFloat(item.getAttribute('data-experience-parallax-speed')) || 10;

      gsap.fromTo(item, { yPercent: -speed }, {
        yPercent: speed,
        ease: 'none',
        scrollTrigger: {
          trigger: item.closest('section') || item,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true
        }
      });
    });
  });

  return () => mm.revert();
}

/* ==========================================================================
   Experience (mobile): the background photos gather into a row below the buttons while you scroll.
   [data-experience-gather] holds the photos, [data-experience-row-slot] marks where each lands.
   ========================================================================== */

function initExperienceGather(root = document) {
  const bg = root.querySelector('[data-experience-gather]');
  if (!bg) return;

  const section = bg.closest('section');
  const row = section && section.querySelector('[data-experience-row]');
  const media = Array.from(bg.children);
  const slots = Array.from(section ? section.querySelectorAll('[data-experience-row-slot]') : []);
  if (!row || !media.length || slots.length < media.length) return;

  const mm = gsap.matchMedia();

  // Mobile only: on larger screens the photos stay scattered beside the panel (with the parallax)
  mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => {
    const center = (rect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

    // Everything is measured at the start state (progress 0), so the deltas are the full trip
    const delta = (el, i) => {
      const from = center(el.getBoundingClientRect());
      const to = center(slots[i].getBoundingClientRect());
      return { x: to.x - from.x, y: to.y - from.y };
    };

    gsap.to(media, {
      x: (i, el) => delta(el, i).x,
      y: (i, el) => delta(el, i).y,
      scale: (i, el) => slots[i].offsetWidth / el.offsetWidth,
      rotation: (i, el) => -(parseFloat(getComputedStyle(el).rotate) || 0), // cancels the tilt set in CSS
      opacity: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top 60%',
        endTrigger: row,
        end: 'bottom bottom',
        scrub: 0.6,
        invalidateOnRefresh: true
      }
    });
  });

  return () => mm.revert();
}

/* ==========================================================================
   Image Preview Cursor Follower - Osmo Supply
   [data-follower-wrap] > [data-follower-collection] > [data-follower-item]
   each item holds a [data-follower-visual] that is cloned into [data-follower-cursor-inner].
   Desktop with a mouse only: the CSS hides the cursor elsewhere.
   ========================================================================== */

function initPreviewFollower(root = document) {
  // Find every follower wrap
  const wrappers = root.querySelectorAll('[data-follower-wrap]');
  if (!wrappers.length) return;
  const cleanups = [];

  wrappers.forEach(wrap => {
    const collection = wrap.querySelector('[data-follower-collection]');
    const items = wrap.querySelectorAll('[data-follower-item]');
    const follower = wrap.querySelector('[data-follower-cursor]');
    const followerInner = wrap.querySelector('[data-follower-cursor-inner]');

    let prevIndex = null;
    let firstEntry = true;

    const offset = 100; // The animation distance in %
    const duration = 0.5; // The animation duration of all visual transforms
    const ease = 'power2.inOut';

    // Initialize follower position
    gsap.set(follower, { xPercent: -50, yPercent: -50 });

    // Quick setters for x/y
    const xTo = gsap.quickTo(follower, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = gsap.quickTo(follower, 'y', { duration: 0.6, ease: 'power3' });

    // Move the follower on mousemove
    const onMove = e => {
      xTo(e.clientX);
      yTo(e.clientY);
    };
    window.addEventListener('mousemove', onMove);
    cleanups.push(() => window.removeEventListener('mousemove', onMove));

    // Enter/leave per item within this wrap
    items.forEach((item, index) => {
      item.addEventListener('mouseenter', () => {
        const forward = prevIndex === null || index > prevIndex;
        prevIndex = index;

        // animate out existing visuals
        follower.querySelectorAll('[data-follower-visual]').forEach(el => {
          gsap.killTweensOf(el);
          gsap.to(el, {
            yPercent: forward ? -offset : offset,
            duration,
            ease,
            overwrite: 'auto',
            onComplete: () => el.remove()
          });
        });

        // clone & insert new visual
        const visual = item.querySelector('[data-follower-visual]');
        if (!visual) return;
        const clone = visual.cloneNode(true);
        followerInner.appendChild(clone);

        // animate it in (unless it's the very first entry)
        if (!firstEntry) {
          gsap.fromTo(clone,
            { yPercent: forward ? offset : -offset },
            { yPercent: 0, duration, ease, overwrite: 'auto' }
          );
        } else {
          firstEntry = false;
        }
      });

      item.addEventListener('mouseleave', () => {
        const el = follower.querySelector('[data-follower-visual]');
        if (!el) return;
        gsap.killTweensOf(el);
        gsap.to(el, {
          yPercent: -offset,
          duration,
          ease,
          overwrite: 'auto',
          onComplete: () => el.remove()
        });
      });
    });

    // If pointer leaves the collection, clear any visuals
    collection.addEventListener('mouseleave', () => {
      follower.querySelectorAll('[data-follower-visual]').forEach(el => {
        gsap.killTweensOf(el);
        gsap.delayedCall(duration, () => el.remove());
      });
      firstEntry = true;
      prevIndex = null;
    });
  });

  return () => cleanups.forEach(fn => fn());
}

/* ==========================================================================
   Sticky Features - Osmo Supply
   [data-sticky-feature-wrap] pins and steps through [data-sticky-feature-visual-wrap] / [data-sticky-feature-item]
   ========================================================================== */

function initStickyFeatures(root){
  const wraps = Array.from((root || document).querySelectorAll("[data-sticky-feature-wrap]"));
  if(!wraps.length) return;
  const triggers = [];

  wraps.forEach(w => {
    const visualWraps = Array.from(w.querySelectorAll("[data-sticky-feature-visual-wrap]"));
    const items = Array.from(w.querySelectorAll("[data-sticky-feature-item]"));
    const progressBar = w.querySelector("[data-sticky-feature-progress]");
    
    if (visualWraps.length !== items.length) {
      console.warn("[initStickyFeatures] visualWraps and items count do not match:", {
        visualWraps: visualWraps.length,
        items: items.length,
        wrap: w
      });
    }
    
    const count = Math.min(visualWraps.length, items.length);
    if(count < 1) return;

    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DURATION = rm ? 0.01 : 0.75; // If user prefers reduced motion, reduce duration
    const EASE = "power4.inOut";
    const SCROLL_AMOUNT = 0.9; // % of scroll used for step transitions

    const getTexts = el => Array.from(el.querySelectorAll("[data-sticky-feature-text]"));

    if(visualWraps[0]) gsap.set(visualWraps[0], { clipPath: "inset(0% round 0.75em)" });
    gsap.set(items[0], { autoAlpha: 1 });

    let currentIndex = 0;

    // Transition Function
    function transition(fromIndex, toIndex){
      if(fromIndex === toIndex) return;
      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
      
      if(fromIndex < toIndex){
        tl.to(visualWraps[toIndex], { 
          clipPath: "inset(0% round 0.75em)",
          duration: DURATION,
          ease: EASE
        }, 0);
      } else {
        tl.to(visualWraps[fromIndex], { 
          clipPath: "inset(50% round 0.75em)",
          duration: DURATION,
          ease: EASE
        }, 0);
      }
      animateOut(items[fromIndex]);
      animateIn(items[toIndex]);
    }

    // Fade out text content items
    function animateOut(itemEl){
      const texts = getTexts(itemEl);
      gsap.to(texts, {
        autoAlpha: 0,
        y: -30,
        ease: "power4.out",
        duration: 0.4,
        onComplete: () => gsap.set(itemEl, { autoAlpha: 0 })
      });
    }

    // Reveal incoming text content items
    function animateIn(itemEl){
      const texts = getTexts(itemEl);
      gsap.set(itemEl, { autoAlpha: 1 });
      gsap.fromTo(texts, {
        autoAlpha: 0, 
        y: 30
      }, {
        autoAlpha: 1,
        y: 0,
        ease: "power4.out",
        duration: DURATION,
        stagger: 0.1
      });
    }

    const steps = Math.max(1, count - 1);

    triggers.push(ScrollTrigger.create({
      trigger: w,
      start: "center center",
      end: () => `+=${steps * window.innerHeight}`, // viewport-based: the wrap is no longer 100vh tall
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: self => {
        const p = Math.min(self.progress, SCROLL_AMOUNT) / SCROLL_AMOUNT;
        let idx = Math.floor(p * steps + 1e-6);
        idx = Math.max(0, Math.min(steps, idx));
        
        gsap.to(progressBar,{
          scaleX: p,
          ease: "none"
        })
        
        if (idx !== currentIndex) {
          transition(currentIndex, idx);
          currentIndex = idx;
        }
      }
    }));
  });

  return () => triggers.forEach(t => t.kill());
}

/* ==========================================================================
   Expanding Feature Pills - Osmo Supply
   [data-feature-pills-init]: one pill open at a time, synced with [data-feature-pills-visual]
   ========================================================================== */

function initExpandingFeaturePills(root = document) {
  const wraps = root.querySelectorAll("[data-feature-pills-init]");
  if (!wraps.length) return;
  const cleanups = [];

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  wraps.forEach((wrap, wrapIdx) => {
    const items = Array.from(wrap.querySelectorAll("[data-feature-pills-item]"));
    const visuals = Array.from(wrap.querySelectorAll("[data-feature-pills-visual]"));
    const cover = wrap.querySelector("[data-feature-pills-cover]");
    const closeBtn = wrap.querySelector("[data-feature-pills-close]");
    if (!items.length) return;

    if (visuals.length && visuals.length !== items.length) {
      console.warn(
        `[ExpandingFeaturePills] items (${items.length}) and visuals (${visuals.length}) mismatch in module #${wrapIdx}. Visual syncing uses index order.`
      );
    }

    const uidBase = `feature-pills-${wrapIdx}`;
    const ease = "back.out(2)";
    const animationDuration = 0.5;

    const getExpandedWidth = () =>
      getComputedStyle(wrap).getPropertyValue("--content-item-expanded").trim() || "";

    const getActiveIndex = () => {
      const active = items.find((it) => it.getAttribute("data-active") === "true");
      return active ? Number(active.getAttribute("data-feature-pills-index")) : null;
    };

    const setWrapActive = (isActive) => {
      wrap.setAttribute("data-feature-pills-active", isActive ? "true" : "false");
      if (closeBtn) closeBtn.setAttribute("aria-hidden", isActive ? "false" : "true");
      if (cover) {
        cover.setAttribute("data-active", isActive ? "false" : "true");
        cover.setAttribute("aria-hidden", isActive ? "true" : "false");
      }
    };

    const setVisualActive = (indexOrNull) => {
      if (!visuals.length) return;
      visuals.forEach((v) => {
        const idx = Number(v.getAttribute("data-feature-pills-index"));
        const isActive = indexOrNull !== null && idx === indexOrNull;
        v.setAttribute("data-active", isActive ? "true" : "false");
        v.setAttribute("aria-hidden", isActive ? "false" : "true");
      });
    };

    const setItemA11y = (item, isOpen) => {
      const btn = item.querySelector("[data-feature-pills-button]");
      const content = item.querySelector("[data-feature-pills-content]");
      if (!btn || !content) return;
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      content.setAttribute("aria-hidden", isOpen ? "false" : "true");
    };

    const measureButtonH = (item) => {
      const btn = item.querySelector("[data-feature-pills-button]");
      return btn ? Math.ceil(btn.getBoundingClientRect().height) : 0;
    };

    const measureInnerH = (item, expandedW) => {
      const inner = item.querySelector("[data-feature-pills-inner]");
      if (!inner) return 0;

      const mask = item.querySelector(".feature-pills__item-mask");

      const prevMaskOverflow = mask ? mask.style.overflow : null;
      if (mask) mask.style.overflow = "visible";

      const prevMaxW = inner.style.maxWidth;
      if (expandedW) inner.style.maxWidth = expandedW;

      const h = Math.ceil(inner.getBoundingClientRect().height);

      if (expandedW) inner.style.maxWidth = prevMaxW || "";
      if (mask) mask.style.overflow = prevMaskOverflow || "";

      return h;
    };

    const getHeights = (item, expandedW) => {
      const buttonH = measureButtonH(item);
      const innerH = measureInnerH(item, expandedW);
      const openH = Math.max(buttonH, innerH);
      return { buttonH, openH };
    };

    const collapsedWidthPx = new Map();
        
    const captureCollapsedWidths = () => {
      items.forEach((item) => {
        const prev = item.style.width;
        item.style.width = "";
        collapsedWidthPx.set(item, Math.ceil(item.getBoundingClientRect().width));
        item.style.width = prev;
      });
    };

    const animateBox = (el, vars) => {
      gsap.killTweensOf(el);
      if (prefersReducedMotion) {
        if (vars.height != null) el.style.height = `${vars.height}px`;
        if (vars.width != null) el.style.width = typeof vars.width === "number" ? `${vars.width}px` : vars.width;
        return;
      }
      gsap.to(el, { ...vars, duration: animationDuration, ease, overwrite: true });
    };

    const openItem = (item) => {
      const expandedW = getExpandedWidth();
      const { openH } = getHeights(item, expandedW);

      item.setAttribute("data-active", "true");
      setItemA11y(item, true);
      setWrapActive(true);

      const targetW = expandedW || `${collapsedWidthPx.get(item) || Math.ceil(item.getBoundingClientRect().width)}px`;
      animateBox(item, { height: openH, width: targetW });
    };

    const closeItem = (item) => {
      const expandedW = getExpandedWidth();
      const { buttonH } = getHeights(item, expandedW);

      item.setAttribute("data-active", "false");
      setItemA11y(item, false);

      const targetW = collapsedWidthPx.get(item) || Math.ceil(item.getBoundingClientRect().width);
      animateBox(item, { height: buttonH, width: targetW });
    };

    const switchTo = (nextIndex) => {
      const current = getActiveIndex();
      if (current === nextIndex) return;

      const nextItem = items[nextIndex];
      if (!nextItem) return;

      if (current !== null) closeItem(items[current]);
      openItem(nextItem);

      setVisualActive(nextIndex);
    };

    const closeAll = () => {
      const current = getActiveIndex();
      if (current === null) return;
      closeItem(items[current]);
      setVisualActive(null);
      setWrapActive(false);
    };

    items.forEach((item, i) => {
      item.setAttribute("data-feature-pills-index", String(i));
      if (!item.hasAttribute("data-active")) item.setAttribute("data-active", "false");

      const btn = item.querySelector("[data-feature-pills-button]");
      const content = item.querySelector("[data-feature-pills-content]");
      if (btn) {
        btn.setAttribute("data-feature-pills-index", String(i));
        btn.type = "button";
        const triggerId = `${uidBase}-trigger-${i}`;
        if (!btn.id) btn.id = triggerId;
      }
      if (content && btn) {
        content.setAttribute("data-feature-pills-index", String(i));
        const panelId = `${uidBase}-panel-${i}`;
        if (!content.id) content.id = panelId;
        btn.setAttribute("aria-controls", content.id);
        content.setAttribute("role", "region");
        content.setAttribute("aria-labelledby", btn.id);
        if (!content.hasAttribute("aria-hidden")) content.setAttribute("aria-hidden", "true");
        if (!btn.hasAttribute("aria-expanded")) btn.setAttribute("aria-expanded", "false");
      }
    });

    visuals.forEach((v, i) => v.setAttribute("data-feature-pills-index", String(i)));

    if (closeBtn) {
      closeBtn.type = "button";
      if (!closeBtn.hasAttribute("aria-hidden")) closeBtn.setAttribute("aria-hidden", "true");
      closeBtn.addEventListener("click", closeAll);
    }

    items.forEach((item) => {
      const h = measureButtonH(item);
      item.style.height = `${h}px`;
    });

    setWrapActive(false);
    setVisualActive(null);

    items.forEach((item, i) => {
      const btn = item.querySelector("[data-feature-pills-button]");
      if (!btn) return;
      btn.addEventListener("click", () => switchTo(i));
    });

    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAll();
    });
    
    const debounce = (fn, wait = 150) => {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
      };
    };
    
    const handleResize = () => {
      const current = getActiveIndex();
    
      items.forEach((item) => {
        if (item.getAttribute("data-active") !== "true") item.style.width = "";
      });
    
      captureCollapsedWidths();
    
      if (current !== null) {
        const item = items[current];
        const expandedW = getExpandedWidth();
        const { openH } = getHeights(item, expandedW);
        const targetW = expandedW || "";
    
        if (prefersReducedMotion) {
          item.style.height = `${openH}px`;
          if (targetW) item.style.width = targetW;
        } else {
          const fallbackW = `${Math.ceil(item.getBoundingClientRect().width)}px`;
          const widthForActive = targetW || fallbackW;
          
          gsap.set(item, { height: openH, width: widthForActive });
          if (targetW) item.style.width = targetW;
        }
      } else {
        items.forEach((item) => {
          const h = measureButtonH(item);
          item.style.height = `${h}px`;
        });
      }
    };
        
    const debouncedResize = debounce(handleResize, 200);
    
    captureCollapsedWidths();
    window.addEventListener("resize", debouncedResize, { passive: true });
    cleanups.push(() => window.removeEventListener("resize", debouncedResize));
  });

  return () => cleanups.forEach(fn => fn());
}

/* ==========================================================================
   Stacking Cards Parallax - Osmo Supply
   Each [data-stacking-cards-item] pushes the previous card down as it scrolls in;
   the previous card's [data-stacking-cards-img] tilts and rises.
   ========================================================================== */

function initStackingCardsParallax(root = document) {
  const cards = root.querySelectorAll("[data-stacking-cards-item]");
  if (cards.length < 2) return;

  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    cards.forEach((card, i) => {
      // Skip over the first section
      if (i === 0) return;

      // When current section is in view, target the PREVIOUS one
      const previousCard = cards[i - 1];
      if (!previousCard) return;

      // Find any element inside the previous card
      const previousCardImage = previousCard.querySelector("[data-stacking-cards-img]");

      let tl = gsap.timeline({
        defaults: {
          ease: "none",
          duration: 1
        },
        scrollTrigger: {
          trigger: card,
          start: "top bottom",
          end: "top top",
          scrub: true,
          invalidateOnRefresh: true
        }
      });

      tl.fromTo(previousCard, { yPercent: 0 }, { yPercent: 50 })
        .fromTo(previousCardImage, { rotate: 0, yPercent: 0 }, { rotate: -5, yPercent: -25 }, "<");
    });
  });

  return () => mm.revert();
}

/* ==========================================================================
   Cursor with Marquee Effect - Osmo Supply
   [data-cursor-marquee-status] follows the pointer; any [data-cursor-marquee-text="..."]
   under it fills the cursor with that text as a scrolling marquee.
   ========================================================================== */

function initCursorMarqueeEffect(root = document) {
  const hoverOutDelay = 0.4;
  const followDuration = 0.4;
  const speedMultiplier = 5;

  const cursor = root.querySelector('[data-cursor-marquee-status]');
  if (!cursor) return;
  const targets = cursor.querySelectorAll('[data-cursor-marquee-text-target]');

  const xTo = gsap.quickTo(cursor, 'x', { duration: followDuration, ease: 'power3' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: followDuration, ease: 'power3' });

  let pauseTimeout = null;
  let activeEl = null;
  let lastX = 0;
  let lastY = 0;

  function playFor(el) {
    if (!el) return;
    if (pauseTimeout) clearTimeout(pauseTimeout);
    const text = el.getAttribute('data-cursor-marquee-text') || '';
    const sec = (text.length || 1) / speedMultiplier;
    targets.forEach(t => {
      t.textContent = text;
      t.style.animationPlayState = 'running';
      t.style.animationDuration = sec + 's';
    });
    cursor.setAttribute('data-cursor-marquee-status', 'active');
    activeEl = el;
  }

  function pauseLater() {
    cursor.setAttribute('data-cursor-marquee-status', 'not-active');
    if (pauseTimeout) clearTimeout(pauseTimeout);
    pauseTimeout = setTimeout(() => {
      targets.forEach(t => {
        t.style.animationPlayState = 'paused';
      });
    }, hoverOutDelay * 1000);
    activeEl = null;
  }

  function checkTarget() {
    const el = document.elementFromPoint(lastX, lastY);
    const hit = el && el.closest('[data-cursor-marquee-text]');
    if (hit !== activeEl) {
      if (activeEl) pauseLater();
      if (hit) playFor(hit);
    }
  }

  const onPointerMove = e => {
    lastX = e.clientX;
    lastY = e.clientY;
    xTo(lastX);
    yTo(lastY);
    checkTarget();
  };

  const onScroll = () => {
    xTo(lastX);
    yTo(lastY);
    checkTarget();
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  const readyTimeout = setTimeout(() => {
    cursor.setAttribute('data-cursor-marquee-status', 'not-active');
  }, 500);

  return () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('scroll', onScroll);
    clearTimeout(readyTimeout);
    if (pauseTimeout) clearTimeout(pauseTimeout);
  };
}

/* ==========================================================================
   Fixed Underlay Navigation - Osmo Supply
   Persistent UI: initialized once from initSite(), not per page.
   [data-main] wraps everything but the navigation and slides left to reveal the menu.
   ========================================================================== */

function initFixedUnderlayNavigation() {
  const toggleBtn = document.querySelector("[data-underlay-nav-toggle]");
  const toggleLabels = document.querySelectorAll(".underlay-nav__toggle-label");
  const toggleBars = document.querySelectorAll(".underlay-nav__toggle-bar");
  const menuEl = document.querySelector("[data-underlay-nav-menu]");
  const largeItems = document.querySelectorAll("[data-reveal-l]");
  const smallItems = document.querySelectorAll("[data-reveal-s]");
  const menuBorder = document.querySelector(".underlay-nav__bottom-border")
  const mainEl = document.querySelector("[data-main]");
  const overlayEl = document.querySelector("[data-underlay-nav-overlay]");
  const logoEl = document.querySelector(".underlay-nav__logo");
  const darkEl = document.querySelector(".underlay-nav__dark");
  const corners = document.querySelectorAll(".underlay-nav__corner")
  const overlayBorders = document.querySelectorAll(".underlay-nav__border-row")

  if (!toggleBtn || !menuEl || !mainEl || !overlayEl) return;

  // The logo is fixed on its own (so its blend mode works); give it the buttons' height to line up with them
  const actionsEl = document.querySelector(".underlay-nav__toggle");
  if (actionsEl) {
    const syncActionsHeight = () => {
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty("--nav-actions-h", actionsEl.offsetHeight + "px");
      rootStyle.setProperty("--nav-menu-w", actionsEl.offsetWidth + "px");
    };
    syncActionsHeight();
    window.addEventListener("resize", syncActionsHeight);
    document.fonts?.ready.then(syncActionsHeight);
  }

  let isOpen = false;
  let tl;
  let enterEndTime = 0;

  const getMenuOffset = () => -menuEl.offsetWidth;

  // On mobile the fixed logo travels left with the page; on larger screens it stays put
  const mobileQuery = window.matchMedia("(max-width: 767px)");
  const getSlideOffset = (i, target) => (target === logoEl && !mobileQuery.matches ? 0 : getMenuOffset());
  const slideTargets = [mainEl, overlayEl, logoEl].filter(Boolean);

  gsap.set(overlayEl, { visibility: "hidden", pointerEvents: "none" });
  gsap.set(darkEl, { autoAlpha: 0 });
  gsap.set(toggleLabels, { yPercent: 0 });
  gsap.set(toggleBars, { y: 0, rotation: 0 });
  gsap.set(menuBorder, { scaleX: 0 });
  gsap.set(overlayBorders[0], { yPercent: -100 })
  gsap.set(overlayBorders[1], { yPercent: 100 })
  gsap.set(corners, { scale: 0 })

  function buildTimeline() {
    tl = gsap.timeline({
      paused: true,
      defaults: {
        ease: "energy",
        easeReverse: "power2.inOut"
      }
    });

    tl.set(overlayEl, { visibility: "visible", pointerEvents: "auto" }, 0);

    tl.to(slideTargets, {
      x: getSlideOffset,
      duration: 0.7,
    }, 0)

    .to(darkEl, {
      autoAlpha: 1,
      duration: 0.5,
    }, 0)

    .to(corners, {
      scale: 1,
      duration: 0.5,
    }, 0)

    .to(overlayBorders, {
      yPercent: 0,
      duration: 0.5,
    }, 0)

    .to(toggleLabels, {
      yPercent: -100,
      duration: 0.4,
    }, 0)

    .to(toggleBars[0], {
      y: "0.25em",
      rotation: 45,
      duration: 0.35,
      ease: "back.out(1.4)",
      easeReverse: "power3.out",
    }, 0.05)

    .to(toggleBars[1], {
      y: "-0.25em",
      rotation: -45,
      duration: 0.35,
      ease: "back.out(1.4)",
      easeReverse: "power3.out",
    }, 0.05)

    .fromTo(largeItems,
      { autoAlpha: 0, xPercent: 25 },
      {
        autoAlpha: 1,
        xPercent: 0,
        duration: 0.7,
        stagger: 0.05,
      },
      0
    )

    .fromTo(smallItems,
      { autoAlpha: 0, yPercent: 100 },
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.5,
        stagger: 0.03,
        ease: "power3.out"
      },
      0.3
    )

    .to(menuBorder, {
      scaleX: 1,
      duration: 0.5,
    }, "<")

    enterEndTime = tl.duration();

    tl.addPause();

    tl.to([largeItems, smallItems], {
      autoAlpha: 0,
      duration: 0.3,
    }, "<")

    .to(slideTargets, {
      x: 0,
      duration: 0.6,
    }, "<")

    .to(darkEl, {
      autoAlpha: 0,
      duration: 0.35,
      ease: "power2.inOut",
    }, "<")

    .to(corners, {
      scale: 0,
      duration: 0.5,
    }, "<")

    .to(overlayBorders[0], {
      yPercent: -100,
      duration: 0.5,
    }, "<")

    .to(overlayBorders[1], {
      yPercent: 100,
      duration: 0.5,
    }, "<")

    .to(toggleLabels, {
      yPercent: 0,
      duration: 0.25,
      ease: "power3.in",
    },"<+=0.1")

    .to(toggleBars, {
      y: 0,
      rotation: 0,
      duration: 0.25,
      ease: "power3.in",
    }, "<")

    .set(overlayEl, {
      visibility: "hidden",
      pointerEvents: "none"
    })

    // A transform on [data-main] would re-anchor every fixed element inside it, so drop it once closed
    .set([mainEl, logoEl].filter(Boolean), { clearProps: "transform" });
  }

  function toggle() {
    isOpen = !isOpen;
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
    toggleBtn.setAttribute("aria-label", isOpen ? "close menu" : "open menu");
    document.body.setAttribute("data-menu-status", isOpen ? "open" : "");
    if (isOpen) window.lenis?.stop();
    else window.lenis?.start();

    if (isOpen) {
      tl.invalidate();
      if (tl.time() >= enterEndTime) tl.timeScale(1).restart();
      else tl.timeScale(1).play();
    } else {
      if (tl.time() < enterEndTime) tl.timeScale(1).reverse();
      else tl.timeScale(1).play();
    }
  }

  buildTimeline();
  tl.eventCallback("onReverseComplete", () => gsap.set([mainEl, logoEl].filter(Boolean), { clearProps: "transform" }));

  toggleBtn.addEventListener("click", toggle);

  overlayEl.addEventListener("click", () => {
    if (isOpen) toggle();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      toggle();
      toggleBtn.focus();
    }
  });

  // Close without animation: used after a page change, so the menu can never stay open on the new page
  function closeImmediately() {
    if (!isOpen) return;
    isOpen = false;
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.setAttribute("aria-label", "open menu");
    document.body.setAttribute("data-menu-status", "");
    tl.pause(0);   // rewinds every menu tween to its closed state
    gsap.set(overlayEl, { visibility: "hidden", pointerEvents: "none" });
    gsap.set([mainEl, logoEl].filter(Boolean), { clearProps: "transform" });
    window.lenis?.start();
  }
  window.closeUnderlayNav = closeImmediately;

  const normalizePath = (path) => path.replace(/index\.html$/, "").replace(/\/+$/, "") || "/";

  // Menu links: close the menu first, then scroll (same page) or change page (other page)
  menuEl.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (link.target && link.target !== "_self") return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return; // mailto:, external sites: leave alone

      const samePage = normalizePath(url.pathname) === normalizePath(window.location.pathname);
      const target = samePage && url.hash ? document.querySelector(url.hash) : null;

      e.preventDefault();
      if (isOpen) toggle();

      if (samePage) {
        gsap.delayedCall(0.6, () => scrollToAnchor(target || 0));
      } else {
        // Wait for the menu to slide shut, then let Barba run the page transition
        gsap.delayedCall(0.6, () => {
          if (window.barba) window.barba.go(url.href);
          else window.location.href = url.href;
        });
      }
    });
  });

  // Logo: always points to the homepage. On the homepage it scrolls back to the top; elsewhere the plain link lets Barba change page
  if (logoEl) {
    logoEl.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const url = new URL(logoEl.href, window.location.href);
      if (normalizePath(url.pathname) !== normalizePath(window.location.pathname)) return;
      e.preventDefault();
      if (isOpen) toggle();
      scrollToAnchor(0);
    });
  }

  let resizeTimer;

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      if (isOpen) {
        gsap.set(slideTargets, {
          x: getSlideOffset
        });
      } else {
        tl.invalidate();
      }
    }, 150);
  });
}

/* ==========================================================================
   Directional List Hover - Osmo Supply
   [data-directional-hover] > [data-directional-hover-item] with a [data-directional-hover-tile]
   that wipes in from the side the pointer entered. data-type: "y", "x" or "all".
   ========================================================================== */

function initDirectionalListHover(root = document) {

  const directionMap = {
    top: 'translateY(-100%)',
    bottom: 'translateY(100%)',
    left: 'translateX(-100%)',
    right: 'translateX(100%)'
  };

  root.querySelectorAll('[data-directional-hover]').forEach(container => {
    const type = container.getAttribute('data-type') || 'all';

    container.querySelectorAll('[data-directional-hover-item]').forEach(item => {
      const tile = item.querySelector('[data-directional-hover-tile]');
      if (!tile) return;

      item.addEventListener('mouseenter', e => {
        const dir = getDirection(e, item, type);
        tile.style.transition = 'none';
        tile.style.transform = directionMap[dir] || 'translate(0, 0)';
        void tile.offsetHeight;
        tile.style.transition = '';
        tile.style.transform = 'translate(0%, 0%)';
        item.setAttribute('data-status', `enter-${dir}`);
      });

      item.addEventListener('mouseleave', e => {
        const dir = getDirection(e, item, type);
        item.setAttribute('data-status', `leave-${dir}`);
        tile.style.transform = directionMap[dir] || 'translate(0, 0)';
      });
    });

    function getDirection(event, el, type) {
      const { left, top, width: w, height: h } = el.getBoundingClientRect();
      const x = event.clientX - left;
      const y = event.clientY - top;

      if (type === 'y') return y < h / 2 ? 'top' : 'bottom';
      if (type === 'x') return x < w / 2 ? 'left' : 'right';

      const distances = {
        top: y,
        right: w - x,
        bottom: h - y,
        left: x
      };

      return Object.entries(distances).reduce((a, b) => (a[1] < b[1] ? a : b))[0];
    }
  });
}

/* ==========================================================================
   Number Odometer - Osmo Supply
   [data-odometer-group] triggers on scroll; each [data-odometer-element] rolls to its text.
   ========================================================================== */

function initNumberOdometer(root = document) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const initFlag = 'data-odometer-initialized'
  const activeTweens = new WeakMap()

  // Configuration
  const defaults = {
    duration: 1,
    ease: 'power3.out',
    elementStagger: 0.1,
    digitStagger: 0.04,
    revealDuration: 0.5,
    revealEase: 'power2.out',
    triggerStart: 'top 80%',
    staggerOrder: 'left',
    digitCycles: 2
  }

  const timelines = []

  // Scroll-triggered groups
  root.querySelectorAll('[data-odometer-group]').forEach(group => {
    if (group.hasAttribute(initFlag)) return
    group.setAttribute(initFlag, '')

    const elements = Array.from(group.querySelectorAll('[data-odometer-element]'))
    if (!elements.length || prefersReducedMotion) return

    const staggerOrder = group.getAttribute('data-odometer-stagger-order') || defaults.staggerOrder
    const triggerStart = group.getAttribute('data-odometer-trigger-start') || defaults.triggerStart
    const elementStagger = parseFloat(group.getAttribute('data-odometer-stagger')) || defaults.elementStagger

    const elementData = elements.map(el => {
      const originalText = el.textContent.trim()
      const hasExplicitStart = el.hasAttribute('data-odometer-start')
      const startValue = parseFloat(el.getAttribute('data-odometer-start')) || 0
      const duration = parseFloat(el.getAttribute('data-odometer-duration')) || defaults.duration
      const step = getLineHeightRatio(el)

      let segments = parseSegments(originalText)
      segments = mapStartDigits(segments, startValue)
      segments = markHiddenSegments(segments, startValue)

      const grow = shouldGrow(el, hasExplicitStart, startValue, segments)
      const { rollers, revealEls } = buildRollerDOM(el, segments, step, grow)

      const fontSize = parseFloat(getComputedStyle(el).fontSize)
      const revealData = revealEls.map(revealEl => {
        const widthEm = revealEl.offsetWidth / fontSize
        gsap.set(revealEl, { width: 0, overflow: 'hidden' })
        return { el: revealEl, widthEm }
      })

      return { el, rollers, duration, step, revealData, originalText }
    })

    const ordered = applyStaggerOrder(elementData, staggerOrder)

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: group,
        start: triggerStart,
        once: true
      },
      onComplete() {
        elementData.forEach(({ el, originalText, step }) => {
          cleanupElement(el, originalText)
        })
      }
    })

    timelines.push(tl)

    ordered.forEach((data, orderIdx) => {
      const { rollers, duration, step, revealData } = data
      const offset = orderIdx * elementStagger

      revealData.forEach(({ el, widthEm }) => {
        tl.to(el, {
          width: widthEm + 'em',
          opacity: 1,
          duration: defaults.revealDuration,
          ease: defaults.revealEase
        }, offset)
      })

      rollers.forEach(({ roller, targetPos }, digitIdx) => {
        const reversedIdx = rollers.length - 1 - digitIdx
        tl.to(roller, {
          y: -targetPos * step + 'em',
          duration,
          ease: defaults.ease,
          force3D: true
        }, offset + reversedIdx * defaults.digitStagger)
      })
    })
  })

  // Programmatic update (optional add-on, unused here)
  function updateOdometer(el, newText, options = {}) {
    const currentText = el.textContent.trim()
    if (currentText === newText) return

    const duration = options.duration || defaults.duration
    const ease = options.ease || defaults.ease
    const step = getLineHeightRatio(el)

    // Kill any running animation and clear its inline style locks
    const existing = activeTweens.get(el)
    if (existing) {
      existing.kill()
      gsap.set(el, { clearProps: 'width,overflow' })
    }

    // Measure current width before rebuilding (in em for responsive scaling)
    const fontSize = parseFloat(getComputedStyle(el).fontSize)
    const oldWidthEm = el.getBoundingClientRect().width / fontSize

    // Parse current text as start, new text as end
    const startSegments = parseSegments(currentText)
    const startDigitsStr = startSegments
      .filter(s => s.type === 'digit')
      .map(s => s.char)
      .join('')
    const startValue = parseInt(startDigitsStr, 10) || 0

    let segments = parseSegments(newText)
    segments = mapStartDigits(segments, startValue)
    segments = markHiddenSegments(segments, startValue)
    const { rollers, revealEls } = buildRollerDOM(el, segments, step, true)

    // Measure new natural width (in em)
    const newWidthEm = el.getBoundingClientRect().width / fontSize
    const widthChanged = Math.abs(oldWidthEm - newWidthEm) > 0.01

    // Lock to old width for smooth transition
    if (widthChanged) {
      gsap.set(el, { width: oldWidthEm + 'em', overflow: 'hidden' })
    }

    const tl = gsap.timeline({
      onComplete() {
        cleanupElement(el, newText)
        activeTweens.delete(el)
      }
    })
    activeTweens.set(el, tl)

    // Animate element width
    if (widthChanged) {
      tl.to(el, {
        width: newWidthEm + 'em',
        duration: defaults.revealDuration,
        ease: defaults.revealEase
      }, 0)
    }

    // Fade in hidden statics
    revealEls.forEach(revealEl => {
      if (revealEl.getAttribute('data-odometer-part') === 'static') {
        tl.to(revealEl, { opacity: 1, duration: 0.2 }, 0)
      }
    })

    // Roll digits
    rollers.forEach(({ roller, targetPos }, digitIdx) => {
      const reversedIdx = rollers.length - 1 - digitIdx
      tl.to(roller, {
        y: -targetPos * step + 'em',
        duration,
        ease,
        force3D: true
      }, reversedIdx * defaults.digitStagger)
    })
  }

  // Helpers
  function getLineHeightRatio(el) {
    const cs = getComputedStyle(el)
    const lh = cs.lineHeight
    if (lh === 'normal') return 1.2
    return parseFloat(lh) / parseFloat(cs.fontSize)
  }

  function parseSegments(text) {
    return [...text].map(char => ({
      type: /\d/.test(char) ? 'digit' : 'static',
      char
    }))
  }

  function mapStartDigits(segments, startValue) {
    const digitSlots = segments.filter(s => s.type === 'digit')
    const padded = String(Math.floor(Math.abs(startValue)))
      .padStart(digitSlots.length, '0')
      .slice(-digitSlots.length)
    let di = 0
    return segments.map(s =>
      s.type === 'digit'
        ? { ...s, startDigit: parseInt(padded[di++], 10) }
        : s
    )
  }

  function markHiddenSegments(segments, startValue) {
    const totalDigits = segments.filter(s => s.type === 'digit').length
    const absStart = Math.floor(Math.abs(startValue))
    const startDigitCount = absStart === 0 ? 1 : String(absStart).length
    const leadingZeros = Math.max(0, totalDigits - startDigitCount)
    if (leadingZeros === 0) return segments
    let digitsSeen = 0
    let firstDigitSeen = false
    let prevDigitHidden = false
    return segments.map(seg => {
      if (seg.type === 'digit') {
        firstDigitSeen = true
        const hidden = digitsSeen < leadingZeros
        prevDigitHidden = hidden
        digitsSeen++
        return { ...seg, hidden }
      }
      const hidden = firstDigitSeen && prevDigitHidden
      return { ...seg, hidden }
    })
  }

  function shouldGrow(el, hasExplicitStart, startValue, segments) {
    if (el.hasAttribute('data-odometer-grow')) {
      return el.getAttribute('data-odometer-grow') !== 'false'
    }
    if (!hasExplicitStart) return false
    const absStart = Math.floor(Math.abs(startValue))
    const startDigitCount = absStart === 0 ? 1 : String(absStart).length
    const endDigitCount = segments.filter(s => s.type === 'digit').length
    return startDigitCount < endDigitCount
  }

  function buildRollerDOM(el, segments, step, grow) {
    el.innerHTML = ''
    el.style.height = ''
    const rollers = []
    const revealEls = []
    const totalCells = 10 * defaults.digitCycles
    segments.forEach(seg => {
      if (seg.type === 'static') {
        const span = document.createElement('span')
        span.setAttribute('data-odometer-part', 'static')
        span.style.height = step + 'em'
        span.style.lineHeight = step
        span.textContent = seg.char
        el.appendChild(span)
        if (grow && seg.hidden) {
          gsap.set(span, { opacity: 0 })
          revealEls.push(span)
        }
        return
      }
      const mask = document.createElement('span')
      mask.setAttribute('data-odometer-part', 'mask')
      mask.style.height = step + 'em'
      mask.style.lineHeight = step
      const roller = document.createElement('span')
      roller.setAttribute('data-odometer-part', 'roller')
      roller.style.lineHeight = step

      const digits = []
      for (let d = 0; d < totalCells; d++) {
        digits.push(d % 10)
      }
      roller.textContent = digits.join('\n')
      mask.appendChild(roller)
      el.appendChild(mask)
      const startDigit = seg.startDigit || 0
      const isReveal = grow && seg.hidden
      gsap.set(roller, { y: isReveal ? step + 'em' : -startDigit * step + 'em' })
      const endDigit = parseInt(seg.char, 10)
      const targetPos = endDigit > startDigit ? endDigit : 10 + endDigit
      rollers.push({ roller, targetPos })
      if (isReveal) revealEls.push(mask)
    })
    return { rollers, revealEls }
  }

  function cleanupElement(el, originalText) {
    el.style.overflow = ''
    el.style.height = ''

    // Remove rollers, set final digit, clear inline bloat (but preserve width)
    const digits = [...originalText].filter(c => /\d/.test(c))
    let di = 0

    el.querySelectorAll('[data-odometer-part="mask"]').forEach(mask => {
      const roller = mask.querySelector('[data-odometer-part="roller"]')
      if (roller) roller.remove()
      mask.textContent = digits[di++] || ''
      mask.style.opacity = ''
      mask.style.overflow = ''
    })

    el.querySelectorAll('[data-odometer-part="static"]').forEach(stat => {
      stat.style.opacity = ''
    })
  }

  function recalcOnResize() {
    document.querySelectorAll('[data-odometer-element]').forEach(el => {
      // Force-complete any running programmatic animation
      const running = activeTweens.get(el)
      if (running) {
        running.progress(1)
        activeTweens.delete(el)
      }

      const hasRollers = el.querySelector('[data-odometer-part="roller"]')

      if (hasRollers) {
        // Pre-triggered: recalculate step-based inline styles
        const step = getLineHeightRatio(el)
        el.querySelectorAll('[data-odometer-part="mask"]').forEach(mask => {
          mask.style.height = step + 'em'
          mask.style.lineHeight = step
        })
        el.querySelectorAll('[data-odometer-part="roller"]').forEach(roller => {
          roller.style.lineHeight = step
        })
        el.querySelectorAll('[data-odometer-part="static"]').forEach(stat => {
          stat.style.lineHeight = step
        })
      }
      // Completed elements: width is em-based, scales automatically, don't touch
    })
    ScrollTrigger.refresh()
  }

  let resizeTimer
  let lastWidth = window.innerWidth
  const onResize = () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (window.innerWidth === lastWidth) return
      lastWidth = window.innerWidth
      recalcOnResize()
    }, 250)
  }
  window.addEventListener('resize', onResize)

  function applyStaggerOrder(items, order) {
    const arr = [...items]
    if (order === 'right') return arr.reverse()
    if (order === 'random') return shuffleArray(arr)
    return arr
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  return () => {
    window.removeEventListener('resize', onResize)
    clearTimeout(resizeTimer)
    timelines.forEach(tl => { tl.scrollTrigger?.kill(); tl.kill() })
  }
}

/* ==========================================================================
   Tab System with Autoplay Option - Osmo Supply
   [data-tabs="wrapper"]: content-item tabs with a progress bar, synced with visual-item panels.
   data-tabs-autoplay="true" and data-tabs-autoplay-duration (ms) on the wrapper.
   ========================================================================== */

function initTabSystem(root = document) {
  const wrappers = root.querySelectorAll('[data-tabs="wrapper"]');
  if (!wrappers.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [];

  wrappers.forEach((wrapper) => {
    const contentItems = wrapper.querySelectorAll('[data-tabs="content-item"]');
    const visualItems = wrapper.querySelectorAll('[data-tabs="visual-item"]');
    
    const autoplay = wrapper.dataset.tabsAutoplay === "true" && !reduceMotion;   // no auto-moving content for reduced motion
    const autoplayDuration = parseInt(wrapper.dataset.tabsAutoplayDuration) || 5000;
    
    let activeContent = null; // keep track of active item/link
    let activeVisual = null;
    let isAnimating = false;
    let progressBarTween = null; // to stop/start the progress bar

    function startProgressBar(index) {
      if (progressBarTween) progressBarTween.kill();
      const bar = contentItems[index].querySelector('[data-tabs="item-progress"]');
      if (!bar) return;
      
      // In this function, you can basically do anything you want, that should happen as a tab is active
      // Maybe you have a circle filling, some other element growing, you name it.
      gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });
      progressBarTween = gsap.to(bar, {
        scaleX: 1,
        duration: autoplayDuration / 1000,
        ease: "power1.inOut",
        onComplete: () => {
          if (!isAnimating) {
            const nextIndex = (index + 1) % contentItems.length;
            switchTab(nextIndex); // once bar is full, set next to active – this is important
          }
        },
      });
    }

    function switchTab(index) {
      if (isAnimating || contentItems[index] === activeContent) return;
      
      isAnimating = true;
      if (progressBarTween) progressBarTween.kill(); // Stop any running progress bar here
      contentItems.forEach((item, i) => item.setAttribute('aria-selected', String(i === index)));
      
      const outgoingContent = activeContent;
      const outgoingVisual = activeVisual;
      const outgoingBar = outgoingContent?.querySelector('[data-tabs="item-progress"]');
      
      const incomingContent = contentItems[index];
      const incomingVisual = visualItems[index];
      const incomingBar = incomingContent.querySelector('[data-tabs="item-progress"]');
      
      outgoingContent?.classList.remove("active");
      outgoingVisual?.classList.remove("active");
      incomingContent.classList.add("active");
      incomingVisual.classList.add("active");
      
      const tl = gsap.timeline({
        defaults: { duration: 0.65, ease: "power3" },
        onComplete: () => {
          activeContent = incomingContent;
          activeVisual = incomingVisual;
          isAnimating = false;
          if (autoplay) startProgressBar(index); // Start autoplay bar here
        },
      });
      
      // Wrap 'outgoing' in a check to prevent warnings on first run of the function
      // Of course, during first run (on page load), there's no 'outgoing' tab yet!
      if (outgoingContent) {
        outgoingContent.classList.remove("active");
        outgoingVisual?.classList.remove("active");
        tl.set(outgoingBar, { transformOrigin: "right center" })
          .to(outgoingBar, { scaleX: 0, duration: 0.3 }, 0)
          .to(outgoingVisual, { autoAlpha: 0, xPercent: 3 }, 0)
          .to(outgoingContent.querySelector('[data-tabs="item-details"]'), { height: 0 }, 0);
      }

      incomingContent.classList.add("active");
      incomingVisual.classList.add("active");
      tl.fromTo(incomingVisual, { autoAlpha: 0, xPercent: 3 }, { autoAlpha: 1, xPercent: 0 }, 0.3)
        .fromTo( incomingContent.querySelector('[data-tabs="item-details"]'),{ height: 0 },{ height: "auto" },0)
        .set(incomingBar, { scaleX: 0, transformOrigin: "left center" }, 0);
    }

    // The first tab is already marked active in the HTML: adopt it, and start autoplay
    // once the section is on screen (it pauses again while it is off screen)
    activeContent = contentItems[0];
    activeVisual = visualItems[0];
    if (autoplay) {
      const trigger = ScrollTrigger.create({
        trigger: wrapper,
        start: 'top 75%',
        end: 'bottom top',
        onToggle: (self) => {
          if (self.isActive) {
            if (progressBarTween && progressBarTween.progress() < 1 && !isAnimating) progressBarTween.resume();
            else if (!progressBarTween && !isAnimating) startProgressBar(0);
          } else if (progressBarTween) {
            progressBarTween.pause();
          }
        },
      });
      cleanups.push(() => trigger.kill());
    }
    cleanups.push(() => progressBarTween?.kill());

    // switch tabs on click
    contentItems.forEach((item, i) =>
      item.addEventListener("click", () => {
        if (item === activeContent) return; // ignore click if current one is already active
        switchTab(i);
      })
    );
    
  });

  return () => cleanups.forEach(fn => fn());
}

/* ==========================================================================
   Line Reveal Testimonials - Osmo Supply
   [data-testimonial-wrap]: one testimonial at a time, text lines slide through a mask.
   ========================================================================== */

function initLineRevealTestimonials(root = document) {
  const wraps = root.querySelectorAll("[data-testimonial-wrap]");
  if (!wraps.length) return;
  const cleanups = [];

  const imageClipHidden = "circle(0% at 50% 50%)";
  const imageClipVisible = "circle(50% at 50% 50%)";
  
  wraps.forEach((wrap) => {
    const list = wrap.querySelector("[data-testimonial-list]");
    if (!list) return;

    const items = Array.from(list.querySelectorAll("[data-testimonial-item]"));
    if (!items.length) return;

    const btnPrev = wrap.querySelector("[data-prev]");
    const btnNext = wrap.querySelector("[data-next]");
    const elCurrent = wrap.querySelector("[data-current]");
    const elTotal = wrap.querySelector("[data-total]");

    if (elTotal) elTotal.textContent = String(items.length);

    let activeIndex = items.findIndex((el) => el.classList.contains("is--active"));
    if (activeIndex < 0) activeIndex = 0;

    let isAnimating = false;
    let reduceMotion = false;
    
    const autoplayEnabled = wrap.getAttribute("data-autoplay") === "true";
    const autoplayDuration = parseInt(wrap.getAttribute("data-autoplay-duration"), 10) || 4000;
    
    let autoplayCall = null;
    let isInView = true;

    const slides = items.map((item) => ({
      item,
      image: item.querySelector("[data-testimonial-img]"),
      
      splitTargets: [
        item.querySelector("[data-testimonial-text]"),
        ...item.querySelectorAll("[data-testimonial-split]"),
      ].filter(Boolean),
      
      splitInstances: [],
      
      getLines() {
        return this.splitInstances.flatMap((instance) => instance.lines);
      },
      
    }));

    function setSlideState(slideIndex, isActive) {
      const { item } = slides[slideIndex];
      item.classList.toggle("is--active", isActive);
      item.setAttribute("aria-hidden", String(!isActive));
      gsap.set(item, {
        autoAlpha: isActive ? 1 : 0,
        pointerEvents: isActive ? "auto" : "none",
      });
    }

    function updateCounter() {
      if (elCurrent) elCurrent.textContent = String(activeIndex + 1);
    }
    
    function startAutoplay() {
      if (!autoplayEnabled) return;
      if (autoplayCall) autoplayCall.kill();
    
      autoplayCall = gsap.delayedCall(autoplayDuration / 1000, () => {
        if (!isInView || isAnimating) {
          startAutoplay();
          return;
        }
        goTo((activeIndex + 1) % slides.length);
        startAutoplay();
      });
    }
    
    function pauseAutoplay() {
      if (autoplayCall) autoplayCall.pause();
    }
    
    function resumeAutoplay() {
      if (!autoplayEnabled) return;
      if (!autoplayCall) startAutoplay();
      else autoplayCall.resume();
    }
    
    function resetAutoplay() {
      if (!autoplayEnabled) return;
      startAutoplay();
    }

    // Set initial state
    slides.forEach((_, i) => setSlideState(i, i === activeIndex));
    updateCounter();

    // Handle reduced motion preference
    gsap.matchMedia().add(
      { reduce: "(prefers-reduced-motion: reduce)" },
      (context) => {
        reduceMotion = context.conditions.reduce;
      }
    );

    // Create SplitText instances
    slides.forEach((slide, slideIndex) => {
      slide.splitInstances = slide.splitTargets.map((el) =>
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "text-line",
          autoSplit: true,
          onSplit(self) {
            if (reduceMotion) return;

            const isActive = slideIndex === activeIndex;
            gsap.set(self.lines, { yPercent: isActive ? 0 : 110 });

            if (slide.image) {
              gsap.set(slide.image, {
                clipPath: isActive ? imageClipVisible : imageClipHidden,
              });
            }
          },
        })
      );
    });

    function goTo(nextIndex) {
      if (isAnimating || nextIndex === activeIndex) return;
      isAnimating = true;

      const outgoingSlide = slides[activeIndex];
      const incomingSlide = slides[nextIndex];

      const tl = gsap.timeline({
        onComplete: () => {
          setSlideState(activeIndex, false);
          setSlideState(nextIndex, true);
          activeIndex = nextIndex;
          updateCounter();
          isAnimating = false;
        },
      });

      if (reduceMotion) {
        tl.to(outgoingSlide.item, { 
            autoAlpha: 0,
            duration: 0.4,
            ease: "power2"
          }, 0)
          .fromTo(incomingSlide.item, {
            autoAlpha: 0
          }, {
            autoAlpha: 1,
            duration: 0.4,
            ease: "power2"
          }, 0);
          
        return;
      }

      const outgoingLines = outgoingSlide.getLines();
      const incomingLines = incomingSlide.getLines();

      gsap.set(incomingSlide.item, { autoAlpha: 1, pointerEvents: "auto" });
      gsap.set(incomingLines, { yPercent: 110 });
  
      if (outgoingSlide.image) gsap.set(outgoingSlide.image, { clipPath: imageClipVisible });

      tl.to(outgoingLines, {
        yPercent: -110,
        duration: 0.6,
        ease: "power4.inOut",
        stagger: { amount: 0.25 },
      }, 0);

      if (outgoingSlide.image) {
        tl.to(outgoingSlide.image, {
          clipPath: imageClipHidden,
          duration: 0.6,
          ease: "power4.inOut",
        }, 0);
      }

      tl.to(incomingLines, {
        yPercent: 0,
        duration: 0.7,
        ease: "power4.inOut",
        stagger: { amount: 0.4 },
      }, ">-=0.3");

      if (incomingSlide.image) {
        tl.fromTo(incomingSlide.image, {
          clipPath: imageClipHidden,
        }, {
          clipPath: imageClipVisible,
          duration: 0.75,
          ease: "power4.inOut",
        }, "<");
      }

      tl.set(outgoingSlide.item, { autoAlpha: 0 }, ">");
    }
  
    // Start autoplay on the wrap (only works if autoplay is set to 'true')
    startAutoplay();

    if (btnNext) {
      btnNext.addEventListener("click", () => {
        resetAutoplay();
        goTo((activeIndex + 1) % slides.length);
      });
    }
    
    if (btnPrev) {
      btnPrev.addEventListener("click", () => {
        resetAutoplay();
        goTo((activeIndex - 1 + slides.length) % slides.length);
      });
    }
        
    function onKeyDown(e) {
      if (!isInView) return;
    
      // Don't hijack arrow keys while user is typing.
      const t = e.target;
      const isTypingTarget =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
    
      if (isTypingTarget) return;
    
      if (e.key === "ArrowRight") {
        e.preventDefault();
        resetAutoplay();
        goTo((activeIndex + 1) % slides.length);
      }
    
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        resetAutoplay();
        goTo((activeIndex - 1 + slides.length) % slides.length);
      }
    }
    
    // Listen for left/right arrows
    window.addEventListener("keydown", onKeyDown);
    cleanups.push(() => window.removeEventListener("keydown", onKeyDown));
    cleanups.push(() => autoplayCall?.kill());
    
    // Enable/disable keyboard + autoplay depending on scroll position
    const inViewTrigger = ScrollTrigger.create({
      trigger: wrap,
      start: "top bottom",
      end: "bottom top",
      onEnter: () => {
        isInView = true;
        resumeAutoplay();
      },
      onEnterBack: () => {
        isInView = true;
        resumeAutoplay();
      },
      onLeave: () => {
        isInView = false;
        pauseAutoplay();
      },
      onLeaveBack: () => {
        isInView = false;
        pauseAutoplay();
      },
    });
    cleanups.push(() => inViewTrigger.kill());
    
  });

  return () => cleanups.forEach(fn => fn());
}

/* ==========================================================================
   Centered Looping Slider - Osmo Supply
   [data-centered-slider="wrapper"]: draggable looping slider with the active slide centered.
   Needs the GSAP Draggable and InertiaPlugin scripts.
   ========================================================================== */

function initCenteredLoopingSlider(root = document) {
  const sliderWrappers = gsap.utils.toArray(root.querySelectorAll('[data-centered-slider="wrapper"]'));
  if (!sliderWrappers.length) return;
  // Draggable inertia needs the InertiaPlugin script; register it once
  gsap.registerPlugin(Draggable, ...(typeof InertiaPlugin !== 'undefined' ? [InertiaPlugin] : []));
  const cleanups = [];

  sliderWrappers.forEach((sliderWrapper) => {
    const slides = gsap.utils.toArray(sliderWrapper.querySelectorAll('[data-centered-slider="slide"]'));
    const bullets = gsap.utils.toArray(sliderWrapper.querySelectorAll('[data-centered-slider="bullet"]'));
    const prevButton = sliderWrapper.querySelector('[data-centered-slider="prev-button"]');
    const nextButton = sliderWrapper.querySelector('[data-centered-slider="next-button"]');

    let activeElement;
    let activeBullet;
    let currentIndex = 0;
    let autoplay;

    // Autoplay is now enabled/disabled via a boolean attribute.
    const autoplayEnabled = sliderWrapper.getAttribute('data-slider-autoplay') === 'true';
    
    // If enabled, get the autoplay duration (in seconds) from the separate attribute.
    const autoplayDuration = autoplayEnabled ? parseFloat(sliderWrapper.getAttribute('data-slider-autoplay-duration')) || 0 : 0;

    // Dynamically assign unique IDs to slides
    slides.forEach((slide, i) => {
      slide.setAttribute("id", `slide-${i}`);
    });
    
    // Set ARIA attributes on bullets if they exist
    if (bullets && bullets.length > 0) {
      bullets.forEach((bullet, i) => {
        bullet.setAttribute("aria-controls", `slide-${i}`);
        bullet.setAttribute("aria-selected", i === currentIndex ? "true" : "false");
      });
    }

    const loop = horizontalLoop(slides, {
      paused: true,
      draggable: true,
      center: true,
      onChange: (element, index) => {
        currentIndex = index;
        
        if (activeElement) activeElement.classList.remove("active");
        element.classList.add("active");
        activeElement = element;

        if (bullets && bullets.length > 0) {
          if (activeBullet) activeBullet.classList.remove("active");
          if (bullets[index]) {
            bullets[index].classList.add("active");
            activeBullet = bullets[index];
          }
          bullets.forEach((bullet, i) => {
            bullet.setAttribute("aria-selected", i === index ? "true" : "false");
          });
        }
        
      }
    });
    
    // On initialization, center the slider
    loop.toIndex(2, { duration: 0.01 });

    function startAutoplay() {
      if (autoplayDuration > 0 && !autoplay) {
        const repeat = () => {
          loop.next({ ease: "osmo", duration: 0.725 });
          autoplay = gsap.delayedCall(autoplayDuration, repeat);
        };
        autoplay = gsap.delayedCall(autoplayDuration, repeat);
      }
    }

    function stopAutoplay() {
      if (autoplay) {
        autoplay.kill();
        autoplay = null;
      }
    }

    // Start/stop autoplay based on viewport visibility via ScrollTrigger
    const sliderTrigger = ScrollTrigger.create({
      trigger: sliderWrapper,
      start: "top bottom",
      end: "bottom top",
      onEnter: startAutoplay,
      onLeave: stopAutoplay,
      onEnterBack: startAutoplay,
      onLeaveBack: stopAutoplay
    });
    cleanups.push(() => {
      stopAutoplay();
      sliderTrigger.kill();
      loop.draggable?.kill?.();
      loop.kill();
    });

    // Pause autoplay on mouse hover over the slider
    sliderWrapper.addEventListener("mouseenter", stopAutoplay);
    sliderWrapper.addEventListener("mouseleave", () => {
      if (ScrollTrigger.isInViewport(sliderWrapper)) startAutoplay();
    });

    // Slide click event for direct navigation
    slides.forEach((slide, i) => {
      slide.addEventListener("click", () => {
        loop.toIndex(i, { ease: "osmo", duration: 0.725 });
      });
    });

    // Bullets click event for direct navigation (if available)
    if (bullets && bullets.length > 0) {
      bullets.forEach((bullet, i) => {
        bullet.addEventListener("click", () => {
          loop.toIndex(i, { ease: "osmo", duration: 0.725 });
          if (activeBullet) activeBullet.classList.remove("active");
          bullet.classList.add("active");
          activeBullet = bullet;
          bullets.forEach((b, j) => {
            b.setAttribute("aria-selected", j === i ? "true" : "false");
          });
        });
      });
    }

    // Prev/Next button listeners (if the buttons exist)
    if (prevButton) {
      prevButton.addEventListener("click", () => {
        let newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = slides.length - 1;
        loop.toIndex(newIndex, { ease: "osmo", duration: 0.725 });
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", () => {
        let newIndex = currentIndex + 1;
        if (newIndex >= slides.length) newIndex = 0;
        loop.toIndex(newIndex, { ease: "osmo", duration: 0.725 });
      });
    }
    
  });

  return () => cleanups.forEach(fn => fn());
}

// GSAP Helper function to create a looping slider
// Read more: https://gsap.com/docs/v3/HelperFunctions/helpers/seamlessLoop
function horizontalLoop(items, config) {
  let timeline;
  items = gsap.utils.toArray(items);
  config = config || {};
  gsap.context(() => { 
    let onChange = config.onChange,
      lastIndex = 0,
      tl = gsap.timeline({repeat: config.repeat, onUpdate: onChange && function() {
          let i = tl.closestIndex();
          if (lastIndex !== i) {
            lastIndex = i;
            onChange(items[i], i);
          }
        }, paused: config.paused, defaults: {ease: "none"}, onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100)}),
      length = items.length,
      startX = items[0].offsetLeft,
      times = [],
      widths = [],
      spaceBefore = [],
      xPercents = [],
      curIndex = 0,
      indexIsDirty = false,
      center = config.center,
      pixelsPerSecond = (config.speed || 1) * 100,
      snap = config.snap === false ? v => v : gsap.utils.snap(config.snap || 1),
      timeOffset = 0,
      container = center === true ? items[0].parentNode : gsap.utils.toArray(center)[0] || items[0].parentNode,
      totalWidth,
      getTotalWidth = () => items[length-1].offsetLeft + xPercents[length-1] / 100 * widths[length-1] - startX + spaceBefore[0] + items[length-1].offsetWidth * gsap.getProperty(items[length-1], "scaleX") + (parseFloat(config.paddingRight) || 0),
      populateWidths = () => {
        let b1 = container.getBoundingClientRect(), b2;
        items.forEach((el, i) => {
          widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
          xPercents[i] = snap(parseFloat(gsap.getProperty(el, "x", "px")) / widths[i] * 100 + gsap.getProperty(el, "xPercent"));
          b2 = el.getBoundingClientRect();
          spaceBefore[i] = b2.left - (i ? b1.right : b1.left);
          b1 = b2;
        });
        gsap.set(items, {
          xPercent: i => xPercents[i]
        });
        totalWidth = getTotalWidth();
      },
      timeWrap,
      populateOffsets = () => {
        timeOffset = center ? tl.duration() * (container.offsetWidth / 2) / totalWidth : 0;
        center && times.forEach((t, i) => {
          times[i] = timeWrap(tl.labels["label" + i] + tl.duration() * widths[i] / 2 / totalWidth - timeOffset);
        });
      },
      getClosest = (values, value, wrap) => {
        let i = values.length,
          closest = 1e10,
          index = 0, d;
        while (i--) {
          d = Math.abs(values[i] - value);
          if (d > wrap / 2) {
            d = wrap - d;
          }
          if (d < closest) {
            closest = d;
            index = i;
          }
        }
        return index;
      },
      populateTimeline = () => {
        let i, item, curX, distanceToStart, distanceToLoop;
        tl.clear();
        for (i = 0; i < length; i++) {
          item = items[i];
          curX = xPercents[i] / 100 * widths[i];
          distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0];
          distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");
          tl.to(item, {xPercent: snap((curX - distanceToLoop) / widths[i] * 100), duration: distanceToLoop / pixelsPerSecond}, 0)
            .fromTo(item, {xPercent: snap((curX - distanceToLoop + totalWidth) / widths[i] * 100)}, {xPercent: xPercents[i], duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond, immediateRender: false}, distanceToLoop / pixelsPerSecond)
            .add("label" + i, distanceToStart / pixelsPerSecond);
          times[i] = distanceToStart / pixelsPerSecond;
        }
        timeWrap = gsap.utils.wrap(0, tl.duration());
      },
      refresh = (deep) => {
        let progress = tl.progress();
        tl.progress(0, true);
        populateWidths();
        deep && populateTimeline();
        populateOffsets();
        deep && tl.draggable ? tl.time(times[curIndex], true) : tl.progress(progress, true);
      },
      onResize = () => refresh(true),
      proxy;
    gsap.set(items, {x: 0});
    populateWidths();
    populateTimeline();
    populateOffsets();
    window.addEventListener("resize", onResize);
    function toIndex(index, vars) {
      vars = vars || {};
      (Math.abs(index - curIndex) > length / 2) && (index += index > curIndex ? -length : length); // always go in the shortest direction
      let newIndex = gsap.utils.wrap(0, length, index),
        time = times[newIndex];
      if (time > tl.time() !== index > curIndex && index !== curIndex) { // if we're wrapping the timeline's playhead, make the proper adjustments
        time += tl.duration() * (index > curIndex ? 1 : -1);
      }
      if (time < 0 || time > tl.duration()) {
        vars.modifiers = {time: timeWrap};
      }
      curIndex = newIndex;
      vars.overwrite = true;
      gsap.killTweensOf(proxy);    
      return vars.duration === 0 ? tl.time(timeWrap(time)) : tl.tweenTo(time, vars);
    }
    tl.toIndex = (index, vars) => toIndex(index, vars);
    tl.closestIndex = setCurrent => {
      let index = getClosest(times, tl.time(), tl.duration());
      if (setCurrent) {
        curIndex = index;
        indexIsDirty = false;
      }
      return index;
    };
    tl.current = () => indexIsDirty ? tl.closestIndex(true) : curIndex;
    tl.next = vars => toIndex(tl.current()+1, vars);
    tl.previous = vars => toIndex(tl.current()-1, vars);
    tl.times = times;
    tl.progress(1, true).progress(0, true); // pre-render for performance
    if (config.reversed) {
      tl.vars.onReverseComplete();
      tl.reverse();
    }
    if (config.draggable && typeof(Draggable) === "function") {
      proxy = document.createElement("div")
      let wrap = gsap.utils.wrap(0, 1),
        ratio, startProgress, draggable, dragSnap, lastSnap, initChangeX, wasPlaying,
        align = () => tl.progress(wrap(startProgress + (draggable.startX - draggable.x) * ratio)),
        syncIndex = () => tl.closestIndex(true);
      typeof(InertiaPlugin) === "undefined" && console.warn("InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club");
      draggable = Draggable.create(proxy, {
        trigger: items[0].parentNode,
        type: "x",
        onPressInit() {
          let x = this.x;
          gsap.killTweensOf(tl);
          wasPlaying = !tl.paused();
          tl.pause();
          startProgress = tl.progress();
          refresh();
          ratio = 1 / totalWidth;
          initChangeX = (startProgress / -ratio) - x;
          gsap.set(proxy, {x: startProgress / -ratio});
        },
        onDrag: align,
        onThrowUpdate: align,
        overshootTolerance: 0,
        inertia: true,
        snap(value) {
          if (Math.abs(startProgress / -ratio - this.x) < 10) {
            return lastSnap + initChangeX
          }
          let time = -(value * ratio) * tl.duration(),
            wrappedTime = timeWrap(time),
            snapTime = times[getClosest(times, wrappedTime, tl.duration())],
            dif = snapTime - wrappedTime;
          Math.abs(dif) > tl.duration() / 2 && (dif += dif < 0 ? tl.duration() : -tl.duration());
          lastSnap = (time + dif) / tl.duration() / -ratio;
          return lastSnap;
        },
        onRelease() {
          syncIndex();
          draggable.isThrowing && (indexIsDirty = true);
        },
        onThrowComplete: () => {
          syncIndex();
          wasPlaying && tl.play();
        }
      })[0];
      tl.draggable = draggable;
    }
    tl.closestIndex(true);
    lastIndex = curIndex;
    onChange && onChange(items[curIndex], curIndex);
    timeline = tl;
    return () => window.removeEventListener("resize", onResize); 
  });
  return timeline;
  
}

/* ==========================================================================
   Logo Card Testimonials - Osmo Supply
   [data-logo-testimonials-init]: card with the company logo, quote and progress dots.
   ========================================================================== */

function initLogoCardTestimonials(scope = document) {
  const cleanups = [];

  scope.querySelectorAll("[data-logo-testimonials-init]").forEach((root) => {
    const items = Array.from(root.querySelectorAll("[data-logo-testimonials-item]"));
    if (!items.length) return;

    const dotsWrap = root.querySelector("[data-logo-testimonials-dots]");
    const dotTemplate = dotsWrap.querySelector("[data-logo-testimonials-dot]");
    const autoplaySeconds = parseFloat(root.getAttribute("data-logo-testimonials-autoplay")) || 0;

    dotTemplate.remove();

    const slides = items.map((item, index) => {
      const dot = dotTemplate.cloneNode(true);
      dot.setAttribute("aria-label", `Show testimonial ${index + 1}`);
      dot.addEventListener("click", () => goTo(index));
      dotsWrap.appendChild(dot);

      return {
        item,
        dot,
        fill: dot.querySelector("[data-logo-testimonials-dot-fill]"),
        logo: item.querySelector("[data-logo-testimonials-logo]"),
        splits: Array.from(item.querySelectorAll("[data-logo-testimonials-split]")).map((element) =>
          SplitText.create(element, {
            type: "lines",
            autoSplit: true,
          })
        ),
        getLines() {
          return this.splits.flatMap((split) => split.lines);
        },
      };
    });

    let activeIndex = 0;
    let transition = null;
    let timer = null;
    let isInView = false;
    let isHeld = false;
    let reduceMotion = false;

    function setStatus(slide, status) {
      const isActive = status === "active";
      slide.item.setAttribute("data-logo-testimonials-status", status);
      slide.item.setAttribute("aria-hidden", String(!isActive));
      slide.dot.setAttribute("data-logo-testimonials-status", isActive ? "active" : "inactive");
      slide.dot.setAttribute("aria-current", String(isActive));
    }

    function startTimer() {
      if (timer) timer.kill();

      const activeFill = slides[activeIndex].fill;

      gsap.set(slides.map((slide) => slide.fill), {
        scaleX: 0,
      });

      if (!autoplaySeconds) {
        gsap.set(activeFill, {
          scaleX: 1,
        });
        return;
      }

      timer = gsap.fromTo(activeFill, {
        scaleX: 0,
      }, {
        scaleX: 1,
        duration: autoplaySeconds,
        ease: "none",
        onComplete: () => goTo((activeIndex + 1) % slides.length),
      });
      updateTimer();
    }

    function updateTimer() {
      if (!timer) return;
      if (isInView && !isHeld) timer.resume();
      else timer.pause();
    }

    function goTo(nextIndex) {
      if (nextIndex === activeIndex) return;
      if (transition) transition.progress(1);

      const outgoing = slides[activeIndex];
      const incoming = slides[nextIndex];
      const outgoingLines = outgoing.getLines();
      const incomingLines = incoming.getLines();

      setStatus(outgoing, "leaving");
      setStatus(incoming, "active");
      activeIndex = nextIndex;
      startTimer();

      transition = gsap.timeline({
        onComplete: () => {
          setStatus(outgoing, "inactive");
          gsap.set([...outgoingLines, ...incomingLines, outgoing.logo, incoming.logo, outgoing.item, incoming.item], {
            clearProps: "transform,opacity",
          });
          transition = null;
        },
      });

      if (reduceMotion) {
        transition
          .to(outgoing.item, {
            opacity: 0,
            duration: 0.4,
            ease: "power2.out",
          }, 0)
          .fromTo(incoming.item, {
            opacity: 0,
          }, {
            opacity: 1,
            duration: 0.4,
            ease: "power2.out",
          }, 0);
        return;
      }

      transition
        .to(outgoingLines, {
          opacity: 0,
          duration: 0.4,
          ease: "power2.out",
          stagger: {
            amount: 0.1,
          },
        }, 0)
        .fromTo(incomingLines, {
          opacity: 0,
          yPercent: 40,
        }, {
          opacity: 1,
          yPercent: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: {
            amount: 0.3,
          },
        }, 0.35)
        .to(outgoing.logo, {
          yPercent: -110,
          duration: 0.6,
          ease: "power4.inOut",
        }, 0)
        .fromTo(incoming.logo, {
          yPercent: 110,
        }, {
          yPercent: 0,
          duration: 0.7,
          ease: "power4.inOut",
        }, 0.15);
    }

    function onHold() {
      isHeld = true;
      updateTimer();
    }

    function onRelease(event) {
      if (event.type === "focusout" && root.contains(event.relatedTarget)) return;
      isHeld = false;
      updateTimer();
    }

    root.addEventListener("pointerenter", onHold);
    root.addEventListener("pointerleave", onRelease);
    root.addEventListener("focusin", onHold);
    root.addEventListener("focusout", onRelease);

    const observer = new IntersectionObserver(([entry]) => {
      isInView = entry.isIntersecting;
      updateTimer();
    });
    observer.observe(root);
    cleanups.push(() => {
      observer.disconnect();
      timer?.kill();
      transition?.kill();
    });

    gsap.matchMedia().add("(prefers-reduced-motion: reduce)", () => {
      reduceMotion = true;
      return () => {
        reduceMotion = false;
      };
    });

    slides.forEach((slide, index) => setStatus(slide, index === activeIndex ? "active" : "inactive"));
    startTimer();
  });

  return () => cleanups.forEach(fn => fn());
}

/* ==========================================================================
   Footer Parallax Effect - Osmo Supply
   [data-footer-parallax] > [data-footer-parallax-inner] rises into place while
   [data-footer-parallax-dark] fades away. Offset: --comp-footer-parallax-offset (percent).
   ========================================================================== */

function initFooterParallax(root = document){
  const timelines = [];
  root.querySelectorAll('[data-footer-parallax]').forEach(el => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: 'clamp(top bottom)',
        end: 'clamp(top top)',
        scrub: true
      }
    });
  
    timelines.push(tl);
    const inner = el.querySelector('[data-footer-parallax-inner]');
    const dark  = el.querySelector('[data-footer-parallax-dark]');
  
    if (inner) {
      tl.from(inner, {
        yPercent: parseFloat(getComputedStyle(el).getPropertyValue('--comp-footer-parallax-offset')) || -25,
        ease: 'linear'
      });
    }
  
    if (dark) {
      tl.from(dark, {
        opacity: 0.5,
        ease: 'linear'
      }, '<');
    }
  });

  return () => timelines.forEach(tl => { tl.scrollTrigger?.kill(); tl.kill(); });
}

/* ==========================================================================
   Copy Email to Clipboard Button - Osmo Supply
   .copy-email-button with data-copy-email (or an inner [data-copy-email-element]).
   ========================================================================== */

function initCopyEmailClipboard(root = document) {
  const buttons = root.querySelectorAll('.copy-email-button');
  if (!buttons.length) return;

  const copyEmail = (button) => {
  	// Email to copy to clipboard is taking from the button itself, or if that's empty,
    // from a text element inside the button
    const email =
      button.getAttribute('data-copy-email') ||
      button.querySelector('[data-copy-email-element]').textContent.trim();
    if (email) {
      navigator.clipboard.writeText(email).then(() => {
        button.setAttribute('data-copy-button', 'copied');
        button.setAttribute('aria-label', 'Email copied to clipboard!');
      });
    }
  };

  const handleInteraction = (e) => {
    if (
      e.type === 'click' ||
      (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' '))
    ) {
      e.preventDefault();
      copyEmail(e.currentTarget);
    }
  };

  buttons.forEach((button) => {
    button.addEventListener('click', handleInteraction);
    button.addEventListener('keydown', handleInteraction);
    button.addEventListener('mouseleave', () => {
    	// Remove 'active' attribute to reset color and text transform
      button.removeAttribute('data-copy-button');
      // Remove focus on mouseleave to clear keyboard focus styling
      button.blur();
      button.setAttribute('aria-label', 'Copy email to clipboard');
    });
    button.addEventListener('blur', () => {
      button.removeAttribute('data-copy-button');
      button.setAttribute('aria-label', 'Copy email to clipboard');
    });
  });
}

/* ==========================================================================
   Back to top: [data-back-to-top] links scroll to the top of the page
   ========================================================================== */

function initBackToTop(root = document) {
  // [data-back-to-top] goes to the top; [data-scroll-link] goes to the section its #hash names
  const links = root.querySelectorAll('[data-back-to-top], [data-scroll-link]');
  if (!links.length) return;

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      const hash = link.getAttribute('href') || '';
      const target = link.hasAttribute('data-back-to-top') ? null : document.querySelector(hash);
      if (!target && !link.hasAttribute('data-back-to-top')) return;
      e.preventDefault();
      scrollToAnchor(target || 0);
    });
  });
}


/* ==========================================================================
   Table of Contents for Article - Osmo Supply
   Builds the list from the headings in [data-toc-content] and tracks the active section.
   ========================================================================== */


function initTableOfContents(scope = document) {
  scope.querySelectorAll('[data-toc-wrap]').forEach(root => {
    const contentEl = root.querySelector('[data-toc-content]');
    const listEl = root.querySelector('[data-toc-list]');
    const templateLink = listEl?.querySelector('[data-toc-link]');
    if (!contentEl || !listEl || !templateLink) return;

    const levels = (root.getAttribute('data-toc-levels') || 'h2,h3').split(',').map(l => l.trim().toLowerCase()).filter(l => /^h[1-6]$/.test(l));
    const levelSelector = levels.join(', ');
    if (!levelSelector) return;

    const offset = parseInt(root.getAttribute('data-toc-offset')) || 50;
    const marker = '{skip}';

    const slugCounts = new Map();

    function slugify(text) {
      let slug = text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!slug) slug = 'section';

      const count = slugCounts.get(slug) || 0;
      slugCounts.set(slug, count + 1);
      return count === 0 ? slug : slug + '-' + (count + 1);
    }

    function stripMarker(el) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent.includes(marker)) {
          node.textContent = node.textContent.replace(marker, '').trim();
        }
      }
    }

    const allHeadings = Array.from(contentEl.querySelectorAll(levelSelector));
    const headings = [];

    allHeadings.forEach(heading => {
      if (heading.hasAttribute('data-toc-ignore')) return;
      if (heading.textContent.includes(marker)) {
        stripMarker(heading);
        return;
      }
      const text = heading.textContent.trim();
      if (!text) return;
      headings.push(heading);
    });

    if (!headings.length) return;
    
    headings.forEach(heading => {
      if (!heading.id) {
        heading.id = slugify(heading.textContent.trim());
      }
    });

    const tocLinks = [];

    headings.forEach(heading => {
      const clone = templateLink.cloneNode(true);
      const textTarget = clone.querySelector('[data-toc-text]') || clone;
      textTarget.textContent = heading.textContent.trim();

      clone.href = '#' + heading.id;
      clone.removeAttribute('data-toc-link');
      clone.setAttribute('data-toc-item', '');

      const level = heading.tagName.charAt(1);
      clone.setAttribute('data-toc-depth', level);

      listEl.appendChild(clone);
      tocLinks.push(clone);
    });

    listEl.querySelectorAll('[data-toc-link]').forEach(el => el.remove());

    // Active state tracking via ScrollTrigger
    if (typeof ScrollTrigger !== 'undefined') {
      function setActive(index) {
        tocLinks.forEach(link => link.setAttribute('data-toc-status', ''));
        if (tocLinks[index]) tocLinks[index].setAttribute('data-toc-status', 'active');
      }

      headings.forEach((heading, i) => {
        const nextHeading = headings[i + 1];

        ScrollTrigger.create({
          trigger: heading,
          start: 'top ' + (offset + 1) + 'px',
          endTrigger: nextHeading || contentEl,
          end: nextHeading ? 'top ' + (offset + 1) + 'px' : 'bottom top',
          onToggle: self => {
            if (self.isActive) setActive(i);
          }
        });
      });

      if (window.scrollY <= headings[0].getBoundingClientRect().top + window.scrollY - offset) {
        setActive(0);
      }
    }

    // Click handler with smooth scroll
    listEl.addEventListener('click', e => {
      const link = e.target.closest('[data-toc-item]');
      if (!link) return;
      e.preventDefault();
      e.stopPropagation();

      const id = link.getAttribute('href')?.slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      if (typeof lenis !== 'undefined' && typeof lenis.scrollTo === 'function') {
        lenis.scrollTo(target, { offset: -offset });
      } else {
        const y = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });
}


/* ==========================================================================
   Face Follow Cursor (Mascot) - Osmo Supply
   Config: data-face on the wrapper (base intensity, default 30), data-face-target on each element that moves (multiplier, default 1)
   ========================================================================== */

function initFaceFollowCursor(scope = document) {
  const faceSections = scope.querySelectorAll('[data-face]');
  if (!faceSections.length) return;

  const cleanups = [];

  faceSections.forEach(section => {
    const baseIntensity = parseFloat(section.getAttribute('data-face')) || 30;

    const targets = Array.from(section.querySelectorAll('[data-face-target]')).map(el => {
      const factor = parseFloat(el.getAttribute('data-face-target')) || 1;
      return {
        el,
        factor,
        intensity: baseIntensity * factor,
        setX: gsap.quickTo(el, 'xPercent', { duration: 0.3, ease: 'power2' }),
        setY: gsap.quickTo(el, 'yPercent', { duration: 0.3, ease: 'power2' })
      };
    });

    let isTracking = false;
    let isRAFRunning = false;
    let lastMouse = { x: 0, y: 0 };

    const update = () => {
      const mx = lastMouse.x;
      const my = lastMouse.y;

      targets.forEach(target => {
        const r  = target.el.getBoundingClientRect();
        const cx = r.left + r.width  / 2;
        const cy = r.top  + r.height / 2;
        const rx = r.width  / 2;
        const ry = r.height / 2;

        let nx = (mx - cx) / rx;
        let ny = (my - cy) / ry;

        const mag = Math.hypot(nx, ny);
        if (mag > 1) {
          nx /= mag;
          ny /= mag;
        }

        target.setX(nx * target.intensity);
        target.setY(ny * target.intensity);
      });

      isRAFRunning = false;
    };

    const onMouseMove = e => {
      lastMouse.x = e.clientX;
      lastMouse.y = e.clientY;
      if (!isRAFRunning) {
        requestAnimationFrame(update);
        isRAFRunning = true;
      }
    };

    const startTracking = () => {
      if (!isTracking) {
        window.addEventListener('mousemove', onMouseMove);
        isTracking = true;
      }
    };

    const stopTracking = () => {
      if (isTracking) {
        window.removeEventListener('mousemove', onMouseMove);
        isTracking = false;
      }
    };

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onEnter: startTracking,
      onEnterBack: startTracking,
      onLeave: stopTracking,
      onLeaveBack: stopTracking
    });

    cleanups.push(() => {
      trigger.kill();
      stopTracking();
    });
  });

  // Cleanup for page transitions
  return () => cleanups.forEach(fn => fn());
}


/* ==========================================================================
   Share links (case study pages)
   Config: [data-share="linkedin" | "email" | "copy"]; the links are built from the current page address
   ========================================================================== */

function initShareLinks(scope = document) {
  const links = scope.querySelectorAll('[data-share]');
  if (!links.length) return;

  const url = window.location.href;
  const cleanups = [];

  links.forEach(link => {
    const type = link.getAttribute('data-share');

    if (type === 'linkedin') {
      link.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    }

    if (type === 'email') {
      link.href = `mailto:?subject=${encodeURIComponent(document.title)}&body=${encodeURIComponent(url)}`;
    }

    if (type === 'copy') {
      let timer;
      const onClick = () => {
        navigator.clipboard?.writeText(url).then(() => {
          link.setAttribute('data-share-status', 'copied');
          clearTimeout(timer);
          timer = setTimeout(() => link.removeAttribute('data-share-status'), 2000);
        });
      };
      link.addEventListener('click', onClick);
      cleanups.push(() => {
        clearTimeout(timer);
        link.removeEventListener('click', onClick);
      });
    }
  });

  // Cleanup for page transitions
  return () => cleanups.forEach(fn => fn());
}


/* ==========================================================================
   UI Sounds: a soft tick on hover and a click sound on press, for links and buttons.
   The sounds are synthesized with the Web Audio API, so there are no audio files to load.
   Opt out per element with data-sound="off"; mute everything with localStorage uiSound = "off".
   ========================================================================== */

function initUiSounds() {
  if (window.__uiSoundsInit) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  window.__uiSoundsInit = true;

  const SELECTOR = 'a[href], button, [role="button"], summary, [data-sound="on"]';
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let ctx = null;
  let lastHover = 0;
  let hoverTimer = 0;
  const HOVER_DELAY_MS = 100;  // delay before a button's hover sound
  const BUTTON_SELECTOR = 'button, [role="button"], [class*="btn"]';

  const isMuted = () => {
    try { return localStorage.getItem('uiSound') === 'off'; } catch (e) { return false; }
  };

  // Browsers only allow audio after a user gesture, so the context is created on the first one
  const getCtx = () => {
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  // One short enveloped tone: pitch glides from `from` to `to` Hz
  const blip = ({ from, to, duration, volume, type = 'sine' }) => {
    const c = getCtx();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  };

  const playHover = () => blip({ from: 1500, to: 1900, duration: 0.05, volume: 0.035 });
  const playClick = () => {
    blip({ from: 520, to: 260, duration: 0.09, volume: 0.09, type: 'triangle' });
    blip({ from: 1800, to: 900, duration: 0.03, volume: 0.04 });
  };

  const target = (el) => {
    const t = el && el.closest ? el.closest(SELECTOR) : null;
    return t && !t.closest('[data-sound="off"]') ? t : null;
  };

  const canPlay = () => !isMuted() && !reduceMotion.matches;

  // Hover: only when the pointer enters a different link or button (and only with a mouse)
  document.addEventListener('pointerover', (e) => {
    if (!finePointer.matches || e.pointerType !== 'mouse' || !canPlay() || !ctx) return;
    const t = target(e.target);
    if (!t || t.contains(e.relatedTarget)) return;
    const now = performance.now();
    if (now - lastHover < 70) return;
    lastHover = now;

    // Buttons play their hover sound after a short delay; it's dropped if the pointer leaves first
    if (t.matches(BUTTON_SELECTOR)) {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(playHover, HOVER_DELAY_MS);
    } else {
      playHover();
    }
  }, { passive: true });

  document.addEventListener('pointerout', (e) => {
    const t = target(e.target);
    if (t && !t.contains(e.relatedTarget)) clearTimeout(hoverTimer);
  }, { passive: true });

  // Click: also creates the audio context, since this is the first allowed moment on touch devices
  document.addEventListener('pointerdown', (e) => {
    if (!canPlay()) return;
    getCtx();
    if (target(e.target)) playClick();
  }, { passive: true });

  // A hover isn't a user gesture, so hover sounds start after the first click, tap or key press anywhere
  window.addEventListener('keydown', () => { if (canPlay()) getCtx(); }, { once: true, passive: true });
}


/* ==========================================================================
   Showcase Slider (Osmo Supply)
   Library code, plus a root argument, a matchMedia for reduced motion and a returned cleanup.
   Needs Smooothy (global). Loops through projects; tap one to open its gallery.
   ========================================================================== */

function initShowcaseSlider(scope = document) {
  const sliders = scope.querySelectorAll("[data-showcase-slider-init]");
  if (!sliders.length || typeof Smooothy === "undefined") return;

  const mm = gsap.matchMedia();

  // matchMedia only runs when a query matches, so "all" always does; rebuilt when the reduced-motion preference changes
  mm.add({ all: "(min-width: 0px)", reduce: "(prefers-reduced-motion: reduce)" }, (context) => {
    const reduceMotion = context.conditions.reduce;
    const cleanups = [];

    sliders.forEach((root) => {
      const parallaxStrength = 8; // % of the image width it shifts at the edge of the slider
      const abort = new AbortController();
      const { signal } = abort;

      const collection = root.querySelector("[data-showcase-slider-collection]");
      const list = root.querySelector("[data-showcase-slider-list]");
      const items = [...list.querySelectorAll("[data-showcase-slider-item]")];
      const cards = items.map((item) => item.querySelector("[data-showcase-slider-open]"));
      const frames = items.map((item) => item.querySelector("[data-showcase-slider-frame]"));
      const images = items.map((item) => item.querySelector("[data-showcase-slider-image]"));
      const infos = items.map((item) => item.querySelector("[data-showcase-slider-info]"));
      const viewer = root.querySelector("[data-showcase-slider-viewer]");
      const viewerTemplate = viewer.querySelector("[data-showcase-slider-viewer-list]");
      const viewerItemTemplate = viewerTemplate.querySelector("[data-showcase-slider-viewer-item]");
      const bar = root.querySelector("[data-showcase-slider-bar]");
      const viewerBar = root.querySelector("[data-showcase-slider-viewer-bar]");
      const slots = [...root.querySelectorAll("[data-showcase-slider-slot]")];
      const closeButton = root.querySelector("[data-showcase-slider-close]");
      const prevButton = root.querySelector("[data-showcase-slider-prev]");
      const nextButton = root.querySelector("[data-showcase-slider-next]");
      const setText = (target, hook, value) => {
        const element = target.querySelector(`[data-showcase-slider-${hook}]`);
        if (element) element.textContent = String(value).padStart(2, "0");
      };

      const count = items.length;
      const projects = [];
      let active = null;
      let activeIndex = -1;
      let isOpen = false;
      let busy = false;
      let openedByKeyboard = false;
      let pointerStartX = 0;
      let timeline = null;

      const centerX = (element) => element.getBoundingClientRect().left + element.offsetWidth / 2;
      const offset = (from, to) => {
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        return { x: a.x - b.x + (a.width - b.width) / 2, y: a.y - b.y + (a.height - b.height) / 2, scale: a.width / b.width };
      };
      const matchInput = (slider) => {
        const slideWidth = slider.viewport.itemWidth || 1;
        slider.config.dragSensitivity = 1 / slideWidth;
        slider.config.scrollSensitivity = 2000 / slideWidth;
      };
      const wasDrag = (event) => event.detail !== 0 && Math.abs(event.clientX - pointerStartX) > 6;

      const createTrack = (slider, trackImages, loop) => ({
        slider,
        loop,
        setters: trackImages.map((image) => gsap.quickSetter(image, "xPercent")),
      });

      const renderParallax = (track) => {
        const { slider } = track;
        const ratio = slider.viewport.itemWidth / (slider.viewport.wrapperWidth / 2 || 1);
        const strength = reduceMotion ? 0 : parallaxStrength;
        track.setters.forEach((setX, index) => {
          const position = track.loop ? gsap.utils.wrap(-count / 2, count / 2, index + slider.current) : index + slider.current;
          setX(-position * ratio * strength);
        });
      };

      const base = new Smooothy(list, {
        infinite: true,
        snap: true,
        onResize: matchInput,
        onSlideChange: (current) => setText(bar, "index", current + 1),
      });
      const baseTrack = createTrack(base, images, true);
      setText(bar, "total", count);

      const updateViewer = (current) => {
        setText(viewerBar, "index", current + 1);
        prevButton.disabled = current === 0;
        nextButton.disabled = current === active.frames.length - 1;
      };

      const buildProject = (index) => {
        if (projects[index]) return projects[index];

        const sources = [images[index], ...items[index].querySelectorAll("[data-showcase-slider-slide]")];
        const viewerList = viewerTemplate.cloneNode(false);
        viewerList.setAttribute("data-showcase-slider-status", "active");
        viewer.appendChild(viewerList);

        const viewerFrames = [];
        const viewerImages = [];
        sources.forEach((source, sourceIndex) => {
          const viewerItem = viewerItemTemplate.cloneNode(true);
          const viewerFrame = viewerItem.querySelector("[data-showcase-slider-viewer-frame]");
          const viewerImage = viewerItem.querySelector("[data-showcase-slider-viewer-image]");
          ["src", "srcset", "sizes", "alt"].forEach((attribute) => {
            if (source.hasAttribute(attribute)) viewerImage.setAttribute(attribute, source.getAttribute(attribute));
            else viewerImage.removeAttribute(attribute);
          });
          viewerImage.style.objectPosition = source.style.objectPosition;
          viewerItem.setAttribute("aria-label", `${sourceIndex + 1} of ${sources.length}`);
          viewerFrame.addEventListener("click", (event) => {
            if (!wasDrag(event) && !busy) projects[index].slider.target = -sourceIndex;
          }, { signal });
          viewerList.appendChild(viewerItem);
          viewerFrames.push(viewerFrame);
          viewerImages.push(viewerImage);
        });

        const slider = new Smooothy(viewerList, {
          infinite: false,
          snap: true,
          onResize: matchInput,
          onSlideChange: (current) => updateViewer(current),
        });
        viewerList.addEventListener("scroll", () => {
          viewerList.scrollLeft = 0;
        }, { signal });

        projects[index] = {
          list: viewerList,
          slider,
          frames: viewerFrames,
          images: viewerImages,
          track: createTrack(slider, viewerImages, false),
        };
        return projects[index];
      };

      const setOpen = (open) => {
        isOpen = open;
        root.setAttribute("data-showcase-slider-status", open ? "open" : "closed");
        collection.inert = open;
        viewer.inert = !open;
        viewerBar.inert = !open;
        base.paused = open;
      };

      const open = (index, fromKeyboard) => {
        if (busy || isOpen) return;
        busy = true;
        activeIndex = index;
        openedByKeyboard = fromKeyboard;
        base.target = base.current;
        projects.forEach((project) => project.list.removeAttribute("data-showcase-slider-status"));
        active = buildProject(index);
        active.list.setAttribute("data-showcase-slider-status", "active");
        setOpen(true);

        active.slider.current = active.slider.target = 0;
        active.slider.paused = false;
        active.slider.resize();
        renderParallax(active.track);
        updateViewer(0);
        setText(viewerBar, "total", active.frames.length);
        slots.forEach((slot) => {
          const content = items[index].querySelector(`[data-showcase-slider-content="${slot.getAttribute("data-showcase-slider-slot")}"]`);
          slot.replaceChildren(...(content ? content.cloneNode(true).childNodes : []));
        });

        const move = offset(frames[index], active.frames[0]);
        const push = root.offsetWidth * 0.35;
        const tl = timeline = gsap.timeline({
          defaults: {
            ease: "expo.inOut",
          },
          onComplete: () => {
            busy = false;
          },
        });

        tl.set(frames[index], {
          autoAlpha: 0,
        })
        .fromTo(active.frames[0], {
          x: move.x,
          y: move.y,
          scale: move.scale,
        }, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 1.1,
        })
        .fromTo(active.images[0], {
          xPercent: gsap.getProperty(images[index], "xPercent"),
        }, {
          xPercent: gsap.getProperty(active.images[0], "xPercent"),
          duration: 1.1,
        }, "<")
        .to(cards.filter((card, cardIndex) => cardIndex !== index), {
          x: (cardIndex, card) => Math.sign(centerX(card) - centerX(cards[index])) * push,
          autoAlpha: 0,
          duration: 1,
        }, "<")
        .to([infos[index], bar], {
          autoAlpha: 0,
          duration: 0.3,
          ease: "power1.out",
        }, "<")
        .fromTo(active.frames.slice(1), {
          x: push * 0.6,
          autoAlpha: 0,
        }, {
          x: 0,
          autoAlpha: 1,
          duration: 1,
          ease: "expo.out",
          stagger: 0.05,
        }, "<+=0.6")
        .fromTo([viewerBar, ...slots], {
          autoAlpha: 0,
        }, {
          autoAlpha: 1,
          duration: 0.5,
          ease: "power1.out",
        }, "<");
        if (fromKeyboard) tl.call(() => closeButton.focus({ preventScroll: true }), null, 0.65);
        if (reduceMotion) tl.progress(1);
      };

      const close = () => {
        if (busy || !isOpen) return;
        busy = true;
        const current = active.slider.currentSlide;
        const frame = active.frames[current];
        const keyboardInside = root.contains(document.activeElement) && document.activeElement.matches(":focus-visible");
        const move = offset(frames[activeIndex], frame);
        const push = root.offsetWidth * 0.35;

        const tl = timeline = gsap.timeline({
          defaults: {
            ease: "expo.inOut",
          },
          onComplete: () => {
            gsap.set([...active.frames, ...cards], {
              clearProps: "transform,opacity,visibility",
            });
            active.slider.paused = true;
            setOpen(false);
            busy = false;
            if (openedByKeyboard || keyboardInside) cards[activeIndex].focus({ preventScroll: true });
          },
        });

        tl.to(frame, {
          x: `+=${move.x}`,
          y: `+=${move.y}`,
          scale: move.scale,
          duration: 1.1,
        })
        .to(active.images[current], {
          xPercent: gsap.getProperty(images[activeIndex], "xPercent"),
          duration: 1.1,
        }, "<")
        .to(active.frames.filter((other) => other !== frame), {
          x: (frameIndex, other) => Math.sign(centerX(other) - centerX(frame)) * push * 0.6,
          autoAlpha: 0,
          duration: 0.6,
          ease: "power3.in",
        }, "<")
        .to([viewerBar, ...slots], {
          autoAlpha: 0,
          duration: 0.3,
          ease: "power1.out",
        }, "<")
        .to(cards.filter((card, cardIndex) => cardIndex !== activeIndex), {
          x: 0,
          autoAlpha: 1,
          duration: 1,
        }, "<+=0.1")
        .to([infos[activeIndex], bar], {
          autoAlpha: 1,
          duration: 0.5,
          ease: "power1.out",
        }, 0.8)
        .set(frames[activeIndex], {
          autoAlpha: 1,
        }, "<")
        .to(frame, {
          autoAlpha: 0,
          duration: 0.3,
          ease: "power1.out",
        }, "<");
        if (reduceMotion) tl.progress(1);
      };

      root.addEventListener("pointerdown", (event) => {
        pointerStartX = event.clientX;
      }, { capture: true, signal });

      cards.forEach((card, index) => {
        card.addEventListener("click", (event) => {
          if (!wasDrag(event)) open(index, event.detail === 0);
        }, { signal });
        card.addEventListener("focus", () => {
          if (isOpen || !card.matches(":focus-visible")) return;
          base.target = -index + count * Math.round((base.target + index) / count);
        }, { signal });
      });

      list.addEventListener("scroll", () => {
        list.scrollLeft = 0;
      }, { signal });
      closeButton.addEventListener("click", close, { signal });
      prevButton.addEventListener("click", () => active.slider.goToPrev(), { signal });
      nextButton.addEventListener("click", () => active.slider.goToNext(), { signal });

      document.addEventListener("keydown", (event) => {
        if (isOpen) {
          if (event.key === "Escape") close();
          if (event.key === "ArrowRight") nextButton.click();
          if (event.key === "ArrowLeft") prevButton.click();
        }
      }, { signal });

      const tick = () => {
        if (!isOpen) {
          base.update();
          renderParallax(baseTrack);
        }
        if (isOpen && !busy) {
          active.slider.update();
          renderParallax(active.track);
        }
      };
      gsap.ticker.add(tick);

      // Undo everything when the breakpoint changes or the page is swapped out
      cleanups.push(() => {
        gsap.ticker.remove(tick);
        abort.abort();
        if (timeline) timeline.kill();
        base.destroy();
        projects.forEach((project) => {
          if (!project) return;
          project.slider.destroy();
          project.list.remove();
        });
        gsap.set([...cards, ...frames, ...images, ...infos, bar, viewerBar, ...slots], { clearProps: "transform,opacity,visibility" });
        collection.inert = false;
        viewer.inert = true;
        viewerBar.inert = true;
        root.setAttribute("data-showcase-slider-status", "closed");
      });
    });

    return () => cleanups.forEach((fn) => fn());
  });

  // Cleanup for page transitions
  return () => mm.revert();
}


/* ==========================================================================
   Auto Image Cycle (Slideshow) (Osmo Supply)
   Library code, plus a root argument and a returned cleanup.
   ========================================================================== */

function initImageCycle(root = document) {
  const cycles = root.querySelectorAll("[data-image-cycle]");
  if (!cycles.length) return;

  const cleanups = [];

  cycles.forEach(cycleElement => {
    const items = cycleElement.querySelectorAll("[data-image-cycle-item]");
    if (items.length < 2) return;

    let currentIndex = 0;
    let intervalId;
    const timeouts = new Set();

    // Get optional custom duration (in seconds), fallback to 2000ms
    const attrValue = cycleElement.getAttribute("data-image-cycle");
    const duration = attrValue && !isNaN(attrValue) ? parseFloat(attrValue) * 1000 : 2000;
    const isTwoItems = items.length === 2;

    // Initial state
    items.forEach((item, i) => {
      item.setAttribute("data-image-cycle-item", i === 0 ? "active" : "not-active");
    });

    function cycleImages() {
      const prevIndex = currentIndex;
      currentIndex = (currentIndex + 1) % items.length;

      items[prevIndex].setAttribute("data-image-cycle-item", "previous");

      if (!isTwoItems) {
        const timeoutId = setTimeout(() => {
          timeouts.delete(timeoutId);
          items[prevIndex].setAttribute("data-image-cycle-item", "not-active");
        }, duration);
        timeouts.add(timeoutId);
      }

      items[currentIndex].setAttribute("data-image-cycle-item", "active");
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !intervalId) {
        intervalId = setInterval(cycleImages, duration);
      } else {
        clearInterval(intervalId);
        intervalId = null;
      }
    }, { threshold: 0 });

    observer.observe(cycleElement);

    cleanups.push(() => {
      observer.disconnect();
      clearInterval(intervalId);
      timeouts.forEach(clearTimeout);
    });
  });

  // Cleanup for page transitions
  return () => cleanups.forEach(fn => fn());
}


/* ==========================================================================
   Dynamic Current Time - Osmo Supply (persistent nav, initialized once from initSite)
   ========================================================================== */

function initDynamicCurrentTime() {
  const defaultTimezone = "Europe/Berlin";

  // Helper function to format numbers with leading zero
  const formatNumber = (number) => number.toString().padStart(2, '0');

  // Function to create a time formatter with the correct timezone
  const createFormatter = (timezone) => {
    return new Intl.DateTimeFormat([], {
      timeZone: timezone,
      timeZoneName: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false, // Optional: Remove to match your simpler script
    });
  };

  // Function to parse the formatted string into parts
  const parseFormattedTime = (formattedDateTime) => {
    const match = formattedDateTime.match(/(\d+):(\d+):(\d+)\s*([\w+]+)/);
    if (match) {
      return {
        hours: match[1],
        minutes: match[2],
        seconds: match[3],
        timezone: match[4], // Handles both GMT+X and CET cases
      };
    }
    return null;
  };

  // Function to update the time for all elements
  const updateTime = () => {
    document.querySelectorAll('[data-current-time]').forEach((element) => {
      const timezone = element.getAttribute('data-current-time') || defaultTimezone;
      const formatter = createFormatter(timezone);
      const now = new Date();
      const formattedDateTime = formatter.format(now);

      const timeParts = parseFormattedTime(formattedDateTime);
      if (timeParts) {
        const {
          hours,
          minutes,
          seconds,
          timezone
        } = timeParts;

        // Update child elements if they exist
        const hoursElem = element.querySelector('[data-current-time-hours]');
        const minutesElem = element.querySelector('[data-current-time-minutes]');
        const secondsElem = element.querySelector('[data-current-time-seconds]');
        const timezoneElem = element.querySelector('[data-current-time-timezone]');

        if (hoursElem) hoursElem.textContent = hours;
        if (minutesElem) minutesElem.textContent = minutes;
        if (secondsElem) secondsElem.textContent = seconds;
        if (timezoneElem) timezoneElem.textContent = timezone;
      }
    });
  };

  // Initial update and interval for subsequent updates
  updateTime();
  setInterval(updateTime, 1000);
}



/* ==========================================================================
   Click to Zoom (Basic) (Osmo Supply)
   Library code, plus a root check, a lightbox created on demand (it must live outside the
   sliding [data-main] wrapper) and a returned cleanup.
   ========================================================================== */

function initClickToZoomBasic(root = document) {
  if (!root.querySelector("[data-click-zoom], [data-click-zoom-article]")) return;

  const CONFIG = {
    openDuration: 0.55,
    closeDuration: 0.45,
    openEase: "power3.out",
    closeEase: "power2.inOut",

    closeOnScroll: true,
    closeOnEscape: true,
    closeOnClick: true,
  };

  let lightbox = document.querySelector("[data-click-zoom-lightbox]");
  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.setAttribute("data-click-zoom-lightbox", "");
    lightbox.className = "click-zoom__lightbox";
    document.body.appendChild(lightbox);
  }

  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-hidden", "true");

  // Backdrop animates from transparent to the CSS-declared color.
  const backdropColor = window.getComputedStyle(lightbox).backgroundColor;
  const transparent = "rgba(0, 0, 0, 0)";

  let cloneEl = null;
  let isOpen = false;
  let isAnimating = false;
  let openScrollY = 0;
  let openSourceRectDoc = null;

  function computeFlip(src, dst) {
    return {
      scaleX: src.width / dst.width,
      scaleY: src.height / dst.height,
      tx: (src.left + src.width / 2) - (dst.left + dst.width / 2),
      ty: (src.top + src.height / 2) - (dst.top + dst.height / 2),
    };
  }

  function open(img) {
    if (isOpen || isAnimating) return;
    if (!img.complete || !img.naturalWidth) return;

    isAnimating = true;
    openScrollY = window.scrollY;

    const srcRect = img.getBoundingClientRect();
    openSourceRectDoc = {
      top: srcRect.top + window.scrollY,
      left: srcRect.left,
      width: srcRect.width,
      height: srcRect.height,
    };

    cloneEl = img.cloneNode(false);
    cloneEl.loading = "eager";
    cloneEl.removeAttribute("data-click-zoom");

    const srcComputed = window.getComputedStyle(img);

    gsap.set(lightbox, { display: "flex", backgroundColor: transparent });

    const lightboxStyle = window.getComputedStyle(lightbox);
    const padX = parseFloat(lightboxStyle.paddingLeft) + parseFloat(lightboxStyle.paddingRight);
    const padY = parseFloat(lightboxStyle.paddingTop) + parseFloat(lightboxStyle.paddingBottom);
    const aspect = srcRect.width / srcRect.height;
    const maxW = lightbox.clientWidth - padX;
    const maxH = lightbox.clientHeight - padY;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) { h = maxH; w = h * aspect; }

    gsap.set(cloneEl, {
      width: w,
      height: h,
      display: "block",
      objectFit: srcComputed.objectFit,
      objectPosition: srcComputed.objectPosition,
    });

    while (lightbox.firstChild) lightbox.removeChild(lightbox.firstChild);
    lightbox.appendChild(cloneEl);

    const dstRect = cloneEl.getBoundingClientRect();
    const flip = computeFlip(srcRect, dstRect);

    lightbox.setAttribute("aria-hidden", "false");
    document.documentElement.style.cursor = "zoom-out";

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating = false;
        isOpen = true;
        attachCloseListeners();
      },
    });

    tl.to(lightbox, {
      backgroundColor: backdropColor,
      duration: 0.3,
      ease: "none",
    }, 0);

    tl.fromTo(
      cloneEl,
      { x: flip.tx, y: flip.ty, scaleX: flip.scaleX, scaleY: flip.scaleY },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: CONFIG.openDuration, ease: CONFIG.openEase },
      0
    );
  }

  function close() {
    if (!isOpen || isAnimating) return;
    isAnimating = true;
    detachCloseListeners();
    document.documentElement.style.cursor = "";

    const dstRect = cloneEl.getBoundingClientRect();
    const startX = Number(gsap.getProperty(cloneEl, "x")) || 0;
    const startY = Number(gsap.getProperty(cloneEl, "y")) || 0;
    const startScaleX = Number(gsap.getProperty(cloneEl, "scaleX")) || 1;
    const startScaleY = Number(gsap.getProperty(cloneEl, "scaleY")) || 1;

    function currentSrcRect() {
      return {
        top: openSourceRectDoc.top - window.scrollY,
        left: openSourceRectDoc.left,
        width: openSourceRectDoc.width,
        height: openSourceRectDoc.height,
      };
    }

    let lastFlip = computeFlip(currentSrcRect(), dstRect);

    const cleanup = () => {
      gsap.set(lightbox, { display: "none", clearProps: "backgroundColor" });
      if (cloneEl && cloneEl.parentNode) cloneEl.parentNode.removeChild(cloneEl);
      cloneEl = null;
      lightbox.setAttribute("aria-hidden", "true");
      openSourceRectDoc = null;
      isOpen = false;
      isAnimating = false;
    };

    const state = { t: 0 };

    gsap.to(state, {
      t: 1,
      duration: CONFIG.closeDuration,
      ease: CONFIG.closeEase,
      onUpdate: () => {
        lastFlip = computeFlip(currentSrcRect(), dstRect);
        const t = state.t;
        gsap.set(cloneEl, {
          x: startX + (lastFlip.tx - startX) * t,
          y: startY + (lastFlip.ty - startY) * t,
          scaleX: startScaleX + (lastFlip.scaleX - startScaleX) * t,
          scaleY: startScaleY + (lastFlip.scaleY - startScaleY) * t,
        });
      },
      onComplete: cleanup,
    });

    gsap.to(lightbox, {
      backgroundColor: transparent,
      duration: 0.3,
      ease: "power2.in",
      delay: CONFIG.closeDuration * 0.4,
    });
  }

  function onDocumentClick(e) {
    // Article mode: every descendant <img> in a wrapper is clickable.
    const article = e.target.closest("[data-click-zoom-article]");
    if (article) {
      const img = e.target.closest("img");
      if (img && article.contains(img)) {
        e.preventDefault();
        open(img);
        return;
      }
    }
    // Explicit trigger on the <img> or a wrapper.
    const trigger = e.target.closest("[data-click-zoom]");
    if (!trigger) return;
    const img = trigger.tagName === "IMG" ? trigger : trigger.querySelector("img");
    if (!img) return;
    e.preventDefault();
    open(img);
  }

  function onOverlayClick() { if (CONFIG.closeOnClick) close(); }
  function onKeyDown(e) { if (CONFIG.closeOnEscape && e.key === "Escape") close(); }
  function onScroll() {
    if (!CONFIG.closeOnScroll) return;
    if (Math.abs(window.scrollY - openScrollY) < 2) return;
    close();
  }

  function attachCloseListeners() {
    lightbox.addEventListener("click", onOverlayClick);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function detachCloseListeners() {
    lightbox.removeEventListener("click", onOverlayClick);
    document.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("scroll", onScroll);
  }

  document.addEventListener("click", onDocumentClick);

  // Cleanup for page transitions
  return () => {
    document.removeEventListener("click", onDocumentClick);
    detachCloseListeners();
    document.documentElement.style.cursor = "";
    gsap.killTweensOf(lightbox);
    if (cloneEl && cloneEl.parentNode) cloneEl.parentNode.removeChild(cloneEl);
    gsap.set(lightbox, { display: "none", clearProps: "backgroundColor" });
  };
}
