# SUK-Planungstool

Kollaboratives Online-Tool zur Planung von Unterrichtseinheiten zur Förderung der **soziotechnischen Urteilskompetenz** (SUK) im Informatikunterricht.

---

## Inhaltsverzeichnis

- [Funktionen](#funktionen)
- [Startseite](#startseite)
- [Planungsseite](#planungsseite)
- [Admin-Modus](#admin-modus)
- [Kollaboration & Datenspeicherung](#kollaboration--datenspeicherung)
- [Dateistruktur](#dateistruktur)
- [Lokales Testen](#lokales-testen)
- [Hosting auf Render](#hosting-auf-render)
- [Export- & Import-Format](#export--import-format)
- [Datenschutz](#datenschutz)
- [Lizenzen & Dependencies](#lizenzen--dependencies)

---

## Funktionen

### Übersicht

| Feature | Beschreibung |
|---|---|
| **Startseite** | Gruppenauswahl (1–8) als Klick-Kacheln |
| **Echtzeit-Synchronisation** | Änderungen sofort auf allen verbundenen Geräten sichtbar |
| **Soziotechnisches Problem** | Freitextfeld zur Beschreibung des Problems |
| **Jahrgangsstufe** | Checkboxes für Klassenstufen 5–13 (Mehrfachauswahl) |
| **Planungskarten** | Beliebig viele, bis zu 4 nebeneinander, responsive |
| **Drag & Drop** | Karten per Ziehen und Ablegen neu ordnen |
| **Lernziel-Farben** | Kartenrand färbt sich je nach gewähltem Lernziel |
| **JSON-Export/Import** | Daten lokal speichern und in neuer Session laden |
| **PDF-Export** | Komplette Planung über Browser-Druckdialog als PDF |
| **Server-Speicherung** | Automatische Synchronisation über In-Memory-Server |
| **Admin-Modus** | Passwortgeschützter Modus für Massen-Exporte |

---

## Startseite

Beim Öffnen des Tools erscheint eine Startseite mit:

- **Gruppen-Kacheln** (1–8): Klick öffnet die Planungsseite für die jeweilige Gruppe
- **Admin-Modus-Button** (unten): Öffnet ein Passwortfeld (Passwort: `Passwort`)

Im Admin-Modus stehen drei Aktionen zur Verfügung:

| Button | Wirkung |
|---|---|
| **Alle Gruppen als JSON speichern** | Lädt die aktuellen Daten aller 8 Gruppen als einzelne JSON-Datei herunter |
| **Alle Gruppen als PDF generieren** | Erzeugt für jede Gruppe mit Daten ein kombiniertes PDF über den Browser-Druckdialog |
| **Alle Gruppen löschen** | Löscht alle Gruppendaten vom Server (unwiderruflich!) |

---

## Planungsseite

### Toolbar (oben, sticky)

| Element | Funktion |
|---|---|
| **← Zurück** | Zurück zur Startseite (speichert automatisch) |
| **Gruppe X** | Zeigt die aktuelle Gruppennummer |
| **Status** | ⏳ Synchronisiere… / ✓ Gespeichert / ✗ Fehler |
| **💾 Speichern** | Export als JSON-Datei (lokaler Download) |
| **📥 Importieren** | Import einer JSON-Datei (wird auch auf Server gespeichert) |
| **📖 PDF** | Öffnet Browser-Druckdialog → „Als PDF speichern" |

### Kopf (Header)

- **Soziotechnisches Problem**: Mehrzeiliges Textfeld
- **Jahrgangsstufe**: 9 Checkboxes (5–13), Mehrfachauswahl möglich

### Planungskarten (Body)

#### Hinzufügen & Löschen

- **+ Planungskarte hinzufügen**: Fügt eine neue, leere Karte hinzu
- **×** (oben rechts auf jeder Karte): Löscht die Karte

#### Drag & Drop

- Karten lassen sich per **Ziehen und Ablegen** (Drag & Drop) neu ordnen
- Die Nummerierung wird automatisch aktualisiert

#### Karte: Drei Abschnitte

Jede Planungskarte enthält:

**1. Lernziel** (Checkboxes, Mehrfachauswahl)

| Nr. | Lernziel | Kartenrand-Farbe |
|---|---|---|
| 1 | Akteure analysieren | Blau |
| 2 | Relevante Ziele, Werte und Konflikte identifizieren | Grün |
| 3 | Nutzungs- und Gestaltungsoptionen generieren | Gelb |
| 4 | Optionen bewerten | Rot |
| 5 | Unsicherheiten reflektieren | Lila |
| 6 | Andere (mit Freitextfeld) | Grau |

> Das Textfeld bei „Andere" erscheint **nur**, wenn die Checkbox angekreuzt wird. Der Kartenrand färbt sich entsprechend der **ersten** (priorisierten) gewählten Lernzielfarbe.

**2. Evidenz/Produkt** – Mehrzeiliges Textfeld

**3. Tätigkeit** – Mehrzeiliges Textfeld

---

## Admin-Modus

Der Admin-Modus ermöglicht es der Lehrkraft, von einem Gerät aus alle Gruppendaten zu sichern:

1. Auf der Startseite auf **„Admin-Modus"** klicken
2. Passwort eingeben: `Passwort`
3. Drei Optionen erscheinen:
   - **Alle Gruppen als JSON speichern**: Lädt alle Gruppendaten als eine JSON-Datei herunter
   - **Alle Gruppen als PDF generieren**: Erstellt eine kombinierte Druckseite aller Gruppen
   - **Alle Gruppen löschen**: Löscht alle Daten vom Server

---

## Kollaboration & Datenspeicherung

### Wie die Synchronisation funktioniert

| Komponente | Rolle |
|---|---|
| **Node.js-Server** | Speichert alle Gruppendaten im Arbeitsspeicher (RAM) |
| **REST-API** | Client lädt/speichert Daten via HTTP-Requests |
| **Auto-Save** | Jede Änderung wird nach 800ms automatisch an den Server gesendet |
| **Polling** | Jede Gruppe fragt alle 3 Sekunden den Server nach Updates ab |
| **Status-Indikator** | Zeigt Sync-Status in der Toolbar an |

### Datenspeicherung

- **In-Memory:** Alle Daten leben im RAM des Servers
- **Keine Persistenz:** Beim Server-Neustart werden **alle Daten gelöscht**
- **Pro Gruppe:** Gruppen 1–8 sind unabhängig voneinander
- **Keine Datenbank:** Keine SQL, keine Datei-Speicherung, kein LocalStorage

### Kollaborations-Workflow

1. Alle Gruppen öffnen dieselbe URL (z.B. `https://suk-tool.onrender.com`)
2. Jede Gruppe wählt ihre Nummer auf der Startseite
3. Änderungen werden automatisch synchronisiert – auf allen Geräten sichtbar
4. Der Status-Indikator zeigt: ⏳ Sync → ✓ Gespeichert
5. Nach Arbeitsende: Admin-Modus → JSON + PDF Export
6. Optional: Admin → „Alle Gruppen löschen" (bereitet auf nächste Session vor)

---

## Dateistruktur

```
suk-planning-tool/
├── server.js           # Node.js-Server mit Express + In-Memory-Speicher
├── package.json        # npm-Dependencies (express)
├── index.html          # Frontend-HTML (Startseite + Planungsseite)
├── style.css           # Styles (Layout, Grid, Farben, Print-Styles)
├── app.js              # Client-seitige Logik (API, Sync, Karten)
└── README.md           # Diese Datei
```

---

## Lokales Testen

### 1. Node.js installieren

[Node.js](https://nodejs.org) (LTS) herunterladen und installieren.

### 2. Dependencies installieren

```bash
cd suk-planning-tool
npm install
```

### 3. Server starten

```bash
npm start
```

### 4. Im Browser öffnen

[http://localhost:3000](http://localhost:3000)

Für echtes Kollaborations-Testing: Mehrere Browser-Tabs öffnen, verschiedene Gruppen auswählen, und Änderungen beobachten.

---

## Hosting auf Render

Das Tool wird als **Render Web Service** gehostet:

### 1. GitHub-Repository erstellen

```bash
cd suk-planning-tool
git init
git add .
git commit -m "Initial commit: SUK-Planungstool"
git branch -M main
git remote add origin <deine-github-url>.git
git push -u origin main
```

### 2. Auf Render bereitstellen

1. Auf [render.com](https://render.com) einloggen / Konto erstellen
2. **New → Web Service** wählen
3. Das GitHub-Repository verbinden
4. Einstellungen:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
   - **Plan:** Free
5. Auf **Create Web Service** klicken

Render stellt das Tool unter einer `*.onrender.com`-Subdomain bereit.

### Wichtige Hinweise

- **Free-Tier:** Der Server „schläft" nach 15 Min. Inaktivität und braucht ~30s zum Aufwachen
- **Keine Daten-Persistenz:** Beim Neustart (Free-Tier, Update etc.) werden alle Daten gelöscht
- **Empfohlener Ablauf:** Vor dem Ende der Session → Admin-Export (JSON + PDF)

---

## Export- & Import-Format

### Einzelgruppe (JSON)

```json
{
  "version": 1,
  "updatedAt": "2025-01-15T14:30:00.000Z",
  "group": 3,
  "problem": "Soll KI-gestütztes Aufsatzkorrigieren im Deutschunterricht eingesetzt werden?",
  "grades": ["8", "9"],
  "cards": [
    {
      "id": 1,
      "objectives": ["Akteure analysieren", "Optionen bewerten"],
      "otherText": "",
      "evidence": "Studie zeigt...",
      "activity": "Schülerinnen diskutieren in Gruppen..."
    }
  ]
}
```

### Alle Gruppen (Admin-Export, JSON)

```json
{
  "version": 1,
  "exportedAt": "2025-01-15T15:00:00.000Z",
  "groups": {
    "1": { "group": 1, "problem": "...", "grades": [], "cards": [] },
    "3": { "group": 3, "problem": "...", "grades": [], "cards": [] }
  }
}
```

### Felder

| Feld | Typ | Beschreibung |
|---|---|---|
| `version` | Zahl | Schema-Version (derzeit `1`) |
| `updatedAt` / `exportedAt` | ISO-8601 | Zeitstempel |
| `group` | Zahl | Gruppennummer (1–8) |
| `problem` | String | Text des soziotechnischen Problems |
| `grades` | Array\<String\> | Gewählte Jahrgangsstufen |
| `cards` | Array\<Objekt\> | Liste der Planungskarten |
| `cards[].objectives` | Array\<String\> | Angekreuzte Lernziele |
| `cards[].otherText` | String | Freitext bei „Andere" |
| `cards[].evidence` | String | Inhalt des Evidenz/Produkt-Feldes |
| `cards[].activity` | String | Inhalt des Tätigkeit-Feldes |

---

## Datenschutz

- **Keine Datenbank:** Daten leben nur im RAM des Servers
- **Kein Tracking:** Keine Analytics, keine Cookies
- **In-Memory:** Daten verschwinden beim Server-Neustart automatisch
- **Export:** JSON/PDF werden clientseitig generiert

---

## Lizenzen & Dependencies

| Bibliothek | Lizenz | Quelle |
|---|---|---|
| [Express.js](https://expressjs.com) | MIT | npm |

Alle übrigen Teile des Tools sind ursprünglicher Code.
