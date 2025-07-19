document.addEventListener('DOMContentLoaded', () => {
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

  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  // Dynamic Projects
  const projectData = [
    {
      id: 1,
      title: "Feynlab Showcase",
      category: "High-End Video & Content Production",
      client: "Feynlab",
      location: "Riyadh",
      image: "images/project1.jpg"
    },
    {
      id: 2,
      title: "SaudiStig Showcase",
      category: "High-End Video & Content Production",
      client: "SaudiStig",
      location: "Riyadh",
      image: "images/project2.jpg"
    },
    {
      id: 3,
      title: "SaudiStig Showcase",
      category: "High-End Video & Content Production",
      client: "Strive ME",
      location: "Riyadh",
      image: "images/project3.jpg"
    }
  ];

  const projectsGrid = document.getElementById("projectsGrid");

  projectData.forEach(project => {
    const card = document.createElement("div");
    card.className = "project-card";
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
  });
});
