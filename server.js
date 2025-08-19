const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Variables de entorno
const SQUARE_ENV = process.env.SQUARE_ENV || "sandbox";
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || "YOUR_ACCESS_TOKEN";
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || "YOUR_LOCATION_ID";
const EVENT_PRICE = process.env.EVENT_PRICE || 25;
const TOTAL_SEATS = process.env.TOTAL_SEATS || 90;
const RESERVATION_MINUTES = process.env.RESERVATION_MINUTES || 30;

// Middlewares
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Debug endpoint
app.get("/api/debug/env", (req, res) => {
  res.json({
    SQUARE_ENV,
    SQUARE_ACCESS_TOKEN: SQUARE_ACCESS_TOKEN.slice(0, 6) + "...",
    SQUARE_LOCATION_ID,
    EVENT_PRICE,
    TOTAL_SEATS,
    RESERVATION_MINUTES
  });
});

// Comprar (Square Checkout API)
app.post("/api/buy", async (req, res) => {
  try {
    const fetch = require("node-fetch");
    const response = await fetch(`https://connect.squareupsandbox.com/v2/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        idempotency_key: Date.now().toString(),
        order: {
          location_id: SQUARE_LOCATION_ID,
          line_items: [
            {
              name: "Despecho Seattle Ticket",
              quantity: "1",
              base_price_money: {
                amount: EVENT_PRICE * 100,
                currency: "USD"
              }
            }
          ]
        },
        ask_for_shipping_address: false,
        redirect_url: "https://google.com" // Cambia esto por tu web real
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creando checkout" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
