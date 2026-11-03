// Shared site header + navigation: edit it here and every page updates.
// Loaded synchronously where the header belongs, before js/main.js, so the menu exists when the scripts start.
(function () {
  var markup = `
  <!-- Fixed Underlay Navigation: the menu sits behind the page; [data-main] slides left to reveal it -->
  <div class="underlay-nav">
    <header class="underlay-nav__header">
      <div class="underlay-nav__bar">
        <div class="underlay-nav__container">
          <a href="index.html" class="underlay-nav__logo" aria-label="Reyhaneh Jafari, home">Reyhaneh Jafari</a>
          <div class="underlay-nav__actions">
            <!-- Theme toggle (outside the container, persists between pages) -->
            <button type="button" class="theme-toggle" data-theme-toggle aria-label="Switch to dark theme" aria-pressed="false">
              <svg class="theme-toggle__icon is--moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" fill="currentColor"/></svg>
              <svg class="theme-toggle__icon is--sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <button data-underlay-nav-toggle aria-expanded="false" aria-label="open menu" class="underlay-nav__toggle">
              <span class="underlay-nav__toggle-text">
                <span class="underlay-nav__toggle-label">Menu</span>
                <span class="underlay-nav__toggle-label">Close</span>
              </span>
              <span class="underlay-nav__toggle-icon">
                <span class="underlay-nav__toggle-bar"></span>
                <span class="underlay-nav__toggle-bar"></span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
    <nav data-underlay-nav-menu class="underlay-nav__menu" aria-label="Main">
      <div class="underlay-nav__inner">
        <ul class="underlay-nav__list">
          <li data-reveal-l><a href="index.html#top" class="underlay-nav__link-large"><span class="underlay-nav__link-label">Home</span></a></li>
          <li data-reveal-l><a href="index.html#about" class="underlay-nav__link-large"><span class="underlay-nav__link-label">About</span></a></li>
          <li data-reveal-l><a href="index.html#experience" class="underlay-nav__link-large"><span class="underlay-nav__link-label">Experience</span></a></li>
          <li data-reveal-l><a href="case-studies.html" class="underlay-nav__link-large"><span class="underlay-nav__link-label">Case studies</span></a></li>
          <li data-reveal-l><a href="index.html#speaking" class="underlay-nav__link-large"><span class="underlay-nav__link-label">Speaking</span></a></li>
          <li data-reveal-l><a href="index.html#contact" class="underlay-nav__link-large"><span class="underlay-nav__link-label">Let’s talk</span></a></li>
        </ul>
        <div class="underlay-nav__bottom">
          <div class="underlay-nav__bottom-col">
            <div data-reveal-s><span class="underlay-nav__link-small is--faded">Connect</span></div>
            <ul class="underlay-nav__list is--small">
              <li data-reveal-s><a href="https://www.linkedin.com/in/reyhanjafari" target="_blank" rel="noopener" class="underlay-nav__link-small">LinkedIn</a></li>
            </ul>
          </div>
          <div class="underlay-nav__bottom-col">
            <div data-reveal-s><span class="underlay-nav__link-small is--faded">Local time</span></div>
            <div data-reveal-s>
              <p data-current-time="Europe/Berlin" class="underlay-nav__link-small">
                <span data-current-time-hours>9</span>:<span data-current-time-minutes>00</span>:<span data-current-time-seconds>24</span>
                <span data-current-time-timezone>CET</span>
              </p>
            </div>
          </div>
          <div class="underlay-nav__bottom-border"></div>
        </div>
      </div>
    </nav>
    <div data-underlay-nav-overlay="" class="underlay-nav__overlay">
      <div class="underlay-nav__dark"></div>
      <div class="underlay-nav__borders">
        <div class="underlay-nav__border-row">
          <div class="underlay-nav__border"></div>
          <div class="underlay-nav__corner"></div>
        </div>
        <div class="underlay-nav__border-row">
          <div class="underlay-nav__corner is--bottom"></div>
          <div class="underlay-nav__border"></div>
        </div>
      </div>
    </div>
  </div>
`;
  // On the homepage "Case studies" scrolls to its section; everywhere else it opens the archive
  var onHome = /(^|\/)(index\.html)?$/.test(location.pathname);
  if (onHome) markup = markup.replace('href="case-studies.html"', 'href="index.html#work"');
  document.write(markup);
})();
