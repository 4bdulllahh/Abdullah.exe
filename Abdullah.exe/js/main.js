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

            // After an arrival sweep the curtain is parked above the screen.
            // Snap it below the screen first (no transition) so it always
            // fills bottom -> top, never drops down from the top.
            curtain.classList.remove('is-leaving');
            curtain.style.transition = 'none';
            curtain.style.transform = 'translateY(100%)';
            void curtain.offsetHeight; // commit the snapped position
            curtain.style.transition = '';
            curtain.style.transform = '';
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
       CERTIFICATE RAIL — auto-rolls right to left, loops seamlessly, and
       still takes mouse drag, touch flick, trackpad, arrows, dots and keys.
       ---------------------------------------------------------------------- */
    function initCertRail() {
        var rail = document.querySelector('.cert-rail');
        if (!rail) return;

        var originals = Array.prototype.slice.call(rail.querySelectorAll('.cert-card'));
        var n = originals.length;
        if (!n) return;

        var SPEED = 45;          // px per second of auto-roll
        var RESUME_AFTER = 2500; // ms of quiet after an interaction before rolling again

        /* --- seamless loop -------------------------------------------------
           Append two cloned sets so the track reads [A][B][C], all identical.
           We keep the scroll position inside the middle band and jump by
           exactly one set width whenever it drifts out. Because the sets are
           identical, the jump is invisible - and it works in both directions,
           so dragging backwards never hits a wall. */
        for (var k = 0; k < 2; k++) {
            originals.forEach(function (card) {
                var clone = card.cloneNode(true);
                clone.setAttribute('aria-hidden', 'true');
                clone.querySelectorAll('a, button').forEach(function (el) { el.setAttribute('tabindex', '-1'); });
                rail.appendChild(clone);
            });
        }
        var cards = rail.querySelectorAll('.cert-card');

        var loop = 0;            // width of one set, in px
        var pos = 0;             // our own float copy of scrollLeft (the DOM value may round)
        var startScroll = 0;     // drag origin, shifted along with any wrap

        function measure() {
            loop = cards[n].offsetLeft - cards[0].offsetLeft;
        }

        function normalize() {
            if (!loop) return;
            var shift = 0;
            if (pos >= loop * 1.5) shift = -loop;
            else if (pos < loop * 0.5) shift = loop;
            if (shift) {
                pos += shift;
                startScroll += shift;
                rail.scrollLeft = pos;
            }
        }

        measure();
        pos = loop;
        rail.scrollLeft = pos;

        window.addEventListener('resize', function () {
            measure();
            normalize();
        });

        /* --- pause state ----------------------------------------------------- */
        var hovering = false;
        var dragging = false;
        var touching = false;
        var focused = false;
        var onScreen = true;
        var resumeAt = 0;

        function nudge(ms) {
            resumeAt = performance.now() + (ms || RESUME_AFTER);
        }

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                onScreen = entries[0].isIntersecting;
            }).observe(rail);
        }

        /* --- mouse / pen drag ----------------------------------------------
           Touch is left to the browser so phones keep native momentum
           flicking; we only pause the roll while a finger is down. */
        var isDown = false;
        var startX = 0;
        var moved = 0;

        rail.addEventListener('pointerenter', function (e) {
            if (e.pointerType === 'mouse') hovering = true;
        });
        rail.addEventListener('pointerleave', function (e) {
            if (e.pointerType === 'mouse') {
                hovering = false;
                nudge(800);
            }
        });

        rail.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'touch') {
                touching = true;
                return;
            }
            if (e.button !== 0) return;
            isDown = true;
            moved = 0;
            startX = e.clientX;
            startScroll = rail.scrollLeft;
            pos = startScroll;
        });

        rail.addEventListener('pointermove', function (e) {
            if (!isDown) return;
            // Button already up (released outside the window and the pointerup
            // never reached us) - end the drag rather than follow the mouse.
            if (e.buttons === 0) {
                release(e);
                return;
            }
            var dx = e.clientX - startX;
            if (!dragging && Math.abs(dx) > 5) {
                dragging = true;
                rail.classList.add('is-dragging');
                try { rail.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            }
            if (!dragging) return;
            moved = Math.abs(dx);
            pos = startScroll - dx;
            normalize();
            rail.scrollLeft = pos;
        });

        function release(e) {
            if (e.pointerType === 'touch') {
                touching = false;
                nudge();
                return;
            }
            if (!isDown) return;
            isDown = false;
            if (dragging) {
                try { rail.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
                nudge();
            }
            // Drop the flag a tick late so the click that follows a drag is
            // still swallowed below.
            window.setTimeout(function () {
                dragging = false;
                rail.classList.remove('is-dragging');
            }, 0);
        }

        rail.addEventListener('pointerup', release);
        rail.addEventListener('pointercancel', release);
        // Alt-tabbing away mid-drag shouldn't leave the rail stuck either.
        window.addEventListener('blur', function () {
            if (isDown) release({ pointerType: 'mouse' });
            touching = false;
            hovering = false;
        });

        // A genuine drag should never also count as a click.
        rail.addEventListener('click', function (e) {
            if (moved > 5) {
                e.preventDefault();
                e.stopPropagation();
                moved = 0;
            }
        }, true);

        // Trackpad swipes and shift+wheel scroll the rail natively; just pause.
        rail.addEventListener('wheel', function () { nudge(); }, { passive: true });

        // Only keyboard focus pauses the roll. A mouse drag also focuses the
        // rail (it's tabbable), and that must not freeze it until the next click.
        rail.addEventListener('focusin', function () {
            try { focused = rail.matches(':focus-visible'); } catch (err) { focused = false; }
        });
        rail.addEventListener('focusout', function () { focused = false; nudge(800); });

        // Anything that scrolled the rail other than our own writes (native
        // touch/trackpad scrolling, smooth arrow scrolls) becomes the new truth.
        rail.addEventListener('scroll', function () {
            if (Math.abs(rail.scrollLeft - pos) > 2) pos = rail.scrollLeft;
            syncDots();
        }, { passive: true });

        /* --- arrow buttons ------------------------------------------------- */
        function step() {
            return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : rail.clientWidth;
        }

        function glide(delta) {
            normalize();
            nudge(3000);
            rail.scrollBy({ left: delta, behavior: 'smooth' });
        }

        var prev = document.getElementById('cert-prev');
        var next = document.getElementById('cert-next');
        if (prev) prev.addEventListener('click', function () { glide(-step()); });
        if (next) next.addEventListener('click', function () { glide(step()); });

        /* --- dots: one per real certificate -------------------------------- */
        var dotWrap = document.getElementById('cert-dots');
        var dots = [];

        function centreOf(card) {
            return card.offsetLeft + card.offsetWidth / 2 - rail.clientWidth / 2;
        }

        if (dotWrap) {
            originals.forEach(function (card, i) {
                var dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'cert-dot w-3 h-3 border-2 border-white/40 bg-white/10 cursor-hover';
                dot.setAttribute('aria-label', 'Go to certificate ' + (i + 1));
                dot.addEventListener('click', function () {
                    // Of the three copies of this certificate, go to the nearest.
                    var best = null;
                    for (var c = 0; c < 3; c++) {
                        var target = centreOf(cards[i + c * n]);
                        if (best === null || Math.abs(target - pos) < Math.abs(best - pos)) best = target;
                    }
                    nudge(3000);
                    rail.scrollTo({ left: best, behavior: 'smooth' });
                });
                dotWrap.appendChild(dot);
                dots.push(dot);
            });
        }

        function syncDots() {
            if (!dots.length) return;
            var centre = rail.scrollLeft + rail.clientWidth / 2;
            var best = 0;
            var bestDist = Infinity;
            for (var i = 0; i < cards.length; i++) {
                var dist = Math.abs((cards[i].offsetLeft + cards[i].offsetWidth / 2) - centre);
                if (dist < bestDist) { bestDist = dist; best = i; }
            }
            var active = best % n;
            dots.forEach(function (dot, i) { dot.classList.toggle('is-active', i === active); });
        }

        syncDots();

        /* --- keyboard ------------------------------------------------------ */
        rail.setAttribute('tabindex', '0');
        rail.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') { e.preventDefault(); glide(step()); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); glide(-step()); }
        });

        /* --- the roll ------------------------------------------------------ */
        if (reduceMotion) return;

        var last = performance.now();
        function tick(now) {
            // Clamp the frame gap so a backgrounded tab doesn't lurch forward.
            var dt = Math.min(now - last, 50);
            last = now;

            if (onScreen && !hovering && !dragging && !touching && !focused && now >= resumeAt) {
                pos += SPEED * dt / 1000;
                normalize();
                rail.scrollLeft = pos;
            }
            window.requestAnimationFrame(tick);
        }
        window.requestAnimationFrame(tick);
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
