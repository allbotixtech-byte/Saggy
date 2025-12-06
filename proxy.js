const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// IMPORTANT FIX FOR node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw581kH9Er-QnGv7p_uenKicJIvyRBzLK6YU8-uoFZa2Zkr0aYrFUtX1l30G4hpHaZ6/exec";

app.post("/upload", async (req, res) => {
  console.log("Request body received:", req.body)

  try {
    const r = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });

    const text = await r.text()
    console.log("GAS raw response:", text);

    res.setHeader("Content-Type", "application/json");
    res.send(text);

  } catch(e){
    console.error("Proxy Error:", e);
    res.status(500).json({ error: e.toString() })
  }
});

app.listen(3000, () => console.log("Proxy running on http://localhost:3000"));
