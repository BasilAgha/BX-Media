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
      title: "Auto Dealership Website",
      category: "Web Development",
      client: "SpeedAuto",
      location: "Riyadh",
      year: "2024",
      image: "images/project1.jpg",
      link: "#"
    },
    {
      title: "Luxury Car Promo Reel",
      category: "Video Production",
      client: "Elite Motors",
      location: "Jeddah",
      year: "2023",
      image: "images/project2.jpg",
      link: "#"
    },
    {
      title: "Off-Road Brand Campaign",
      category: "Marketing Strategy",
      client: "DesertX",
      location: "Dammam",
      year: "2025",
      image: "images/project3.jpg",
      link: "#"
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
        <span class="project-category">${project.category}</span>
        <div class="project-details">
          <p><strong>Client:</strong> ${project.client}</p>
          <p><strong>Location:</strong> ${project.location}</p>
          <p><strong>Launch Year:</strong> ${project.year}</p>
        </div>
        <a href="${project.link}" class="project-btn">View Project</a>
      </div>
    `;
    projectsGrid.appendChild(card);
  });
});
