// DOM 요소 가져오기
const restaurantNameElement = document.getElementById("restaurantName");
const recommendButtons = document.querySelectorAll(".recommend-btn");
const addRestaurantBtn = document.getElementById("addRestaurantBtn");
const addRestaurantModal = document.getElementById("addRestaurantModal");
const modalContent = document.getElementById("modalContent");
const addRestaurantForm = document.getElementById("addRestaurantForm");
const newRestaurantNameInput = document.getElementById("newRestaurantName");
const restaurantThemeSelect = document.getElementById("restaurantTheme");
const cancelAddBtn = document.getElementById("cancelAddBtn");

const API_BASE_URL = globalThis.location.hostname === "localhost"
  ? "http://localhost:8000"
  : globalThis.location.origin;

let restaurantData = {};

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
    restaurantData = data;
  } catch (error) {
    console.error("Error loading restaurants:", error);
    alert(
      "식당 목록을 불러오는 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.",
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
  void restaurantNameElement.offsetWidth; // Force reflow
  restaurantNameElement.textContent = name;
  restaurantNameElement.classList.add("animate-dramatic-appear-ppt");
}

function handleRecommendation(event) {
  const target = event.target;
  const theme = target.dataset.theme || null;
  if (!theme) return;
  const restaurants = theme === "random"
    ? Object.values(restaurantData).flat()
    : restaurantData[theme];

  if (restaurants && restaurants.length > 0) {
    const randomIndex = Math.floor(Math.random() * restaurants.length);
    const recommendedRestaurant = restaurants[randomIndex];
    displayRestaurant(recommendedRestaurant);
  } else {
    displayRestaurant("추천할 식당이 없어요! 엉엉 😭");
  }
}

function populateThemeSelect() {
  if (!restaurantThemeSelect) return;
  restaurantThemeSelect.innerHTML = ""; // 기존 옵션 지우기
  for (const theme in restaurantData) {
    const option = document.createElement("option");
    option.value = theme;
    option.textContent = theme;
    restaurantThemeSelect.appendChild(option);
  }
  // const newThemeOption = document.createElement("option");
  // newThemeOption.value = "새 테마 추가";
  // newThemeOption.textContent = "새 테마 추가...";
  // restaurantThemeSelect.appendChild(newThemeOption);
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
    alert("식당명을 입력해주세요! (제발...)");
    return;
  }

  if (selectedTheme === "새 테마 추가") {
    const customTheme = prompt(
      "새로운 테마 이름을 입력해주세요! (예: '매운맛 추천')",
    );
    if (customTheme && customTheme.trim() !== "") {
      selectedTheme = customTheme.trim();
      // No need to initialize restaurantData[selectedTheme] here,
      // the backend will handle the new theme creation or addition.
    } else {
      alert("테마 추가를 취소했어요... (할많하않)");
      return; // Exit if new theme creation is cancelled
    }
  }

  // Optimistically, we could add to the local restaurantData, but it's better
  // to rely on loadRestaurants() after a successful API call to get the true state.
  // The line `// restaurantData[selectedTheme].push(newRestaurantName);` was commented out, which is good.

  try {
    const response = await fetch(`${API_BASE_URL}/api/restaurants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: newRestaurantName, theme: selectedTheme }),
    });
    // Try to parse JSON, but default to an empty object if it fails or response is not JSON
    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Construct a more informative error message from potential response fields
      const errorMessage = responseData.details || responseData.error ||
        `Failed to add restaurant (status: ${response.status})`;
      throw new Error(errorMessage);
    }

    // Success path
    loadRestaurants(); // Reload data from server
    hideModal(); // Use the more general hideModal which also resets the form
    alert(
      `"${newRestaurantName}" 식당이 "${selectedTheme}" 테마에 성공적으로 추가되었어요!`,
    );
  } catch (error) {
    console.error("Error details during add restaurant:", error);
    // Type guard for error
    if (error instanceof Error) {
      alert(`식당 추가 중 오류가 발생했습니다: ${error.message}`);
    } else {
      alert(`식당 추가 중 알 수 없는 오류가 발생했습니다: ${String(error)}`);
    }
    // Optionally, consider if the modal should be hidden or kept open on error.
    // If kept open, the user can try again. If hidden, they lose input.
    // For now, let's assume we don't hide it on error so they can retry.
  }
  // The unconditional hideModal() and second success alert from the original code are removed
  // as they are now handled within the try/catch block.
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
