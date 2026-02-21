// Sticky nav: show when hero scrolls out of viewport
(function () {
  var nav = document.getElementById('site-nav');
  var hero = document.querySelector('.hero');

  if (!nav || !hero) return;

  var navObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        nav.classList.remove('visible');
      } else {
        nav.classList.add('visible');
      }
    });
  }, { threshold: 0 });

  navObserver.observe(hero);

  // Smooth scroll for nav links
  nav.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    e.preventDefault();
    var target = document.querySelector(link.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Mobile hamburger menu
  var hamburger = document.querySelector('.nav-hamburger');
  var navLinks = document.querySelector('.nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      navLinks.classList.toggle('active');
    });

    // Close menu on link click
    navLinks.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        navLinks.classList.remove('active');
      }
    });

    // Close menu on click outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.site-nav')) {
        navLinks.classList.remove('active');
      }
    });
  }

  // Scroll fade-in for .fade-in elements
  var fadeObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fade-in').forEach(function (el) {
    // If element is already in viewport (e.g. after scroll restoration on reload),
    // make it visible immediately instead of waiting for an intersection event.
    var rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('visible');
    } else {
      fadeObserver.observe(el);
    }
  });

  // Lazy-load videos via IntersectionObserver
  var videoObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var video = entry.target;
        video.preload = 'auto';
        video.addEventListener('canplaythrough', function () {
          video.play();
        }, { once: true });
        if (video.readyState >= 4) {
          video.play();
        }
        videoObserver.unobserve(video);
      }
    });
  }, { rootMargin: '200px' });

  document.querySelectorAll('video.pub-thumb, video.research-video').forEach(function (v) {
    videoObserver.observe(v);
  });

  // Ensure all external links open in new tabs
  document.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    }
  });
})();
