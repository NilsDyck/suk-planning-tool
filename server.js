const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* ═══════════════════════════════════════════
   In-Memory Storage (verschwindet nach Neustart)
   ═══════════════════════════════════════════ */

const groups = {};

/* ═══════════════════════════════════════════
   Middleware
   ═══════════════════════════════════════════ */

app.use(express.json());
app.use(express.static(path.join(__dirname)));

/* ═══════════════════════════════════════════
   API: Gruppen-Daten
   ═══════════════════════════════════════════ */

/* Daten einer Gruppe laden */
app.get("/api/groups/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1 || id > 8) {
    return res.status(400).json({ error: "Ungültige Gruppen-ID (1-8)" });
  }
  const data = groups[id] || null;
  res.json(data ? { ...data } : null);
});

/* Daten einer Gruppe speichern */
app.post("/api/groups/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1 || id > 8) {
    return res.status(400).json({ error: "Ungültige Gruppen-ID (1-8)" });
  }
  groups[id] = req.body;
  res.json({ ok: true, group: id });
});

/* Daten aller Gruppen laden (Admin) */
app.get("/api/groups/all", (req, res) => {
  const result = {};
  for (let i = 1; i <= 8; i++) {
    if (groups[i]) {
      result[i] = { ...groups[i] };
    }
  }
  res.json(result);
});

/* Daten einer Gruppe löschen */
app.delete("/api/groups/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1 || id > 8) {
    return res.status(400).json({ error: "Ungültige Gruppen-ID (1-8)" });
  }
  delete groups[id];
  res.json({ ok: true, group: id });
});

/* Alle Gruppen-Daten löschen (Admin) */
app.delete("/api/groups/all", (req, res) => {
  for (let i = 1; i <= 8; i++) {
    delete groups[i];
  }
  res.json({ ok: true, cleared: true });
});

/* ═══════════════════════════════════════════
   Static Files & Client Routing
   ═══════════════════════════════════════════ */

/* Jede andere Route → index.html */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log("SUK-Planungstool läuft auf Port " + PORT);
});
