document.addEventListener('DOMContentLoaded', () => {
  // 0. Cool Page Transition Logic
  const overlay = document.createElement('div');
  overlay.className = 'page-transition-overlay';
  document.body.appendChild(overlay);

  let cols, rows, maxDelayIn;

  const initGrid = (isResize = false) => {
    if (isResize) overlay.classList.add('no-transition');
    overlay.innerHTML = '';
    const blockSize = window.innerWidth < 768 ? 60 : 80;
    cols = Math.ceil((window.innerWidth * 1.1) / blockSize);
    rows = Math.ceil((window.innerHeight * 1.2) / blockSize);
    const total = cols * rows;

    overlay.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    overlay.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    const fragment = document.createDocumentFragment();
    maxDelayIn = 0;
    for(let i=0; i<total; i++){
      const block = document.createElement('div');
      block.className = 'pt-block';
      const row = Math.floor(i / cols);
      const dIn = (row * 0.008) + (Math.random() * 0.08);
      const dOut = ((rows - row) * 0.008) + (Math.random() * 0.08);
      block.style.setProperty('--d-in', `${dIn}s`);
      block.style.setProperty('--d-out', `${dOut}s`);
      if (dIn > maxDelayIn) maxDelayIn = dIn;
      fragment.appendChild(block);
    }
    overlay.appendChild(fragment);

    if (isResize) {
        void overlay.offsetWidth;
        requestAnimationFrame(() => {
            overlay.classList.remove('no-transition');
        });
    }
  };

  initGrid();

  let resizeTimer;
  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;
  window.addEventListener('resize', () => {
      if (Math.abs(window.innerWidth - lastWidth) > 50 || Math.abs(window.innerHeight - lastHeight) > 50) {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
              lastWidth = window.innerWidth;
              lastHeight = window.innerHeight;
              if (document.body.classList.contains('pt-ready')) {
                  initGrid(true);
              }
          }, 200);
      }
  });

  const playSecondHalf = (callback) => {
    overlay.classList.remove('loaded', 'prepare-leave', 'leaving');
    overlay.classList.add('arrive');

    requestAnimationFrame(() => {
      void overlay.offsetWidth;
      overlay.classList.remove('arrive');
      document.body.classList.add('pt-ready');
      overlay.classList.add('loaded');
      if (callback) setTimeout(callback, (maxDelayIn * 1000) + 450);
    });
  };

  const playFirstHalf = (callback) => {
    overlay.classList.remove('loaded', 'arrive');
    overlay.classList.add('prepare-leave');

    void overlay.offsetWidth;

    overlay.classList.remove('prepare-leave');
    overlay.classList.add('leaving');

    if (callback) setTimeout(callback, (maxDelayIn * 1000) + 450);
  };

  const playFullAnimation = () => {
    overlay.classList.remove('loaded', 'leaving', 'arrive');
    overlay.classList.add('prepare-leave');

    requestAnimationFrame(() => {
      void overlay.offsetWidth;
      overlay.classList.remove('prepare-leave');
      overlay.classList.add('leaving');

      setTimeout(() => {
        requestAnimationFrame(() => {
            document.body.classList.add('pt-ready');
            overlay.classList.remove('leaving');
            overlay.classList.add('loaded');
        });
      }, (maxDelayIn * 1000) + 450);
    });
  };

  // Initial load animation
  const isNavigating = sessionStorage.getItem('pt-navigating') === 'true';
  sessionStorage.removeItem('pt-navigating');

  if (isNavigating) {
    playSecondHalf();
  } else {
    playFullAnimation();
  }

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      document.body.classList.remove('pt-ready');
      playFullAnimation();
    }
  });

  // PJAX Navigation logic
  let isAnimating = false;

  const loadPage = async (url, isPopState = false) => {
    if (isAnimating) {
        if (isPopState) window.location.href = url; // Fallback to native if clicking history too fast
        return;
    }
    isAnimating = true;

    // Start fetching immediately to save time
    const fetchPromise = fetch(url).then(res => res.text()).catch(err => null);

    playFirstHalf(async () => {
      try {
        const html = await fetchPromise;
        if (!html) throw new Error('Fetch failed');

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        document.title = doc.title;

        // Remove old scripts from parsed doc
        doc.querySelectorAll('script').forEach(s => s.remove());

        // Extract body classes
        document.body.className = doc.body.className;
        document.body.classList.add('pt-ready');

        // Replace body content without removing overlay, aurora, and ambient glow
        const keepElements = [overlay];
        const ambientGlow = document.querySelector('.ambient-glow');
        if (ambientGlow) keepElements.push(ambientGlow);
        const auroraBg = document.querySelector('.aurora-bg');
        if (auroraBg) keepElements.push(auroraBg);

        Array.from(document.body.childNodes).forEach(node => {
            if (!keepElements.includes(node) && node.nodeName !== 'SCRIPT') {
                node.remove();
            }
        });

        Array.from(doc.body.childNodes).forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.classList.contains('page-transition-overlay') ||
                    node.classList.contains('ambient-glow') ||
                    node.classList.contains('aurora-bg')) {
                    return;
                }
            }
            if (node.nodeName !== 'SCRIPT') {
                document.body.insertBefore(node, overlay);
            }
        });

        if (!isPopState) {
          history.pushState(null, '', url);
        }

        // Re-initialize page scripts
        initPage();
        initDynamicPageScripts();

        // Scroll to top
        window.scrollTo(0, 0);

      } catch (err) {
        console.error('PJAX Error:', err);
        if (window.location.protocol === 'file:') {
          console.warn("由于您直接双击打开了HTML文件 (file://)，浏览器的安全策略阻止了无刷新加载。已降级为原生多页跳转（会闪烁）。请使用 Live Server 插件打开以体验完美的无刷新过渡。");
        }
        sessionStorage.setItem('pt-navigating', 'true');
        window.location.href = url; // fallback
        return; // don't play second half here, let the new page do it
      }

      playSecondHalf(() => {
        isAnimating = false;
      });
    });
  };

  window.addEventListener('popstate', () => {
    loadPage(location.href, true);
  });

  const bindLinks = () => {
    document.querySelectorAll('a').forEach(link => {
      if (link.dataset.pjaxBound) return;
      link.dataset.pjaxBound = 'true';

      link.addEventListener('click', (e) => {
        const target = link.getAttribute('href');

        // Ignore mailto, tel, empty, or hash links
        if (!target || target.startsWith('#') || target.startsWith('mailto:') || target.startsWith('tel:')) return;
        if (link.target === '_blank') return;

        try {
          const urlObj = new URL(link.href);
          if (urlObj.origin !== window.location.origin) return; // External link

          e.preventDefault();

          const currentPath = window.location.pathname.split('/').pop() || 'index.html';
          const targetPath = urlObj.pathname.split('/').pop() || 'index.html';

          if (targetPath === currentPath) {
             window.scrollTo({ top: 0, behavior: 'smooth' });
             return;
          }

          const menuToggle = document.getElementById('menu-toggle');
          const fullscreenMenu = document.getElementById('fullscreen-menu');
          if (menuToggle && menuToggle.classList.contains('active')) {
             menuToggle.classList.remove('active');
             if(fullscreenMenu) fullscreenMenu.classList.remove('is-open');
             document.body.classList.remove('no-scroll');
          }

          loadPage(link.href);
        } catch (err) {
          // In case URL parsing fails
        }
      });
    });
  };

  const initDynamicPageScripts = () => {
    if (!document.getElementById('status-card-body')) return;

    if (typeof window.initStatusPage === 'function') {
      window.initStatusPage();
      return;
    }

    const existingScript = document.querySelector('script[data-dynamic-script="status"]');
    if (existingScript) return;

    const script = document.createElement('script');
        script.src = 'assets/js/status.js?v=260726-classic1';
    script.defer = true;
    script.dataset.dynamicScript = 'status';
    document.head.appendChild(script);
  };

  const initPage = () => {
    // 1. Aurora Background
    if (!document.querySelector('.aurora-bg')) {
        const bg = document.createElement('div');
        bg.className = 'aurora-bg';
        document.body.prepend(bg);
    }

    // 2. Wrap existing elements
    const cards = document.querySelectorAll('.card, .info-card, .leadership-card, .gallery-item, .news-item');
    cards.forEach(card => {
      if (!card.classList.contains('glass-panel')) {
        card.classList.add('glass-panel');
      }
      const img = card.querySelector('img');
      if (img && card.classList.contains('gallery-item') && !card.querySelector('.img-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'img-wrapper';
        card.insertBefore(wrapper, img);
        wrapper.appendChild(img);
      }
    });

    // 3. Advanced 3D Tilt
    const isTouchDeviceLocal = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    cards.forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        if (!isTouchDeviceLocal) {
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = ((y - centerY) / centerY) * -4;
          const rotateY = ((x - centerX) / centerX) * 4;
          card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        }
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        setTimeout(() => {
          card.style.setProperty('--mouse-x', `-1000px`);
          card.style.setProperty('--mouse-y', `-1000px`);
        }, 500);
      });
    });

    // Ambient glow setup
    const isTouchDeviceGlobal = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDeviceGlobal && !document.querySelector('.ambient-glow')) {
      const ambientGlow = document.createElement('div');
      ambientGlow.className = 'ambient-glow';
      document.body.appendChild(ambientGlow);
    }

    // 5. Mobile Menu
    const menuToggle = document.getElementById('menu-toggle');
    const fullscreenMenu = document.getElementById('fullscreen-menu');
    if (menuToggle && fullscreenMenu) {
      const menuLinks = fullscreenMenu.querySelectorAll('a');
      menuToggle.addEventListener('click', () => {
        const isActive = menuToggle.classList.toggle('active');
        fullscreenMenu.classList.toggle('is-open');
        document.body.classList.toggle('no-scroll');
        if (isActive) {
          menuLinks.forEach((link, index) => {
            link.style.transitionDelay = `${0.1 + index * 0.05}s`;
          });
        } else {
          menuLinks.forEach(link => { link.style.transitionDelay = '0s'; });
        }
      });
    }

    // 6. Reveal
    const elementsToAddClass = document.querySelectorAll('.card, .leadership-card, .gallery-item, .news-item');
    elementsToAddClass.forEach(el => el.classList.add('reveal-up'));
    const allRevealUps = document.querySelectorAll('.reveal-up');
    if (allRevealUps.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
      allRevealUps.forEach(el => io.observe(el));
    }

    // 7. Hero Carousel
    const carousel = document.getElementById('heroCarousel');
    if (carousel) {
      const slides = Array.from(carousel.querySelectorAll('.slide'));
      const prevBtn = carousel.querySelector('.carousel-prev');
      const nextBtn = carousel.querySelector('.carousel-next');
      if (slides.length > 1) {
        let index = 0;
        let timer = null;
        let isAnimatingSlide = false;

        slides.forEach((s, i) => {
          s.classList.remove('active', 'outgoing', 'enter-next', 'enter-prev');
          s.style.opacity = i === 0 ? 1 : 0;
          s.style.zIndex = i === 0 ? 10 : 0;
          s.style.clipPath = 'inset(0 0 0 0)';
          s.style.transition = 'none';
          if(i === 0) s.classList.add('active');
        });

        const moveTo = (newIndex, direction) => {
          if (isAnimatingSlide) return;
          const targetIndex = (newIndex + slides.length) % slides.length;
          if (targetIndex === index) return;

          isAnimatingSlide = true;
          const currentSlide = slides[index];
          const targetSlide = slides[targetIndex];

          targetSlide.style.transition = 'none';
          targetSlide.style.opacity = 1;
          targetSlide.style.zIndex = 20;
          targetSlide.style.clipPath = direction === 'next' ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';
          targetSlide.classList.add('active');

          currentSlide.style.zIndex = 10;

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              targetSlide.style.transition = 'clip-path 0.4s cubic-bezier(0.77, 0, 0.175, 1)';
              targetSlide.style.clipPath = 'inset(0 0 0 0)';

              setTimeout(() => {
                currentSlide.style.opacity = 0;
                currentSlide.style.transition = 'none';
                currentSlide.classList.remove('active');
                targetSlide.style.zIndex = 10;
                isAnimatingSlide = false;
                index = targetIndex;
              }, 2000);
            });
          });
        };

        const next = () => { if (!document.body.contains(carousel)) { clearInterval(timer); return; } moveTo(index + 1, 'next'); };
        const prev = () => { if (!document.body.contains(carousel)) { clearInterval(timer); return; } moveTo(index - 1, 'prev'); };
        const startAuto = () => {
          clearInterval(timer);
          if (!document.body.contains(carousel)) return;
          timer = setInterval(next, 1000);
        };

        if(nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); next(); startAuto(); });
        if(prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); prev(); startAuto(); });

        let startX = 0;
        carousel.addEventListener('touchstart', e => { startX = e.touches[0].clientX; clearInterval(timer); }, {passive: true});
        carousel.addEventListener('touchend', e => {
          const dx = e.changedTouches[0].clientX - startX;
          if(dx < -50) next(); else if(dx > 50) prev();
          startAuto();
        });
        startAuto();
      }
    }

    // 8. Parallax
    const heroSection = document.querySelector('.hero-section');
    if (heroSection && !heroSection.querySelector('.hero-particle')) {
      for(let i=0; i<15; i++) {
        const p = document.createElement('div');
        p.className = 'hero-particle';
        const size = Math.random() * 5 + 2;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `${Math.random() * 100}%`;
        p.style.top = `${Math.random() * 100}%`;
        p.style.animationDuration = `${Math.random() * 15 + 8}s`;
        p.style.animationDelay = `${Math.random() * 5}s`;
        heroSection.appendChild(p);
      }
    }

    // 9. Mask Reveal
    const maskEls = document.querySelectorAll('.mask-reveal-el');
    if (maskEls.length) {
      const ioMask = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            ioMask.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3, rootMargin: '0px 0px -50px 0px' });
      maskEls.forEach(el => ioMask.observe(el));
    }

    // Bind Links
    bindLinks();
  };

  // Run initialization for the first time
  initPage();
  initDynamicPageScripts();

  // Dynamic Window Events (Bound once)
  window.addEventListener('scroll', () => {
    const header = document.getElementById('main-header');
    if (header) {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    const heroText = document.querySelector('.hero-text');
    if (heroText && !('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
        const y = window.scrollY;
        heroText.style.transform = `translate(-50%, calc(-50% + ${y * 0.35}px))`;
        heroText.style.opacity = 1 - (y / 600);
    }
  }, { passive: true });

  window.addEventListener('mousemove', e => {
    const ambientGlow = document.querySelector('.ambient-glow');
    if (ambientGlow) {
      ambientGlow.style.transform = `translate(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%))`;
    }
  });

});
