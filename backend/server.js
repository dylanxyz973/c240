const express = require("express");
const path = require("path");
const app = express();

app.use(express.json());

// serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

// SAVE PROFILE 
app.post("/save-profile", async (req, res) => {
  try {
    console.log("Incoming profile:", req.body);

    const response = await fetch(
      "https://n8ngc.codeblazar.org/webhook/save-profile",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      }
    );

    const text = await response.text();
    console.log("n8n raw response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.json(data);

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      success: false,
      message: "Server failed",
      error: error.message
    });
  }
});

// FIND FRIENDS
app.post("/find-friends", async (req, res) => {
  try {
    console.log("Find friends request:", req.body);

    const response = await fetch(
      "https://n8ngc.codeblazar.org/webhook/find-friends",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      }
    );

    const text = await response.text();
    console.log("n8n response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.json(data);

  } catch (error) {
    console.error("Find friends error:", error);
    res.status(500).json({
      success: false,
      message: "Find friends failed",
      error: error.message
    });
  }
});

// TEST ROUTE (IMPORTANT FOR DEBUGGING)
app.get("/test", (req, res) => {
  res.send("Server is working perfectly");
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});