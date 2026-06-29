// ===== BURGER MENU TOGGLE =====
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

navOverlay.addEventListener('click', closeMenu);

// Close on resize to desktop
window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMenu();
});

// page navigation
const navLinks = document.querySelectorAll('.navbar a');
const sections = document.querySelectorAll('section');

const showSection = (id) => {
    sections.forEach(section => {
        section.classList.toggle('active', section.id === id);
    });

    navLinks.forEach(link => {
        const target = link.getAttribute('href').slice(1);
        link.classList.toggle('active', target === id);
    });
};

navLinks.forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const targetSection = link.getAttribute('href').slice(1);
        showSection(targetSection);
        closeMenu(); // close mobile nav after navigating
    });
});

const pageAnchors = document.querySelectorAll('a[href^="#"]');
pageAnchors.forEach(link => {
    link.addEventListener('click', event => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#') && href.length > 1) {
            const targetSection = href.slice(1);
            const sectionExists = document.getElementById(targetSection);
            if (sectionExists) {
                event.preventDefault();
                showSection(targetSection);
            }
        }
    });
});

// resume section
const resumeBtns = document.querySelectorAll('.resume-btn');

resumeBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
        const resumeDetails = document.querySelectorAll('.resume-detail');

        resumeBtns.forEach(btn => {
            btn.classList.remove('active');
        });
        btn.classList.add('active');

        resumeDetails.forEach(detail => {
            detail.classList.remove('active');
        });
        resumeDetails[idx].classList.add('active');
    });
});

// portfolio carousel
const arrowRight = document.querySelector(' .portfolio-box .navigation .arrow-right');
const arrowLeft = document.querySelector(' .portfolio-box .navigation .arrow-left');

let index = 0;
const activePortfolio = () => {
    const imgSlide = document.querySelector('.portfolio-carousel .img-slide');
    const portfolioDetails = document.querySelectorAll('.portfolio-detail');
    const carouselItems = document.querySelectorAll('.portfolio-carousel .img-item');

    imgSlide.style.transform = `translateX(calc(${index * -100}% - ${index * 2}rem) )`;
    portfolioDetails.forEach(detail => {
        detail.classList.remove('active');
    });
    portfolioDetails[index].classList.add('active');

    carouselItems.forEach(item => {
        const video = item.querySelector('video');
        if (video) {
            video.pause();
            video.currentTime = 0;
            video.muted = false;
            video.volume = 1;
        }
    });

    const activeItem = carouselItems[index];
    const activeVideo = activeItem ? activeItem.querySelector('video') : null;

    if (activeVideo) {
        activeVideo.currentTime = 0;
        activeVideo.muted = false;
        activeVideo.volume = 1;
        activeVideo.play().catch(() => { });
    }
}

arrowRight.addEventListener('click', () => {
    if (index < 4) {
        index++;
        arrowLeft.classList.remove('disabled');
    }
    else {
        index = 5;
        arrowRight.classList.add('disabled');
    }
    activePortfolio();
})
arrowLeft.addEventListener('click', () => {
    if (index > 1) {
        index--;
        arrowRight.classList.remove('disabled');
    }
    else {
        index = 0;
        arrowLeft.classList.add('disabled');
    }
    activePortfolio();
})

// blue mouse trail effect
const mouseEffectCanvas = document.getElementById('mouse-effect-canvas');
if (mouseEffectCanvas) {
    const ctx = mouseEffectCanvas.getContext('2d');
    let particles = [];

    const resizeCanvas = () => {
        mouseEffectCanvas.width = window.innerWidth;
        mouseEffectCanvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

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

    window.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch' || event.pointerType === 'pen') {
            addParticles(event.clientX, event.clientY, 6);
        }
    });

    window.addEventListener('touchstart', event => {
        if (event.touches && event.touches.length) {
            const touch = event.touches[0];
            addParticles(touch.clientX, touch.clientY, 6);
        }
    }, { passive: true });

    window.addEventListener('touchmove', event => {
        if (event.touches && event.touches.length) {
            const touch = event.touches[0];
            addParticles(touch.clientX, touch.clientY, 5);
        }
    }, { passive: true });

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
            particle.alpha -= 0.028;
            particle.life -= 1;
            particle.radius *= 0.96;
            drawParticle(particle);
        }

        requestAnimationFrame(animateParticles);
    };

    animateParticles();
}

// ===================================================
// EMAILJS CONTACT FORM
// ===================================================
// ⚠️  REPLACE these three values with your own from emailjs.com
const EMAILJS_PUBLIC_KEY = 'Opia1q1bMx_kGkCRq';   // Account → API Keys
const EMAILJS_SERVICE_ID = 'Niashen';               // Email Services → Service ID
const EMAILJS_TEMPLATE_ID = 'Niashen_temp';         // Email Templates → Template ID

// Initialise EmailJS
emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

// --- Toast helper ---
const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} toast-show`;
    setTimeout(() => { toast.className = 'toast'; }, 5000);
};

// --- Form submit handler ---
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submit-btn');
        const btnText = document.getElementById('btn-text');
        const btnSpinner = document.getElementById('btn-spinner');

        // Loading state
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline';

        emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, contactForm)
            .then(() => {
                showToast('✅ Message sent! I\'ll get back to you soon.', 'success');
                contactForm.reset();
            })
            .catch((error) => {
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
