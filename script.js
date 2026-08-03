(function () {
  'use strict';

  const body = document.body;
  const header = document.getElementById('siteHeader');
  const menuToggle = document.getElementById('menuToggle');
  const navPanel = document.getElementById('navPanel');
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const sections = Array.from(document.querySelectorAll('main section[id]'));

  function renderGlyphWords() {
    document.querySelectorAll('[data-glyph-word]').forEach(function (word) {
      const fragment = document.createDocumentFragment();
      Array.from(word.dataset.glyphWord.toUpperCase()).forEach(function (character) {
        if (character === ' ') {
          const space = document.createElement('span');
          space.className = 'glyph-space';
          fragment.appendChild(space);
          return;
        }
        const image = document.createElement('img');
        image.src = 'img/glyphs/' + character + '.png';
        image.alt = '';
        image.setAttribute('aria-hidden', 'true');
        fragment.appendChild(image);
      });
      word.replaceChildren(fragment);
    });
  }

  renderGlyphWords();

  function updateHeader() {
    header.classList.toggle('is-scrolled', window.scrollY > 30);
  }

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  function setMenu(open) {
    menuToggle.classList.toggle('is-open', open);
    navPanel.classList.toggle('is-open', open);
    body.classList.toggle('nav-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
  }

  menuToggle.addEventListener('click', function () {
    setMenu(!navPanel.classList.contains('is-open'));
  });

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      setMenu(false);
    });
  });

  const activeObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      navLinks.forEach(function (link) {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
      });
    });
  }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });

  sections.forEach(function (section) {
    activeObserver.observe(section);
  });

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (event) {
      const selector = anchor.getAttribute('href');
      const target = document.querySelector(selector);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', selector);
    });
  });

  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  if (contactForm && formStatus) {
    contactForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      const endpoint = contactForm.dataset.endpoint.trim() || '/api/contact';

      const submitButton = contactForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      formStatus.textContent = '发送中……';

      try {
        const payload = Object.fromEntries(new FormData(contactForm).entries());
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Request failed');
        contactForm.reset();
        formStatus.textContent = '已发送，乐队会尽快回复。';
      } catch (error) {
        formStatus.textContent = '发送失败，请直接邮件联系 fallingmoonband@163.com。';
      } finally {
        submitButton.disabled = false;
      }
    });
  }
})();
