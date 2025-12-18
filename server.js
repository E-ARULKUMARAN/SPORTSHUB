import express from "express";
import mysql from "mysql2";
import session from "express-session";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

dotenv.config();
const app = express();
const __dirname = path.resolve();

// ---------- MIDDLEWARES ----------
app.use(express.json());
app.use(bodyParser.json());

// ✅ Allow frontend access (VS Code Live Server ports)
app.use(
  cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
    credentials: true,
  })
);

// ✅ Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

// ✅ Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "sports-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);

// ---------- DATABASE ----------
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "sportsdb",
});

db.connect((err) => {
  if (err) console.error("❌ MySQL Connection Error:", err);
  else console.log("✅ Connected to MySQL Database (sportsdb)");
});

// ---------- ROUTES ----------

// ✅ Root (homepage)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ SIGNUP
app.post("/api/signup", (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    db.query("SELECT * FROM users WHERE username = ?", [username], (err, rows) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ success: false, message: "Database error." });
      }

      if (rows.length > 0) {
        return res
          .status(400)
          .json({ success: false, message: "Username already exists." });
      }

      db.query(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        [username, password, role],
        (err) => {
          if (err) {
            console.error("Insert error:", err);
            return res
              .status(500)
              .json({ success: false, message: "Failed to create user." });
          }

          res.json({ success: true, message: "Signup successful! Please login." });
        }
      );
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ✅ LOGIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Enter username and password" });
  }

  db.query(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, results) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res.status(500).json({ success: false, message: "Database error" });
      }

      if (results.length === 0) {
        return res.status(401).json({ success: false, message: "Invalid username or password" });
      }

      const user = results[0];
      req.session.user = user;

      res.json({
        success: true,
        username: user.username,
        role: user.role,
      });
    }
  );
});

// ✅ LOGOUT
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out successfully." });
  });
});

// ✅ GET CURRENT USER
app.get("/api/user", (req, res) => {
  if (req.session.user) {
    res.json({
      success: true,
      username: req.session.user.username,
      role: req.session.user.role,
    });
  } else {
    res.json({ success: false, message: "No user logged in." });
  }
});

// ✅ GET CATEGORIES
app.get("/api/categories", (req, res) => {
  db.query("SELECT DISTINCT category FROM items", (err, rows) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ success: false, message: "DB error." });
    }
    res.json(rows.map((r) => r.category));
  });
});

// ✅ GET ITEMS
app.get("/api/items", (req, res) => {
  const search = "%" + (req.query.search || "") + "%";
  db.query(
    "SELECT * FROM items WHERE name LIKE ? OR category LIKE ?",
    [search, search],
    (err, rows) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ success: false, message: "DB error." });
      }
      res.json(rows);
    }
  );
});

// ✅ UPDATE ITEM QUANTITY (Dealer Only)
app.put("/api/update-quantity/:id", (req, res) => {
  if (!req.session.user || req.session.user.role !== "dealer") {
    return res.status(403).json({ success: false, message: "Only dealers can update quantity." });
  }

  const id = req.params.id;
  const { quantity } = req.body;

  if (quantity < 0) {
    return res.status(400).json({ success: false, message: "Invalid quantity." });
  }

  db.query("UPDATE items SET quantity = ? WHERE id = ?", [quantity, id], (err, result) => {
    if (err) {
      console.error("DB update error:", err);
      return res.status(500).json({ success: false, message: "Database update error." });
    }
    res.json({ success: true, message: "Item quantity updated successfully!" });
  });
});

// 🗑️ DELETE ITEM ROUTE
app.delete("/api/delete-item/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM items WHERE id = ?";
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json({ success: true, message: "Item deleted successfully" });
  });
});

// 🔁 UPDATE QUANTITY ROUTE
app.put("/api/update-quantity/:id", (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (quantity < 0) {
    return res.status(400).json({ success: false, message: "Quantity cannot be negative" });
  }

  const query = "UPDATE items SET quantity = ? WHERE id = ?";
  db.query(query, [quantity, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json({ success: true, message: "Item quantity updated successfully" });
  });
});

// ➕ ADD NEW ITEM ROUTE
app.post("/api/add-item", (req, res) => {
  const { name, category, price, quantity, image_url } = req.body;

  if (!name || !category || !price || !quantity || !image_url) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  const query = "INSERT INTO items (name, category, price, quantity, image_url) VALUES (?, ?, ?, ?, ?)";
  db.query(query, [name, category, price, quantity, image_url], (err, result) => {
    if (err) {
      console.error("Error adding item:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json({ success: true, message: "Item added successfully!" });
  });
});


// ✅ ADD NEW ITEM (Dealer only)
app.post("/api/items", (req, res) => {
  const { name, category, price, quantity, image_url } = req.body;
  if (!name || !category || !price || !quantity || !image_url) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  const sql = "INSERT INTO items (name, category, price, quantity, image_url) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [name, category, price, quantity, image_url], (err, result) => {
    if (err) {
      console.error("Error adding item:", err);
      return res.status(500).json({ message: "Database error while adding item" });
    }
    res.json({ success: true, message: "Item added successfully!" });
  });
});


// ✅ DELETE ITEM (Dealer only)
app.delete("/api/items/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM items WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting item:", err);
      return res.status(500).json({ message: "Database error while deleting item" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json({ success: true, message: "Item deleted successfully!" });
  });
});

// ✅ BUY ITEM (Customer Only)
app.post("/api/buy/:id", async (req, res) => {
  const itemId = req.params.id;
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.json({ success: false, message: "Invalid quantity" });
  }

  try {
    // 1️⃣ Check item exists and get current stock
    const [rows] = await db.promise().query("SELECT quantity FROM items WHERE id = ?", [itemId]);

    if (rows.length === 0) {
      return res.json({ success: false, message: "Item not found" });
    }

    const currentStock = rows[0].quantity;

    // 2️⃣ Check if enough stock
    if (currentStock < quantity) {
      return res.json({
        success: false,
        message: `Not enough stock available! Only ${currentStock} left.`,
      });
    }

    // 3️⃣ Subtract purchased quantity
    const newStock = currentStock - quantity;

    // 4️⃣ Update stock in DB
    await db.promise().query("UPDATE items SET quantity = ? WHERE id = ?", [newStock, itemId]);

    // 5️⃣ Respond success
    res.json({
      success: true,
      message: `Stock updated successfully! Remaining stock: ${newStock}`,
    });
  } catch (err) {
    console.error("❌ Error during purchase:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// -------------------- POST /api/contact --------------------
app.post("/api/contact", (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const sql = "INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)";
    db.query(sql, [name, email, subject, message], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        res.status(201).json({ success: true, message: "Message sent successfully." });
    });
});



// ---------- 404 HANDLER ----------
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ---------- SERVER START ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
