/* ==========================================================================
   Abdullah.exe — shared behaviour
   Custom cursor, scroll reveal, progress bar, boot sequence, page-transition
   curtain, certificate rail, mobile menu, skill bars.
   Every block is defensive: if its markup isn't on the page, it does nothing.
   ========================================================================== */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ----------------------------------------------------------------------
       Custom Cursor
       ---------------------------------------------------------------------- */
    function initCursor() {
        var cursor = document.getElementById('cursor');
        if (!cursor) return;

        // No pointer to replace on touch devices.
        if (window.matchMedia('(hover: none)').matches) return;

        document.addEventListener('mousemove', function (e) {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
            cursor.style.transform = 'translate(-50%, -50%)';
        });

        var hoverElements = document.querySelectorAll('.cursor-hover, a, button, input, textarea');
        hoverElements.forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                cursor.style.width = '60px';
                cursor.style.height = '60px';
                cursor.style.backgroundColor = '#FBFF48'; // Neo Yellow
                cursor.style.mixBlendMode = 'normal';
                cursor.style.border = '2px solid black';
            });
            el.addEventListener('mouseleave', function () {
                cursor.style.width = '24px';
                cursor.style.height = '24px';
                cursor.style.backgroundColor = '#fff';
                cursor.style.mixBlendMode = 'difference';
                cursor.style.border = 'none';
            });
        });
    }

    /* ----------------------------------------------------------------------
       Scroll Reveal
       ---------------------------------------------------------------------- */
    function initReveal() {
        var revealElements = document.querySelectorAll('.reveal');
        if (!revealElements.length) return;

        if (reduceMotion || !('IntersectionObserver' in window)) {
            revealElements.forEach(function (el) { el.classList.add('active'); });
            return;
        }

        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        revealElements.forEach(function (el) { revealObserver.observe(el); });
    }

    /* ----------------------------------------------------------------------
       Scroll Progress Bar
       ---------------------------------------------------------------------- */
    function initProgressBar() {
        var bar = document.getElementById('progressBar');
        if (!bar) return;

        function update() {
            var winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            var scrolled = height > 0 ? (winScroll / height) * 100 : 0;
            bar.style.width = scrolled + '%';
        }

        window.addEventListener('scroll', update, { passive: true });
        update();
    }

    /* ----------------------------------------------------------------------
       Skill proficiency bars — fill when they scroll into view
       ---------------------------------------------------------------------- */
    function initSkillBars() {
        var bars = document.querySelectorAll('.skill-bar-fill');
        if (!bars.length) return;

        function fill(bar) {
            bar.style.width = (bar.dataset.level || '0') + '%';
        }

        if (reduceMotion || !('IntersectionObserver' in window)) {
            bars.forEach(fill);
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    fill(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });

        bars.forEach(function (bar) { observer.observe(bar); });
    }

    /* ----------------------------------------------------------------------
       Mobile menu
       ---------------------------------------------------------------------- */
    function initMobileMenu() {
        var toggle = document.getElementById('menu-toggle');
        var menu = document.getElementById('mobile-menu');
        if (!toggle || !menu) return;

        toggle.addEventListener('click', function () {
            var open = menu.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            var icon = toggle.querySelector('i');
            if (icon) icon.className = open ? 'ri-close-line text-2xl' : 'ri-menu-line text-2xl';
        });
    }

    /* ----------------------------------------------------------------------
       BOOT SEQUENCE (index.html)
       The inline head script decides whether this runs; by the time we get
       here the .boot-active class is already on <html> or it isn't.
       ---------------------------------------------------------------------- */
    function initBootSequence(done) {
        var preloader = document.getElementById('preloader');

        if (!preloader || reduceMotion || !document.documentElement.classList.contains('boot-active')) {
            document.documentElement.classList.remove('boot-active');
            done(false);
            return;
        }

        var fill = document.getElementById('boot-bar-fill');
        var counter = document.getElementById('boot-counter');
        var progress = 0;
        var finished = false;

        document.body.style.overflow = 'hidden';

        function finish() {
            if (finished) return;
            finished = true;

            preloader.classList.add('booted');
            document.body.style.overflow = '';

            // Drop it from the flow once it has swept off-screen.
            window.setTimeout(function () {
                document.documentElement.classList.remove('boot-active');
                if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
            }, 900);

            done(true);
        }

        // Tick the loading bar in uneven jumps so it reads like a real load.
        var timer = window.setInterval(function () {
            progress += Math.random() * 18 + 6;
            if (progress >= 100) {
                progress = 100;
                window.clearInterval(timer);
                window.setTimeout(finish, 420);
            }
            if (fill) fill.style.width = progress + '%';
            if (counter) counter.textContent = String(Math.floor(progress)).padStart(3, '0') + '%';
        }, 160);

        // Safety net: never leave a visitor staring at a black screen.
        window.setTimeout(function () {
            window.clearInterval(timer);
            finish();
        }, 6000);
    }

    /* ----------------------------------------------------------------------
       PAGE TRANSITION CURTAIN
       ---------------------------------------------------------------------- */
    var COVER_MS = 600;   // curtain fills bottom -> top
    var HOLD_MS = 260;    // fully covered, before the page swaps

    function initPageTransitions(skipArrival) {
        var curtain = document.getElementById('page-transition');

        // Arrival: the curtain rendered already down, now sweep it up and away.
        if (curtain && !reduceMotion && !skipArrival &&
            document.documentElement.classList.contains('transition-page')) {
            // Next frame, so the browser paints the covered state first.
            window.requestAnimationFrame(function () {
                window.requestAnimationFrame(function () {
                    curtain.classList.add('is-leaving');
                });
            });
        }

        if (reduceMotion) return;

        // Departure: intercept internal page links.
        document.addEventListener('click', function (e) {
            if (e.defaultPrevented || e.button !== 0) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            var link = e.target.closest ? e.target.closest('a') : null;
            if (!link) return;

            var href = link.getAttribute('href');
            if (!href) return;

            // Leave anchors, downloads, new tabs and external schemes alone.
            if (href.charAt(0) === '#') return;
            if (link.hasAttribute('download')) return;
            if (link.target && link.target !== '_self') return;
            if (/^(mailto:|tel:|javascript:)/i.test(href)) return;

            var url;
            try {
                url = new URL(href, window.location.href);
            } catch (err) {
                return;
            }

            if (url.origin !== window.location.origin) return;
            // Same page, different hash — let the browser scroll.
            if (url.pathname === window.location.pathname && url.hash) return;

            e.preventDefault();

            if (!curtain) {
                window.location.href = url.href;
                return;
            }

            curtain.classList.remove('is-leaving');
            curtain.classList.add('is-covering');

            // Swap the page only once the curtain has fully covered it.
            window.setTimeout(function () {
                window.location.href = url.href;
            }, COVER_MS + HOLD_MS);
        });

        // Coming back via the bfcache with the curtain mid-animation.
        window.addEventListener('pageshow', function (e) {
            if (e.persisted && curtain) {
                curtain.classList.remove('is-covering');
                curtain.classList.add('is-leaving');
            }
        });
    }

    /* ----------------------------------------------------------------------
       CERTIFICATE RAIL — drag to scroll, arrows, dots
       ---------------------------------------------------------------------- */
    function initCertRail() {
        var rail = document.querySelector('.cert-rail');
        if (!rail) return;

        var cards = rail.querySelectorAll('.cert-card');
        if (!cards.length) return;

        /* --- drag to scroll --- */
        var isDown = false;
        var startX = 0;
        var startScroll = 0;
        var moved = 0;

        rail.addEventListener('pointerdown', function (e) {
            // Ignore right/middle click.
            if (e.button !== 0) return;
            isDown = true;
            moved = 0;
            startX = e.clientX;
            startScroll = rail.scrollLeft;
        });

        rail.addEventListener('pointermove', function (e) {
            if (!isDown) return;
            var dx = e.clientX - startX;
            if (Math.abs(dx) > 5 && !rail.classList.contains('is-dragging')) {
                rail.classList.add('is-dragging');
                rail.setPointerCapture(e.pointerId);
            }
            if (!rail.classList.contains('is-dragging')) return;
            moved = Math.abs(dx);
            rail.scrollLeft = startScroll - dx;
        });

        function release(e) {
            if (!isDown) return;
            isDown = false;
            if (rail.hasPointerCapture && e.pointerId !== undefined) {
                try { rail.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
            }
            // Drop the dragging class a tick late so the click it would have
            // fired gets swallowed by the pointer-events rule.
            window.setTimeout(function () {
                rail.classList.remove('is-dragging');
            }, moved > 5 ? 50 : 0);
        }

        rail.addEventListener('pointerup', release);
        rail.addEventListener('pointercancel', release);
        rail.addEventListener('pointerleave', release);

        // A genuine drag should never follow a link.
        rail.addEventListener('click', function (e) {
            if (moved > 5) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);

        /* --- arrow buttons --- */
        function step() {
            var card = rail.querySelector('.cert-card');
            if (!card) return rail.clientWidth;
            var styles = window.getComputedStyle(rail);
            return card.offsetWidth + (parseInt(styles.columnGap || styles.gap, 10) || 32);
        }

        var prev = document.getElementById('cert-prev');
        var next = document.getElementById('cert-next');
        if (prev) prev.addEventListener('click', function () { rail.scrollBy({ left: -step(), behavior: 'smooth' }); });
        if (next) next.addEventListener('click', function () { rail.scrollBy({ left: step(), behavior: 'smooth' }); });

        /* --- dots --- */
        var dotWrap = document.getElementById('cert-dots');
        var dots = [];
        if (dotWrap) {
            cards.forEach(function (card, i) {
                var dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'cert-dot w-3 h-3 border-2 border-white/40 bg-white/10 cursor-hover';
                dot.setAttribute('aria-label', 'Go to certificate ' + (i + 1));
                dot.addEventListener('click', function () {
                    rail.scrollTo({ left: card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' });
                });
                dotWrap.appendChild(dot);
                dots.push(dot);
            });
        }

        function syncDots() {
            if (!dots.length) return;
            var center = rail.scrollLeft + rail.clientWidth / 2;
            var best = 0;
            var bestDist = Infinity;
            cards.forEach(function (card, i) {
                var dist = Math.abs((card.offsetLeft + card.offsetWidth / 2) - center);
                if (dist < bestDist) { bestDist = dist; best = i; }
            });
            dots.forEach(function (dot, i) { dot.classList.toggle('is-active', i === best); });
        }

        rail.addEventListener('scroll', syncDots, { passive: true });
        syncDots();

        /* --- keyboard --- */
        rail.setAttribute('tabindex', '0');
        rail.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') { e.preventDefault(); rail.scrollBy({ left: step(), behavior: 'smooth' }); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); rail.scrollBy({ left: -step(), behavior: 'smooth' }); }
        });
    }

    /* ----------------------------------------------------------------------
       Project filter chips (work.html)
       ---------------------------------------------------------------------- */
    function initProjectFilter() {
        var chips = document.querySelectorAll('.filter-chip');
        var cards = document.querySelectorAll('[data-stack]');
        if (!chips.length || !cards.length) return;

        var ON = ['bg-neo-black', 'text-white'];
        var OFF = ['bg-white', 'text-black'];

        function paint(active) {
            chips.forEach(function (chip) {
                var on = chip === active;
                chip.setAttribute('aria-pressed', on ? 'true' : 'false');
                ON.forEach(function (c) { chip.classList.toggle(c, on); });
                OFF.forEach(function (c) { chip.classList.toggle(c, !on); });
            });
        }

        chips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                var want = chip.dataset.filter;
                cards.forEach(function (card) {
                    var show = want === 'all' || (card.dataset.stack || '').split(' ').indexOf(want) !== -1;
                    card.style.display = show ? '' : 'none';
                });
                paint(chip);
            });
        });
    }

    /* ----------------------------------------------------------------------
       Boot
       ---------------------------------------------------------------------- */
    function start() {
        initCursor();
        initReveal();
        initProgressBar();
        initSkillBars();
        initMobileMenu();
        initCertRail();
        initProjectFilter();

        // The boot sequence owns the screen on the home page; when it runs we
        // skip the curtain's arrival sweep so the two don't stack.
        initBootSequence(function (bootRan) {
            initPageTransitions(bootRan);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
