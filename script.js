// ===================================================
// SHAIDON.CO.ZA — SITE BEHAVIOUR
// ---------------------------------------------------
// Everything that runs in BOTH flat mode and 3D mode lives here:
// navigation, the resume tabs, the portfolio carousel, the mouse
// trail, the typing headline, tilt/magnetic effects, the mode
// switch and the EmailJS contact form.
//
// The two ES modules are kept separate on purpose:
//   skills.js — three.js skill logos, needed in both modes
//   world.js  — the whole 3D world, only injected in 3D mode
// ===================================================


// ===================================================
// 1. BURGER MENU
// The mobile nav slides in and locks the page behind it.
// ===================================================
const menuBtn = document.getElementById('menu-icon');
const navbar = document.querySelector('.navbar');
const navOverlay = document.getElementById('nav-overlay');

const openMenu = () => {
    menuBtn.classList.add('active');
    navbar.classList.add('active');
    navOverlay.classList.add('active');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
};

const closeMenu = () => {
    menuBtn.classList.remove('active');
    navbar.classList.remove('active');
    navOverlay.classList.remove('active');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
};

menuBtn.addEventListener('click', () => {
    menuBtn.classList.contains('active') ? closeMenu() : openMenu();
});

// tapping the dim backdrop closes it too
navOverlay.addEventListener('click', closeMenu);

// never leave the mobile menu open after a resize to desktop
window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMenu();
});


// ===================================================
// 2. SECTION NAVIGATION
// This is a single-page site: every "page" is a <section> and
// only the one carrying .active is shown. In 3D mode world.js
// takes over the same links and flies the camera instead.
// ===================================================
const navLinks = document.querySelectorAll('.navbar a');
const sections = document.querySelectorAll('section');

const showSection = id => {
    sections.forEach(section => {
        section.classList.toggle('active', section.id === id);
    });

    navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href').slice(1) === id);
    });
};

navLinks.forEach(link => {
    link.addEventListener('click', event => {
        event.preventDefault();
        showSection(link.getAttribute('href').slice(1));
        closeMenu(); // close the mobile nav after navigating
    });
});

// any other in-page anchor (Hire Me, footer links, ...) switches section too
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
        const href = link.getAttribute('href');
        if (href.length > 1 && document.getElementById(href.slice(1))) {
            event.preventDefault();
            showSection(href.slice(1));
        }
    });
});

// deep links — shaidon.co.za/#portfolio opens straight on that section
// (world.js reads the same hash to pick its starting station)
const deepLink = location.hash.slice(1);
if (deepLink && document.getElementById(deepLink)) showSection(deepLink);


// ===================================================
// 3. PRELOADER SAFETY NET
// window.load normally clears it; this makes sure a slow CDN can
// never leave the loading screen covering the site.
// ===================================================
setTimeout(() => document.documentElement.classList.add('loaded'), 6000);


// ===================================================
// 4. RESUME TABS
// Education / Experience / Skills / Certificates — the button and
// the panel at the same index are activated together.
// ===================================================
const resumeBtns = document.querySelectorAll('.resume-btn');

resumeBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
        const resumeDetails = document.querySelectorAll('.resume-detail');

        resumeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        resumeDetails.forEach(detail => detail.classList.remove('active'));
        resumeDetails[idx].classList.add('active');
    });
});


// ===================================================
// 5. PORTFOLIO CAROUSEL
// Slides the strip sideways and syncs the description beside it.
// Videos play unmuted, and every other video is stopped first so
// two clips can never talk over each other.
// ===================================================
const arrowRight = document.querySelector('.portfolio-box .navigation .arrow-right');
const arrowLeft = document.querySelector('.portfolio-box .navigation .arrow-left');

let index = 0;

const activePortfolio = () => {
    const imgSlide = document.querySelector('.portfolio-carousel .img-slide');
    const portfolioDetails = document.querySelectorAll('.portfolio-detail');
    const carouselItems = document.querySelectorAll('.portfolio-carousel .img-item');

    imgSlide.style.transform = `translateX(calc(${index * -100}% - ${index * 2}rem))`;

    portfolioDetails.forEach(detail => detail.classList.remove('active'));
    portfolioDetails[index].classList.add('active');

    // rewind and silence everything, then start only the slide in view
    carouselItems.forEach(item => {
        const video = item.querySelector('video');
        if (video) {
            video.pause();
            video.currentTime = 0;
            video.muted = false;
            video.volume = 1;
        }
    });

    const activeVideo = carouselItems[index] && carouselItems[index].querySelector('video');
    if (activeVideo) playWithSound(activeVideo);
};

// Start a clip with sound. Browsers refuse unmuted playback until the visitor
// has interacted with the page, so if that happens we fall back to muted —
// but we say so, instead of silently playing a silent video. world.js calls
// this too, through window.playWithSound.
const soundBadge = document.getElementById('sound-badge');

const playWithSound = video => {
    video.currentTime = 0;
    video.muted = false;
    video.volume = 1;

    video.play()
        .then(() => { if (soundBadge) soundBadge.hidden = true; })
        .catch(() => {
            video.muted = true;
            video.play().catch(() => { });
            if (soundBadge) soundBadge.hidden = false;   // offer the unmute
        });
};

// clicking the badge is a real gesture, so this always succeeds
if (soundBadge) {
    soundBadge.addEventListener('click', () => {
        document.querySelectorAll('.portfolio-carousel video').forEach(video => {
            video.muted = false;
            video.volume = 1;
        });

        const playing = [...document.querySelectorAll('.portfolio-carousel video')]
            .find(video => !video.paused);
        if (playing) playing.play().catch(() => { });

        soundBadge.hidden = true;
    });
}

// world.js runs as a separate module and cannot import from here
window.playWithSound = playWithSound;

// bounds come from the markup, so adding a project needs no code change.
// the position is read back off the DOM because 3D mode can also move the
// carousel (click a slide, drag it sideways) without going through here.
const lastIndex = () => document.querySelectorAll('.portfolio-detail').length - 1;

const currentIndex = () => Math.max(0, [...document.querySelectorAll('.portfolio-detail')]
    .findIndex(detail => detail.classList.contains('active')));

arrowRight.addEventListener('click', () => {
    index = Math.min(currentIndex() + 1, lastIndex());
    activePortfolio();
});

arrowLeft.addEventListener('click', () => {
    index = Math.max(currentIndex() - 1, 0);
    activePortfolio();
});

// grey out an arrow once there is nothing left that way. a MutationObserver
// is used rather than a direct call so the arrows also stay correct when 3D
// mode changes the slide by click or drag.
const portfolioDetails = [...document.querySelectorAll('.portfolio-detail')];

if (arrowLeft && arrowRight && portfolioDetails.length) {
    const syncArrows = () => {
        const active = portfolioDetails.findIndex(d => d.classList.contains('active'));
        arrowLeft.classList.toggle('disabled', active <= 0);
        arrowRight.classList.toggle('disabled', active >= portfolioDetails.length - 1);
    };

    const observer = new MutationObserver(syncArrows);
    portfolioDetails.forEach(d => observer.observe(d, { attributes: true, attributeFilter: ['class'] }));
    syncArrows();
}


// ===================================================
// 6. TYPING HEADLINE
// Types out each job title, pauses, deletes it, moves to the next.
// The word list comes from data-words in the markup.
// ===================================================
const typed = document.querySelector('.typed-text');

if (typed) {
    const words = (typed.dataset.words || '').split(',').map(w => w.trim()).filter(Boolean);
    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const tick = () => {
        const word = words[wordIndex];
        charIndex += deleting ? -1 : 1;
        typed.textContent = word.slice(0, charIndex);

        let delay = deleting ? 45 : 95;

        if (!deleting && charIndex === word.length) {
            deleting = true;
            delay = 1600;          // hold the finished word
        } else if (deleting && charIndex === 0) {
            deleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            delay = 350;           // short beat before the next word
        }

        setTimeout(tick, delay);
    };

    if (words.length) tick();
}


// ===================================================
// 7. CURSOR TILT
// Anything marked [data-tilt] leans towards the pointer. The angle
// is written to CSS custom properties so the stylesheet decides how
// to use it.
// ===================================================
document.querySelectorAll('[data-tilt]').forEach(host => {
    // the portrait tilts its inner box; everything else tilts itself
    const target = host.matches('.home-img') ? host.querySelector('.img-box') : host;
    if (!target) return;

    const strength = host.matches('.home-img') ? 16 : 11;

    host.addEventListener('pointermove', event => {
        const rect = host.getBoundingClientRect();
        const nx = (event.clientX - rect.left) / rect.width - 0.5;   // -0.5 .. 0.5
        const ny = (event.clientY - rect.top) / rect.height - 0.5;

        target.style.setProperty('--ty', `${nx * strength}deg`);
        target.style.setProperty('--tx', `${-ny * strength}deg`);
    });

    host.addEventListener('pointerleave', () => {
        target.style.setProperty('--ty', '0deg');
        target.style.setProperty('--tx', '0deg');
    });
});


// ===================================================
// 8. MAGNETIC BUTTONS
// Buttons drift a little towards the cursor while it is over them.
// ===================================================
document.querySelectorAll('.magnetic').forEach(button => {
    button.addEventListener('pointermove', event => {
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        button.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
    });

    button.addEventListener('pointerleave', () => {
        button.style.transform = '';
    });
});


// ===================================================
// 9. CONTACT FORM POLISH
// Three small things that make the form feel alive: the cursor
// spotlight, the auto-growing message box and the live counter.
// ===================================================
const form = document.getElementById('contact-form');
const message = document.getElementById('message');
const messageCount = document.getElementById('message-count');

// --- cursor spotlight ---
// the pointer position is handed to CSS as percentages; styles.css uses
// them to place a pool of light on the card and to light up the border
// under the cursor. All the rendering is CSS — this only reports where
// the pointer is.
if (form) {
    form.addEventListener('pointermove', event => {
        const rect = form.getBoundingClientRect();
        form.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
        form.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    });

    // park the glow at the top centre so it fades out from a sensible spot
    form.addEventListener('pointerleave', () => {
        form.style.setProperty('--mx', '50%');
        form.style.setProperty('--my', '-20%');
    });
}

// --- auto-growing message box ---
// In 3D the textarea must not scroll — it grows to fit instead, so the
// mouse wheel stays free to fly the camera between sections.
if (message) {
    const limit = Number(message.getAttribute('maxlength')) || 1200;

    const grow = () => {
        message.style.height = 'auto';
        message.style.height = `${Math.min(message.scrollHeight, 320)}px`;
    };

    // --- live character counter ---
    const count = () => {
        if (!messageCount) return;
        const used = message.value.length;
        messageCount.textContent = `${used} / ${limit}`;
        // warn once the visitor is within 10% of the cap
        messageCount.classList.toggle('near-limit', used > limit * 0.9);
    };

    const update = () => { grow(); count(); };

    message.addEventListener('input', update);
    form.addEventListener('reset', () => setTimeout(update));
    count();
}


// ===================================================
// 10. FLAT / 3D MODE SWITCH
// The choice is stored in localStorage and read by the boot script
// in the <head>, so the page loads straight into the right mode.
// ===================================================
const modeToggle = document.getElementById('mode-toggle');

if (modeToggle) {
    const is3d = () => document.documentElement.classList.contains('mode-3d');

    const paint = () => {
        modeToggle.querySelector('.mode-label').textContent = is3d() ? '3D Mode' : 'Flat Mode';
        modeToggle.setAttribute('aria-pressed', String(is3d()));
    };

    paint();

    // no WebGL on this device — there is nothing to switch to
    if (!window.__can3d) {
        modeToggle.disabled = true;
        modeToggle.title = 'This device has no WebGL support';
        modeToggle.style.opacity = '.45';
    }

    modeToggle.addEventListener('click', () => {
        const next = is3d() ? 'flat' : '3d';
        try { localStorage.setItem('shaidon-mode', next); } catch (e) { }

        // ?mode= in the URL outranks localStorage in the boot script, so a
        // plain reload would land back in the mode we just left. Rewrite the
        // parameter when it is there, otherwise reload as normal.
        const url = new URL(location.href);
        if (url.searchParams.has('mode')) {
            url.searchParams.set('mode', next);
            location.replace(url);
        } else {
            location.reload();
        }
    });
}


// ===================================================
// 11. NAVIGATION HINT
// Fades out as soon as the visitor moves around by themselves.
// ===================================================
const hint = document.getElementById('hint');

if (hint) {
    const dismiss = () => hint.classList.add('gone');

    window.addEventListener('wheel', dismiss, { passive: true, once: true });
    window.addEventListener('keydown', dismiss, { once: true });
    window.addEventListener('pointerdown', dismiss, { once: true });
    setTimeout(dismiss, 12000);
}


// ===================================================
// 12. MOUSE TRAIL
// Cyan particles that follow the cursor. Skipped in 3D mode, where
// the WebGL dust field already fills that role.
// ===================================================
const mouseEffectCanvas = document.getElementById('mouse-effect-canvas');

if (mouseEffectCanvas && !document.documentElement.classList.contains('mode-3d')) {
    const ctx = mouseEffectCanvas.getContext('2d');
    let particles = [];

    const resizeCanvas = () => {
        mouseEffectCanvas.width = window.innerWidth;
        mouseEffectCanvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // spawn a puff of particles at a point, each with its own drift and life
    const addParticles = (x, y, count = 4) => {
        for (let i = 0; i < count; i++) {
            particles.push({
                x,
                y,
                radius: 12 + Math.random() * 8,
                alpha: 0.9,
                vx: (Math.random() - 0.5) * 2.5,
                vy: (Math.random() - 0.5) * 2.5,
                life: 30 + Math.random() * 20,
                hue: 190 + Math.random() * 30,
            });
        }
    };

    window.addEventListener('mousemove', event => {
        addParticles(event.clientX, event.clientY, 4);
    });

    // touch and pen get a slightly heavier trail so it still reads on mobile
    window.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch' || event.pointerType === 'pen') {
            addParticles(event.clientX, event.clientY, 6);
        }
    });

    window.addEventListener('touchstart', event => {
        if (event.touches.length) addParticles(event.touches[0].clientX, event.touches[0].clientY, 6);
    }, { passive: true });

    window.addEventListener('touchmove', event => {
        if (event.touches.length) addParticles(event.touches[0].clientX, event.touches[0].clientY, 5);
    }, { passive: true });

    // a soft radial gradient per particle, fading out at the edge
    const drawParticle = particle => {
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius);
        gradient.addColorStop(0, `rgba(1, 240, 248, ${particle.alpha})`);
        gradient.addColorStop(0.4, `rgba(1, 240, 248, ${particle.alpha * 0.25})`);
        gradient.addColorStop(1, 'rgba(1, 240, 248, 0)');

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
    };

    const animateParticles = () => {
        ctx.clearRect(0, 0, mouseEffectCanvas.width, mouseEffectCanvas.height);
        particles = particles.filter(p => p.life > 0 && p.alpha > 0);

        for (const particle of particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.alpha -= 0.028;   // fade
            particle.life -= 1;
            particle.radius *= 0.96;   // shrink
            drawParticle(particle);
        }

        requestAnimationFrame(animateParticles);
    };

    animateParticles();
}


// ===================================================
// 13. EMAILJS CONTACT FORM
// ---------------------------------------------------
// The form field names (from_name / from_email / phone / subject /
// message) must match the variables in the EmailJS template — that
// is how sendForm maps the inputs into the email.
// ===================================================
const EMAILJS_PUBLIC_KEY = 'Opia1q1bMx_kGkCRq';   // Account → API Keys
const EMAILJS_SERVICE_ID = 'Niashen';             // Email Services → Service ID
const EMAILJS_TEMPLATE_ID = 'Niashen_temp';       // Email Templates → Template ID

// initialise EmailJS (skipped if the CDN did not load, so the rest of this file still runs)
const emailjsReady = typeof emailjs !== 'undefined';
if (emailjsReady) emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

// --- toast helper ---
const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} toast-show`;
    setTimeout(() => { toast.className = 'toast'; }, 5000);
};

// --- submit handler ---
// `form` was looked up in section 9
if (form) {
    form.addEventListener('submit', e => {
        e.preventDefault();

        if (!emailjsReady) {
            showToast('❌ Mail service unavailable. Please email me at niashenh@gmail.com.', 'error');
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        const btnText = document.getElementById('btn-text');
        const btnSpinner = document.getElementById('btn-spinner');

        // loading state — stops double sends
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline';

        emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form)
            .then(() => {
                showToast('✅ Message sent! I\'ll get back to you soon.', 'success');
                form.reset();
            })
            .catch(error => {
                console.error('EmailJS error:', error);
                showToast('❌ Something went wrong. Please try again or email me directly.', 'error');
            })
            .finally(() => {
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnSpinner.style.display = 'none';
            });
    });
}


// ===================================================
// 14. ACCENT PICKER
// The whole site draws its highlight colour from --main-color, so
// rewriting that one property on :root recolours everything at once.
// world.js listens for the 'accentchange' event and repaints the
// WebGL scene to match.
// ===================================================
const ACCENT_KEY = 'shaidon-accent';
const accentPicker = document.getElementById('accent-picker');

if (accentPicker) {
    const swatches = [...accentPicker.querySelectorAll('.accent-swatches button')];
    const accentTrigger = document.getElementById('accent-trigger');

    // "#ff3d81" -> "255 61 129", the form the translucent tints need
    const toRgb = hex => [1, 3, 5]
        .map(i => parseInt(hex.substr(i, 2), 16))
        .join(' ');

    const applyAccent = (hex, remember = true) => {
        document.documentElement.style.setProperty('--main-color', hex);
        document.documentElement.style.setProperty('--main-rgb', toRgb(hex));
        swatches.forEach(s => s.classList.toggle('active', s.dataset.accent === hex));

        if (remember) {
            try { localStorage.setItem(ACCENT_KEY, hex); } catch (e) { }
        }

        // let the three.js scenes recolour themselves
        window.dispatchEvent(new CustomEvent('accentchange', { detail: hex }));
    };

    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            applyAccent(swatch.dataset.accent);
            accentPicker.classList.remove('open');   // fold away after choosing
            accentTrigger.setAttribute('aria-expanded', 'false');
        });
    });

    // the trigger is only visible on phone layouts, where the swatches are
    // collapsed behind it and slide out sideways
    if (accentTrigger) {
        accentTrigger.addEventListener('click', () => {
            const open = accentPicker.classList.toggle('open');
            accentTrigger.setAttribute('aria-expanded', String(open));
        });

        // tapping anywhere else folds it back
        document.addEventListener('click', event => {
            if (!accentPicker.contains(event.target)) {
                accentPicker.classList.remove('open');
                accentTrigger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // restore the visitor's previous choice, defaulting to the site cyan
    let savedAccent = null;
    try { savedAccent = localStorage.getItem(ACCENT_KEY); } catch (e) { }
    applyAccent(savedAccent || '#01f0f8', false);
}


// ===================================================
// 15. COMMAND PALETTE
// Ctrl/Cmd + K (or "/") opens a search box that jumps to any section
// or fires an action. Arrow keys move, Enter runs, Esc closes.
// ===================================================
const palette = document.getElementById('palette');
const paletteInput = document.getElementById('palette-input');
const paletteList = document.getElementById('palette-list');

if (palette) {
    const icon = d => '<svg class="icon" viewBox="0 0 24 24">' + d + '</svg>';

    // every entry: how it looks, what it matches on, and what it does
    const COMMANDS = [
        {
            label: 'Home', hint: 'section', keys: 'home start intro',
            svg: '<path d="M4 11l8-7 8 7M6 10v9h12v-9" />',
            run: () => showSection('home'),
        },
        {
            label: 'Services', hint: 'section', keys: 'services web design seo development logo motion',
            svg: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" />',
            run: () => showSection('services'),
        },
        {
            label: 'Resume', hint: 'section', keys: 'resume cv education experience skills certificates',
            svg: '<rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" />',
            run: () => showSection('resume'),
        },
        {
            label: 'Portfolio', hint: 'section', keys: 'portfolio projects work logos videos',
            svg: '<rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 15l5-4 4 3 3-2 6 4" />',
            run: () => showSection('portfolio'),
        },
        {
            label: 'Affiliates', hint: 'section', keys: 'affiliates hosting hostafrica',
            svg: '<path d="M14 11a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" /><path d="M10 13a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1" />',
            run: () => showSection('affiliates'),
        },
        {
            label: 'Contact', hint: 'section', keys: 'contact hire email message quote',
            svg: '<rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" />',
            run: () => showSection('contact'),
        },
        {
            label: 'Email Shaidon', hint: 'niashenh@gmail.com', keys: 'email mail write send',
            svg: '<rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" />',
            run: () => { location.href = 'mailto:niashenh@gmail.com'; },
        },
        {
            label: 'WhatsApp', hint: '076 976 5576', keys: 'whatsapp chat phone call message',
            svg: '<path d="M20 12a8 8 0 0 1-11.9 7L4 20l1.1-3.9A8 8 0 1 1 20 12z" />',
            run: () => window.open('https://wa.me/27769765576', '_blank', 'noopener'),
        },
        {
            label: 'Download CV', hint: 'docx', keys: 'cv download curriculum vitae',
            svg: '<path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M4 20h16" />',
            run: () => { location.href = 'files/Curriculum%20Vitae%20of%20NH%20upd.docx'; },
        },
        {
            label: 'Get hosting (HOSTAFRICA)', hint: 'affiliate', keys: 'hosting host africa domain server',
            svg: '<ellipse cx="12" cy="12" rx="9" ry="4" /><path d="M3 12v5c0 2.2 4 4 9 4s9-1.8 9-4v-5" />',
            run: () => window.open('https://panel.hostafrica.com/?aff=3470', '_blank', 'noopener'),
        },
        {
            label: 'Switch flat / 3D mode', hint: 'toggle', keys: 'mode 3d flat toggle switch view',
            svg: '<path d="M12 2l9 5-9 5-9-5 9-5z" /><path d="M3 12l9 5 9-5M3 17l9 5 9-5" />',
            run: () => document.getElementById('mode-toggle').click(),
        },
    ];

    let matches = [];
    let cursor = 0;

    const render = () => {
        paletteList.innerHTML = matches.length
            ? matches.map((cmd, i) =>
                '<li class="' + (i === cursor ? 'on' : '') + '" data-i="' + i + '">' +
                icon(cmd.svg) + '<span>' + cmd.label + '</span><small>' + cmd.hint + '</small></li>').join('')
            : '<li class="palette-empty">Nothing matches that</li>';
    };

    const filterCommands = () => {
        const q = paletteInput.value.trim().toLowerCase();
        matches = q
            ? COMMANDS.filter(c => (c.label + ' ' + c.keys).toLowerCase().includes(q))
            : COMMANDS.slice();
        cursor = 0;
        render();
    };

    const openPalette = () => {
        palette.hidden = false;
        paletteInput.value = '';
        filterCommands();
        paletteInput.focus();
    };

    const closePalette = () => { palette.hidden = true; };

    const runCommand = () => {
        const cmd = matches[cursor];
        if (!cmd) return;
        closePalette();
        cmd.run();
    };

    // Ctrl/Cmd+K anywhere; "/" only when not already typing in a field
    window.addEventListener('keydown', event => {
        const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            palette.hidden ? openPalette() : closePalette();
        } else if (event.key === '/' && !typing && palette.hidden) {
            event.preventDefault();
            openPalette();
        } else if (event.key === 'Escape' && !palette.hidden) {
            closePalette();
        }
    });

    paletteInput.addEventListener('input', filterCommands);

    paletteInput.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            cursor = Math.min(cursor + 1, matches.length - 1);
            render();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            cursor = Math.max(cursor - 1, 0);
            render();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            runCommand();
        }
    });

    paletteList.addEventListener('click', event => {
        const row = event.target.closest('li[data-i]');
        if (!row) return;
        cursor = Number(row.dataset.i);
        runCommand();
    });

    // clicking the dimmed backdrop closes it
    palette.addEventListener('click', event => {
        if (event.target === palette) closePalette();
    });
}


// ===================================================
// 16. PROJECT LIGHTBOX
// Click any portfolio piece to see it full size and uncropped, which
// is the one thing a coverflow carousel cannot do. Videos play with
// sound here; arrow keys and Esc work as expected.
// ===================================================
const lightbox = document.getElementById('lightbox');

if (lightbox) {
    const stage = document.getElementById('lightbox-stage');
    const caption = document.getElementById('lightbox-caption');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    const lightboxItems = [...document.querySelectorAll('.portfolio-carousel .img-item')];
    const lightboxDetails = [...document.querySelectorAll('.portfolio-detail')];
    let at = 0;

    const showPiece = index => {
        at = Math.max(0, Math.min(index, lightboxItems.length - 1));

        const source = lightboxItems[at].querySelector('img, video');
        const detail = lightboxDetails[at];

        // a fresh clone each time, so the carousel keeps its own copy intact
        stage.innerHTML = '';
        const copy = source.cloneNode(true);
        copy.removeAttribute('style');

        if (copy.tagName === 'VIDEO') {
            copy.controls = true;
            copy.muted = false;
            copy.volume = 1;
            copy.play().catch(() => {
                copy.muted = true;
                copy.play().catch(() => { });
            });
        }

        stage.appendChild(copy);

        caption.innerHTML = detail
            ? '<b>' + detail.querySelector('h3').textContent + '</b>' +
              detail.querySelector('p').textContent
            : '';

        prevBtn.disabled = at === 0;
        nextBtn.disabled = at === lightboxItems.length - 1;
    };

    const openLightbox = index => {
        // whatever is playing in the carousel must not talk over the lightbox
        document.querySelectorAll('.portfolio-carousel video').forEach(v => v.pause());
        lightbox.hidden = false;
        showPiece(index);
    };

    const closeLightbox = () => {
        lightbox.hidden = true;
        stage.innerHTML = '';   // stops the video and frees the decoder
    };

    lightboxItems.forEach((item, index) => {
        item.addEventListener('click', event => {
            // let the inline video controls do their job instead
            if (event.target.closest('video')) return;
            openLightbox(index);
        });
    });

    prevBtn.addEventListener('click', () => showPiece(at - 1));
    nextBtn.addEventListener('click', () => showPiece(at + 1));
    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', event => {
        if (event.target === lightbox || event.target === stage) closeLightbox();
    });

    window.addEventListener('keydown', event => {
        if (lightbox.hidden) return;
        if (event.key === 'Escape') closeLightbox();
        else if (event.key === 'ArrowRight') showPiece(at + 1);
        else if (event.key === 'ArrowLeft') showPiece(at - 1);
    });
}
