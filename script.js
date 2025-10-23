document.addEventListener('DOMContentLoaded', () => {
  // === HERO VIDEO AUTOPLAY FIX (For iOS Safari & Mobile) ===
  const heroVideo = document.querySelector('.hero-video');
if (heroVideo) {
  heroVideo.muted = true;
  heroVideo.playsInline = true;
  heroVideo.autoplay = true;
  heroVideo.loop = true;

  heroVideo.play().catch(() => {
    console.log("Autoplay blocked, forcing playback...");
    heroVideo.muted = true;
    heroVideo.play();
  });
}

  // === FADE-IN ANIMATION ===
  const elements = document.querySelectorAll('.fade-in');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(el => {
    el.classList.add('hidden');
    observer.observe(el);
  });

  // === ENHANCED REVEAL ANIMATION FOR CARDS & CONTENT ===
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        entry.target.classList.remove('is-hidden');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

  const prepareReveal = element => {
    if (!element || element.classList.contains('reveal-prepared')) return;
    element.classList.add('reveal-prepared', 'is-hidden');
    revealObserver.observe(element);
  };

  document.querySelectorAll('.reveal-on-scroll').forEach(prepareReveal);

  // === PERFORMANCE METRICS COUNTERS ===
  const metricValues = document.querySelectorAll('.metric-value[data-target]');
  const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

  const animateCounter = element => {
    const target = Number(element.dataset.target || 0);
    const suffix = element.dataset.suffix || '';
    const duration = 1800;
    const startTime = performance.now();

    const updateValue = currentTime => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const value = Math.round(eased * target);
      element.textContent = `${value.toLocaleString()}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(updateValue);
      } else {
        element.textContent = `${target.toLocaleString()}${suffix}`;
      }
    };

    requestAnimationFrame(updateValue);
  };

  if (metricValues.length) {
    const counterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    metricValues.forEach(value => counterObserver.observe(value));
  }

  // === SCROLL PROGRESS BAR ===
  const progressBar = document.querySelector('.scroll-progress .progress-bar');
  const updateProgress = () => {
    if (!progressBar) return;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
    progressBar.style.width = `${progress}%`;
  };

  updateProgress();
  window.addEventListener('scroll', updateProgress);
  window.addEventListener('resize', updateProgress);

  // === NAVBAR STATE ON SCROLL ===
  const navbar = document.querySelector('.navbar');
  const toggleNavbarState = () => {
    if (!navbar) return;
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  toggleNavbarState();
  window.addEventListener('scroll', toggleNavbarState);

  // === MOBILE MENU TOGGLE ===
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
  }

  // === DYNAMIC PROJECTS ===
  const projectData = [
    {

      id: 1,
      title: "Albassami × Seven Car Lounge",
      category: "High-End Video & Content Production",
      client: "Seven Car Lounge",
      location: "Riyadh",
      image: "Projects/albassami0001.jpg"
        
      
    },
    {
      id: 2,
      title: "ArabGT × SAMF",
      category: "High-End Video & Content Production",
      client: "ArabGT",
      location: "Riyadh",
      image: "Projects/samf0001.jpg"
    },
    {
      id: 3,
      title: "Hongqi × StriveME",
      category: "High-End Video & Content Production",
      client: "Strive ME",
      location: "Riyadh",
      image: "Projects/hongqi.png"
    },
    {
      id: 4,
      title: "Toyota LC300 HEV MAX",
      category: "High-End Video & Content Production",
      client: "Abdullateef Jameel",
      location: "Riyadh",
      image: "Projects/toyotalc3000001.jpg"
    },
    {
      id: 5,
      title: "Feynlab",
      category: "High-End Video & Content Production",
      client: "Feynlab",
      location: "Riyadh",
      image: "Projects/feynlab0001.jpg"
    },
    {
      id: 6,
      title: "VIP Quick Service",
      category: "High-End Video & Content Production",
      client: "VIP Quick Service",
      location: "Riyadh",
      image: "Projects/vip00.png"
    }
  ];

  const projectsGrid = document.getElementById("projectsGrid");

  projectData.forEach(project => {
    const card = document.createElement("div");
    card.classList.add('project-card', 'reveal-on-scroll');
    card.innerHTML = `
      <div class="project-image">
        <img src="${project.image}" alt="${project.title}" />
      </div>
      <div class="project-info">
        <h3>${project.title}</h3>
        <a href="#services" class="project-category">${project.category}</a>
        <div class="project-details">
          <p><strong>Client:</strong> ${project.client}</p>
          <p><strong>Location:</strong> ${project.location}</p>
        </div>
        <a href="project-details.html?id=${project.id}" class="project-btn">View Project</a>
      </div>
    `;
    projectsGrid.appendChild(card);
    prepareReveal(card);
  });

  // === TESTIMONIALS CAROUSEL ===
  const testimonialsData = [
    {
      quote: "BX Media elevated our launch with cinematic storytelling and flawless execution. The campaign generated a record spike in showroom traffic.",
      name: "Mohammed Al Qahtani",
      role: "Marketing Director",
      company: "Seven Car Lounge"
    },
    {
      quote: "From concept to delivery, the BX team understood our brand voice and delivered social-ready assets that outperformed our benchmarks.",
      name: "Reem Al Harbi",
      role: "Head of Communications",
      company: "ArabGT"
    },
    {
      quote: "Their creative direction and production quality helped us capture a new audience and expand our dealership partnerships in the region.",
      name: "Daniel Kim",
      role: "Regional Marketing Lead",
      company: "BYD Middle East"
    }
  ];

  const testimonialsTrack = document.getElementById('testimonialsTrack');
  const testimonialsDots = document.getElementById('testimonialDots');
  const testimonialsCarousel = document.querySelector('.testimonials-carousel');

  if (testimonialsTrack && testimonialsDots && testimonialsData.length) {
    testimonialsData.forEach((testimonial, index) => {
      const card = document.createElement('article');
      card.classList.add('testimonial-card', 'reveal-on-scroll');
      if (index === 0) card.classList.add('active');
      card.setAttribute('role', 'group');
      card.innerHTML = `
        <div class="testimonial-quote">“${testimonial.quote}”</div>
        <div class="testimonial-meta">
          <span class="testimonial-name">${testimonial.name}</span>
          <span class="testimonial-role">${testimonial.role}, ${testimonial.company}</span>
        </div>
      `;
      testimonialsTrack.appendChild(card);
      prepareReveal(card);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.classList.add('carousel-dot');
      if (index === 0) {
        dot.classList.add('active');
        dot.setAttribute('aria-selected', 'true');
      } else {
        dot.setAttribute('aria-selected', 'false');
      }
      dot.dataset.index = index;
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Show testimonial ${index + 1}`);
      testimonialsDots.appendChild(dot);
    });

    const testimonialCards = Array.from(testimonialsTrack.querySelectorAll('.testimonial-card'));
    const carouselDots = Array.from(testimonialsDots.querySelectorAll('.carousel-dot'));
    let activeTestimonial = 0;
    let autoplayTimer = null;
    const AUTOPLAY_DELAY = 8000;

    const goToSlide = index => {
      activeTestimonial = (index + testimonialCards.length) % testimonialCards.length;
      testimonialCards.forEach((card, idx) => {
        const isActive = idx === activeTestimonial;
        card.classList.toggle('active', isActive);
        card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });
      carouselDots.forEach((dot, idx) => {
        const isActive = idx === activeTestimonial;
        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    };

    const startAutoplay = () => {
      autoplayTimer = setInterval(() => {
        goToSlide(activeTestimonial + 1);
      }, AUTOPLAY_DELAY);
    };

    const stopAutoplay = () => {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    };

    const restartAutoplay = () => {
      stopAutoplay();
      startAutoplay();
    };

    document.querySelectorAll('[data-carousel]').forEach(control => {
      control.addEventListener('click', () => {
        const direction = control.dataset.carousel === 'next' ? 1 : -1;
        goToSlide(activeTestimonial + direction);
        restartAutoplay();
      });
    });

    carouselDots.forEach(dot => {
      dot.addEventListener('click', () => {
        const index = Number(dot.dataset.index);
        goToSlide(index);
        restartAutoplay();
      });
    });

    if (testimonialsCarousel) {
      testimonialsCarousel.addEventListener('mouseenter', stopAutoplay);
      testimonialsCarousel.addEventListener('mouseleave', restartAutoplay);
    }

    goToSlide(0);
    startAutoplay();
  }
});
