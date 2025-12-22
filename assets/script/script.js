"use strict";

// element toggle function
const elementToggleFunc = function (elem) {
  elem.classList.toggle("active");
};

// sidebar variables
const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

// sidebar toggle functionality for mobile
sidebarBtn.addEventListener("click", function () {
  elementToggleFunc(sidebar);
});

// testimonials variables
const testimonialsItem = document.querySelectorAll("[data-testimonials-item]");
const modalContainer = document.querySelector("[data-modal-container]");
const modalCloseBtn = document.querySelector("[data-modal-close-btn]");
const overlay = document.querySelector("[data-overlay]");
const testimonialImg = document.querySelector("[data-testimonials-avatar]");
const testimonialsList = document.querySelector(".testimonials-list");
const testimonialScrollButtons = document.querySelectorAll("[data-scroll-btn]");

// modal variable
const modalImg = document.querySelector("[data-modal-img]");
const quoteImg = document.querySelector("[data-img-link]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalText = document.querySelector("[data-modal-text]");

// modal toggle function
const testimonialsModalFunc = function () {
  modalContainer.classList.toggle("active");
  overlay.classList.toggle("active");
};

// add click event to all modal items
for (let i = 0; i < testimonialsItem.length; i++) {
  testimonialsItem[i].addEventListener("click", function () {
    modalImg.src = this.querySelector("[data-testimonials-avatar]").src;
    modalImg.alt = this.querySelector("[data-testimonials-avatar]").alt;
    quoteImg.href = this.querySelector(
      "[data-testimonials-avatar]"
    ).getAttribute("data-img");
    modalTitle.innerHTML = this.querySelector(
      "[data-testimonials-title]"
    ).innerHTML;
    modalText.innerHTML = this.querySelector(
      "[data-testimonials-text]"
    ).innerHTML;

    testimonialsModalFunc();
  });
}

// add click event to modal close button
modalCloseBtn.addEventListener("click", testimonialsModalFunc);
overlay.addEventListener("click", testimonialsModalFunc);

if (testimonialsList && testimonialScrollButtons.length) {
  testimonialScrollButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const direction = btn.dataset.scrollBtn === "next" ? 1 : -1;
      const scrollAmount = testimonialsList.clientWidth * 0.95;
      testimonialsList.scrollBy({ left: direction * scrollAmount, behavior: "smooth" });
    });
  });
}

// custom select variables
const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-selecct-value]");
const filterBtn = document.querySelectorAll("[data-filter-btn]");

select.addEventListener("click", function () {
  elementToggleFunc(this);
});

// add event in all select items
for (let i = 0; i < selectItems.length; i++) {
  selectItems[i].addEventListener("click", function () {
    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    elementToggleFunc(select);
    filterFunc(selectedValue);
  });
}

// filter variables
const filterItems = document.querySelectorAll("[data-filter-item]");

const filterFunc = function (selectedValue) {
  for (let i = 0; i < filterItems.length; i++) {
    if (selectedValue === "all") {
      filterItems[i].classList.add("active");
    } else if (selectedValue === filterItems[i].dataset.category) {
      filterItems[i].classList.add("active");
    } else {
      filterItems[i].classList.remove("active");
    }
  }
};

// add event in all filter button items for large screen
let lastClickedBtn = filterBtn[0];

for (let i = 0; i < filterBtn.length; i++) {
  filterBtn[i].addEventListener("click", function () {
    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    filterFunc(selectedValue);

    lastClickedBtn.classList.remove("active");
    this.classList.add("active");
    lastClickedBtn = this;
  });
}

// contact form variables
const form = document.querySelector("[data-form]");
const formInputs = document.querySelectorAll("[data-form-input]");
const formBtn = document.querySelector("[data-form-btn]");

// add event to all form input field
for (let i = 0; i < formInputs.length; i++) {
  formInputs[i].addEventListener("input", function () {
    // check form validation
    if (form.checkValidity()) {
      formBtn.removeAttribute("disabled");
    } else {
      formBtn.setAttribute("disabled", "");
    }
  });
}

// page navigation variables
const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

// Mobile dropdown functionality
const dropdownBtn = document.querySelector("[data-dropdown-btn]");
const dropdownMenu = document.querySelector(".navbar-dropdown");

// Toggle dropdown menu on mobile
if (dropdownBtn && dropdownMenu) {
  // Click on More button
  dropdownBtn.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const isActive = dropdownMenu.classList.contains("active");
    dropdownMenu.classList.toggle("active");
    
    console.log("Dropdown toggled:", !isActive); // Debug
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function(e) {
    if (!dropdownMenu.contains(e.target) && !dropdownBtn.contains(e.target)) {
      dropdownMenu.classList.remove("active");
    }
  });

  // Prevent dropdown menu clicks from bubbling
  const dropdownMenuEl = dropdownMenu.querySelector(".dropdown-menu");
  if (dropdownMenuEl) {
    dropdownMenuEl.addEventListener("click", function(e) {
      e.stopPropagation();
    });
  }
} else {
  console.error("Dropdown not found:", { btn: dropdownBtn, menu: dropdownMenu }); // Debug
}

// add event to all nav link (including dropdown links)
for (let i = 0; i < navigationLinks.length; i++) {
  navigationLinks[i].addEventListener("click", function () {
    // Close dropdown after selecting an item
    if (dropdownMenu) {
      dropdownMenu.classList.remove("active");
    }

    // Remove active class from all links
    for (let j = 0; j < navigationLinks.length; j++) {
      navigationLinks[j].classList.remove("active");
    }

    // Add active class to clicked link
    this.classList.add("active");

    for (let i = 0; i < pages.length; i++) {
      if (this.innerHTML.toLowerCase() === pages[i].dataset.page) {
        pages[i].classList.add("active");
        window.scrollTo(0, 0);
      } else {
        pages[i].classList.remove("active");
      }
    }
  });
}

// Call the function with different lists and container IDs
// HTML5
createButtonListWithIcon(
  [{ name: "HTML5", icon: "https://img.icons8.com/color/48/000000/html-5--v1.png" }],
  "html5Container"
);

// CSS3
createButtonListWithIcon(
  [{ name: "CSS3", icon: "https://img.icons8.com/color/48/000000/css3.png" }],
  "cssContainer"
);

// JavaScript
createButtonListWithIcon(
  [{ name: "JavaScript", icon: "https://img.icons8.com/color/48/000000/javascript--v1.png" }],
  "jsContainer"
);

// React JS
createButtonListWithIcon(
  [{ name: "React JS", icon: "https://img.icons8.com/color/48/000000/react-native.png" }],
  "reactContainer"
);

// Python
createButtonListWithIcon(
  [{ name: "Python", icon: "https://img.icons8.com/color/48/000000/python--v1.png" }],
  "pythonContainer"
);

// C/C++
createButtonListWithIcon(
  [{ name: "C/C++", icon: "https://img.icons8.com/color/48/000000/c-plus-plus-logo.png" }],
  "cppContainer"
);

// Bootstrap
createButtonListWithIcon(
  [{ name: "Bootstrap", icon: "https://img.icons8.com/color/48/000000/bootstrap.png" }],
  "bootstrapContainer"
);

// Tailwind CSS
createButtonListWithIcon(
  [{ name: "Tailwind CSS", icon: "https://img.icons8.com/?size=48&id=EAUyKy3IwmqM&format=png" }],
  "tailwindContainer"
);

// Figma & Canva
createButtonListWithIcon(
  [
    { name: "Figma", icon: "https://static.figma.com/app/icon/1/favicon.svg" },
    { name: "Canva", icon: "https://www.canva.com/favicon.ico" }
  ],
  "figmaContainer"
);

// Photoshop
createButtonListWithIcon(
  [{ name: "Photoshop", icon: "https://img.icons8.com/?size=48&id=13677&format=png" }],
  "photoshopContainer"
);

// Other expertise sections - keep these for future use
/*
createButtonListWithIcon(
  paymentGatewayExpertiesButtons,
  "paymentGatewayExperties"
);
createButtonListWithIcon(plugnisExpertiesButtons, "plugnisExperties");
createButtonListWithIcon(tootlUtilitiesExpertiesButtons, "tootlUtilitiesExperties");
createButtonListWithIcon(
  versionControlExpertiesButtons,
  "versionControlExperties"
);
createButtonListWithIcon(databaseExpertiesButtons, "databaseExperties");
createButtonListWithIcon(apiServicesExpertiesButtons, "apiServicesExperties");
createButtonListWithIcon(codeReviewExpertiesButtons, "codeReviewExperties");
createButtonListWithIcon(deploymentExpertiesButtons, "deploymentExperties");
createButtonListWithIcon(
  crashReportingExpertiesButtons,
  "crashReportingExperties"
);
createButtonListWithIcon(
  projectManagementToolsExpertiesButtons,
  "projectManagementToolsExperties"
);
createButtonListWithIcon(
  stateManagementExpertiesButtons,
  "stateManagementExperties"
);
createButtonListWithIcon(
  upgradeServicesExpertiesButtons,
  "upgradeServicesExperties"
);
createButtonListWithIcon(unitTestingExpertiesButtons, "unitTestingExperties");
createButtonListWithIcon(uiUXToolsExpertiesButtons, "uiUXToolsExperties");
*/

function createButtonListWithIcon(buttonNames, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID ${containerId} not found!`);
    return;
  }
  
  container.innerHTML = "";

  buttonNames.forEach((item) => {
    const button = document.createElement("button");
    const icon = document.createElement("img");
    
    icon.className = "icon";
    icon.src = item.icon;
    icon.alt = `${item.name} icon`;
    icon.onerror = function() {
      // Fallback for broken icons
      this.src = "https://img.icons8.com/material-outlined/24/FFFFFF/code.png";
      console.warn(`Icon for ${item.name} could not be loaded from ${item.icon}`);
    };

    button.className = "toolBtn";
    button.textContent = item.name;
    button.appendChild(icon);
    container.appendChild(button);
  });
}

// Service section dots indicator for mobile
const serviceList = document.querySelector(".service-list");
const serviceDots = document.querySelectorAll(".service-dot");
const serviceItems = document.querySelectorAll(".service-item");

if (serviceList && serviceDots.length && serviceItems.length) {
  // Update dots on scroll
  serviceList.addEventListener("scroll", () => {
    const scrollLeft = serviceList.scrollLeft;
    const itemWidth = serviceItems[0].offsetWidth + 15; // width + gap
    const activeIndex = Math.round(scrollLeft / itemWidth);
    
    serviceDots.forEach((dot, index) => {
      dot.classList.toggle("active", index === activeIndex);
    });
  });
  
  // Click on dots to scroll
  serviceDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const index = parseInt(dot.dataset.dot);
      const itemWidth = serviceItems[0].offsetWidth + 15;
      serviceList.scrollTo({ left: index * itemWidth, behavior: "smooth" });
    });
  });
}
