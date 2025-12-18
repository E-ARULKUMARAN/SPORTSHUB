// ---------- MAIN.JS ----------
// Handles fetching items, categories, search, and buy redirect

document.addEventListener("DOMContentLoaded", async () => {
  const userInfo = await fetchUser();
  setupHeader(userInfo);
  loadCategories();
  loadItems();

  // Handle search
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      const query = document.getElementById("searchInput").value.trim();
      loadItems(query);
    });
  }

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await fetch("/api/logout");
      window.location.href = "login.html";
    });
  }
});

// ---------- Fetch logged-in user ----------
async function fetchUser() {
  try {
    const res = await fetch("/api/user");
    const user = await res.json();
    return user && user.username ? user : null;
  } catch (e) {
    console.error("User fetch error:", e);
    return null;
  }
}

// ---------- Setup Header ----------
function setupHeader(user) {
  const userSection = document.getElementById("userSection");
  if (!userSection) return;

  if (user) {
    userSection.innerHTML = `
      <div class="user-dropdown">
        <span>👤 ${user.username}</span>
        <div class="dropdown-content">
          <a href="#" id="switchAccount">Switch Account</a>
          <a href="#" id="logoutBtn">Logout</a>
        </div>
      </div>
    `;
  } else {
    userSection.innerHTML = `<a href="login.html" class="login-btn">Login / Signup</a>`;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await fetch("/api/logout");
      window.location.href = "login.html";
    });
  }

  const switchAccount = document.getElementById("switchAccount");
  if (switchAccount) {
    switchAccount.addEventListener("click", async () => {
      await fetch("/api/logout");
      window.location.href = "login.html";
    });
  }
}

// ---------- Load Categories ----------
async function loadCategories() {
  try {
    const res = await fetch("/api/categories");
    const categories = await res.json();
    const container = document.getElementById("categories");
    if (!container) return;

    container.innerHTML = "";
    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = "category-btn";
      btn.textContent = cat;
      btn.onclick = () => loadItems(cat);
      container.appendChild(btn);
    });
  } catch (e) {
    console.error("Error loading categories:", e);
  }
}

// ---------- Load Items ----------
async function loadItems(search = "") {
  try {
    const res = await fetch(`/api/items?search=${encodeURIComponent(search)}`);
    const items = await res.json();
    const container = document.getElementById("itemsContainer");
    if (!container) return;

    container.innerHTML = "";

    if (items.length === 0) {
      container.innerHTML = "<p class='empty'>No items found</p>";
      return;
    }

    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "item-card";
      div.innerHTML = `
        <img src="${item.image_url || 'https://via.placeholder.com/200'}" alt="${item.name}">
        <h3>${item.name}</h3>
        <p>Category: ${item.category}</p>
        <p>Price: ₹${item.price}</p>
        <p>Available: ${item.quantity}</p>
        <button class="buy-btn" onclick="buyItem(${item.id}, '${item.name}', ${item.price})" ${item.quantity <= 0 ? "disabled" : ""}>
          ${item.quantity > 0 ? "Buy Now" : "Out of Stock"}
        </button>
      `;
      container.appendChild(div);
    });
  } catch (e) {
    console.error("Error loading items:", e);
  }
}

// ---------- Buy Item (redirect to payment) ----------
function buyItem(id, name, price) {
  location.href = `payment.html?id=${id}&name=${encodeURIComponent(name)}&price=${price}`;
}

// ---------- For Dealer Page (optional reuse) ----------
async function loadDealerItems() {
  try {
    const res = await fetch("/api/dealer/items");
    const items = await res.json();
    const container = document.getElementById("dealerItems");
    if (!container) return;
    container.innerHTML = "";

    if (items.length === 0) {
      container.innerHTML = "<p>No items added yet.</p>";
      return;
    }

    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "item-card";
      div.innerHTML = `
        <img src="${item.image_url || 'https://via.placeholder.com/200'}" alt="${item.name}">
        <h3>${item.name}</h3>
        <p>Category: ${item.category}</p>
        <p>Price: ₹${item.price}</p>
        <p>Quantity: ${item.quantity}</p>
      `;
      container.appendChild(div);
    });
  } catch (e) {
    console.error("Error loading dealer items:", e);
  }
}

// ---------- Add Item (Dealer) ----------
async function addItem() {
  const name = document.getElementById("itemName").value;
  const item_id = document.getElementById("itemId").value;
  const category = document.getElementById("itemCategory").value;
  const price = document.getElementById("itemPrice").value;
  const quantity = document.getElementById("itemQuantity").value;
  const image_url = document.getElementById("itemImage").value;

  if (!name || !item_id || !category || !price || !quantity) {
    alert("Please fill all fields!");
    return;
  }

  const res = await fetch("/api/dealer/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, item_id, category, price, quantity, image_url })
  });

  const data = await res.json();
  alert(data.message);
  if (res.ok) {
    document.getElementById("addItemForm").reset();
    loadDealerItems();
  }
}
