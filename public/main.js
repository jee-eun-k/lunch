// main.ts
var restaurantNameElement = document.getElementById("restaurantName");
var recommendButtons = document.querySelectorAll(".recommend-btn");
var addRestaurantBtn = document.getElementById("addRestaurantBtn");
var addRestaurantModal = document.getElementById("addRestaurantModal");
var modalContent = document.getElementById("modalContent");
var addRestaurantForm = document.getElementById("addRestaurantForm");
var newRestaurantNameInput = document.getElementById("newRestaurantName");
var restaurantThemeSelect = document.getElementById("restaurantTheme");
var cancelAddBtn = document.getElementById("cancelAddBtn");
var API_BASE_URL = window.location.hostname === "localhost" ? "http://localhost:8000" : window.location.origin;
var restaurantData = {};
function showAddRestaurantModal() {
  if (addRestaurantModal) {
    addRestaurantModal.classList.remove("hidden");
  }
  if (newRestaurantNameInput) {
    newRestaurantNameInput.focus();
  }
}
function hideAddRestaurantModal() {
  if (addRestaurantModal) {
    addRestaurantModal.classList.add("hidden");
  }
  if (addRestaurantForm) {
    addRestaurantForm.reset();
  }
}
async function loadRestaurants() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/restaurants`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || "Failed to load restaurants");
    }
    const data = await response.json();
    console.table(data);
    restaurantData = data;
  } catch (error) {
    console.error("Error loading restaurants:", error);
    alert(
      "\uC2DD\uB2F9 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC0C8\uB85C\uACE0\uCE68 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694."
    );
  }
}
if (addRestaurantBtn) {
  addRestaurantBtn.addEventListener("click", showAddRestaurantModal);
}
if (cancelAddBtn) {
  cancelAddBtn.addEventListener("click", hideAddRestaurantModal);
}
if (addRestaurantForm) {
  addRestaurantForm.addEventListener("submit", handleAddRestaurant);
}
document.addEventListener("DOMContentLoaded", () => {
  loadRestaurants();
});
function displayRestaurant(name) {
  if (!restaurantNameElement) return;
  restaurantNameElement.classList.remove("animate-dramatic-appear-ppt");
  restaurantNameElement.textContent = "";
  void restaurantNameElement.offsetWidth;
  restaurantNameElement.textContent = name;
  restaurantNameElement.classList.add("animate-dramatic-appear-ppt");
}
function handleRecommendation(event) {
  const target = event.target;
  const theme = target.dataset.theme || null;
  if (!theme) return;
  const restaurants = theme === "\uB79C\uB364 \uCD94\uCC9C" ? Object.values(restaurantData).flat() : restaurantData[theme];
  if (restaurants && restaurants.length > 0) {
    const randomIndex = Math.floor(Math.random() * restaurants.length);
    const recommendedRestaurant = restaurants[randomIndex];
    displayRestaurant(recommendedRestaurant);
  } else {
    displayRestaurant("\uCD94\uCC9C\uD560 \uC2DD\uB2F9\uC774 \uC5C6\uC5B4\uC694! \uC5C9\uC5C9 \u{1F62D}");
  }
}
function populateThemeSelect() {
  if (!restaurantThemeSelect) return;
  restaurantThemeSelect.innerHTML = "";
  for (const theme in restaurantData) {
    const option = document.createElement("option");
    option.value = theme;
    option.textContent = theme;
    restaurantThemeSelect.appendChild(option);
  }
  const newThemeOption = document.createElement("option");
  newThemeOption.value = "\uC0C8 \uD14C\uB9C8 \uCD94\uAC00";
  newThemeOption.textContent = "\uC0C8 \uD14C\uB9C8 \uCD94\uAC00...";
  restaurantThemeSelect.appendChild(newThemeOption);
}
function showModal() {
  if (addRestaurantModal) {
    addRestaurantModal.classList.remove("hidden");
  }
  if (modalContent) {
    setTimeout(() => {
      modalContent.classList.remove("opacity-0", "scale-95");
      modalContent.classList.add("opacity-100", "scale-100");
    }, 10);
  }
  populateThemeSelect();
  if (newRestaurantNameInput) {
    newRestaurantNameInput.focus();
  }
}
function hideModal() {
  if (modalContent) {
    modalContent.classList.remove("opacity-100", "scale-100");
    modalContent.classList.add("opacity-0", "scale-95");
  }
  setTimeout(() => {
    if (addRestaurantModal) {
      addRestaurantModal.classList.add("hidden");
    }
    if (addRestaurantForm) {
      addRestaurantForm.reset();
    }
  }, 200);
  loadRestaurants();
}
async function handleAddRestaurant(event) {
  event.preventDefault();
  if (!newRestaurantNameInput || !restaurantThemeSelect) return;
  const newRestaurantName = newRestaurantNameInput.value.trim();
  let selectedTheme = restaurantThemeSelect.value;
  if (newRestaurantName === "") {
    alert("\uC2DD\uB2F9\uBA85\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694! (\uC81C\uBC1C...)");
    return;
  }
  if (selectedTheme === "\uC0C8 \uD14C\uB9C8 \uCD94\uAC00") {
    const customTheme = prompt(
      "\uC0C8\uB85C\uC6B4 \uD14C\uB9C8 \uC774\uB984\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694! (\uC608: '\uB9E4\uC6B4\uB9DB \uCD94\uCC9C')"
    );
    if (customTheme && customTheme.trim() !== "") {
      selectedTheme = customTheme.trim();
    } else {
      alert("\uD14C\uB9C8 \uCD94\uAC00\uB97C \uCDE8\uC18C\uD588\uC5B4\uC694... (\uD560\uB9CE\uD558\uC54A)");
      return;
    }
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/restaurants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: newRestaurantName, theme: selectedTheme })
    });
    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMessage = responseData.details || responseData.error || `Failed to add restaurant (status: ${response.status})`;
      throw new Error(errorMessage);
    }
    loadRestaurants();
    hideModal();
    alert(
      `"${newRestaurantName}" \uC2DD\uB2F9\uC774 "${selectedTheme}" \uD14C\uB9C8\uC5D0 \uC131\uACF5\uC801\uC73C\uB85C \uCD94\uAC00\uB418\uC5C8\uC5B4\uC694!`
    );
  } catch (error) {
    console.error("Error details during add restaurant:", error);
    if (error instanceof Error) {
      alert(`\uC2DD\uB2F9 \uCD94\uAC00 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ${error.message}`);
    } else {
      alert(`\uC2DD\uB2F9 \uCD94\uAC00 \uC911 \uC54C \uC218 \uC5C6\uB294 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ${String(error)}`);
    }
  }
}
recommendButtons.forEach((button) => {
  button.addEventListener("click", handleRecommendation);
});
if (addRestaurantBtn) {
  addRestaurantBtn.addEventListener("click", showModal);
}
if (cancelAddBtn) {
  cancelAddBtn.addEventListener("click", hideModal);
}
if (addRestaurantForm) {
  addRestaurantForm.addEventListener("submit", handleAddRestaurant);
}
if (addRestaurantModal) {
  addRestaurantModal.addEventListener("click", (event) => {
    if (event.target === addRestaurantModal) {
      hideModal();
    }
  });
}
displayRestaurant("");
