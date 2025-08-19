// server.js — Despecho Seattle (Payment Link con Square + endpoints básicos)
// CommonJS (require) y node-fetch v2 (coincide con tu package.json)

const express = require("express");
const path = require("path");
const fetch = require("node-fetch"); // v2.x
const crypto = require("crypto");

// ====== App ======
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (public/index.html)
app.use(express.static(path.join(__dirname, "public")));

// ====== ENV ======
let {
  SQUARE_ENV = "sandbox",
  SQUARE_ACCESS_TOKEN = "",
  SQUARE_LOCATION_ID = "",
  EVENT_PRICE = "25",
  PORT
} = process.env;

// Limpieza por si hay espacios pegados al copiar
SQUARE_ENV = String(SQUARE_ENV || "sandbox").trim().toLowerCase();
SQUARE_ACCESS_TOKEN = String(SQUARE_ACCESS_TOKEN || "").trim();
SQUARE_LOCATION_ID = String(SQUARE_LOCATION_ID || "").trim();
EVENT_PRICE = String(EVENT_PRICE || "25").trim();

const SQUARE_BASE =
  SQUARE_ENV === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

console.log("🟣 Square env:", SQUARE_ENV, "— base:", SQUARE_BASE);

// ====== Endpoints ======

// Debug: ver qué envs está leyendo el server (token enmascarado)
app.get("/api/debug/env", (_req, res) => {
  const mask = (s) => (s ? s.slice(0, 6) + "…" + s.slice(-4) : null);
  res.json({
    SQUARE_ENV,
    SQUARE_LOCATION_ID,
    SQUARE_ACCESS_TOKEN_prefix: mask(SQUARE_ACCESS_TOKEN),
    EVENT_PRICE
  });
});

// Crear Payment Link (Checkout) en Square
app.post("/api/buy", async (_req, res) => {
  try {
    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      return res.status(500).json({
        error: "Faltan credenciales de Square",
        details: "Configura SQUARE_ACCESS_TOKEN y SQUARE_LOCATION_ID"
      });
    }

    const idempotencyKey = crypto.randomBytes(16).toString("hex");

    const body = {
      idempotency_key: idempotencyKey,
      quick_pay: {
        name: "Despecho Seattle – Entrada",
        price_money: {
          amount: Math.round(Number(EVENT_PRICE) * 100), // USD en centavos
          currency: "USD"
        },
        location_id: SQUARE_LOCATION_ID
      },
      checkout_options: {
        ask_for_shipping_address: false
      }
    };

    const rsp = await fetch(`${SQUARE_BASE}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        // Usa la versión que soporte tu app; esta es un ejemplo reciente
        "Square-Version": "2025-07-16"
      },
      body: JSON.stringify(body)
    });

    const data = await rsp.json();

    if (!rsp.ok) {
      console.error("❌ Square error:", data);
      return res.status(500).json({ error: "Square error", details: data });
    }

    // Respuesta esperada: { payment_link: { url: "https://..." } }
    const url =
      data?.payment_link?.url ||
      data?.checkout?.checkout_page_url ||
      null;

    if (!url) {
      console.error("⚠️ Respuesta sin URL de checkout:", data);
      return res.status(500).json({ error: "Respuesta de Square sin URL", details: data });
    }

    // Para el front: devolvemos siempre la misma clave
    return res.json({ checkout_page_url: url });
  } catch (e) {
    console.error("❌ Error /api/buy:", e);
    return res.status(500).json({ error: "Server error", details: String(e) });
  }
});

// ====== Start ======
const BIND_PORT = Number(process.env.PORT || PORT || 3000);
app.listen(BIND_PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor listo en puerto ${BIND_PORT}`);
});
