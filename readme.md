# 🏆 VJudge Contest Rank Merger

A pure frontend web app that merges multiple [VJudge](https://vjudge.net) contest rankings into a single fair leaderboard using a custom weighted scoring formula.

---

## 📁 Repository Structure

```
/
├── index.html              ← Main web application
├── README.md               ← This file
└── extension/
    ├── manifest.json       ← Chrome extension manifest
    └── background.js       ← Extension service worker
```

---

## 🚀 Installation

### 1. Install the Chrome Extension

The extension lets you extract ranking data directly from an open VJudge contest page with one click.

1. Open **Chrome** and navigate to `chrome://extensions`
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repository
5. The **VJudge Rank Extractor** icon will appear in your toolbar

---

## 🖥️ How to Use

### Step 1 — Open the App

Go to: **[https://ashiknur.github.io/vjudge_contest_merger/](https://ashiknur.github.io/vjudge_contest_merger/)**

---

### Step 2 — Set Up the Extension (one-time)

Before loading data, make sure the **VJudge Rank Extractor** Chrome extension is installed (see [Installation](#-installation) above). You'll use it to push contest data into the app with a single click.

---

### Step 3 — Enter Number of Contests

On the home screen, type how many contests you want to merge (e.g. `3`) and click **Configure Contests**.

---

### Step 4 — Load Data for Each Contest

Each contest slot has two modes — pick one:

#### 🧩 Extension Mode *(recommended)*

1. In the merger app, leave the slot on **🧩 Extension** (default)
2. In a new tab, open the VJudge contest rank page:
   ```
   https://vjudge.net/contest/781164#rank
   ```
3. Wait for the rank table to fully load
4. Click the **VJudge Rank Extractor** icon in your Chrome toolbar
5. The extension extracts all rank data and sends it to the merger tab automatically
6. The slot switches to **📋 Manual Paste** mode and shows the extracted data in the text area — review and edit if needed

> Repeat for each contest slot. You can have multiple VJudge tabs open and click the extension on each one in sequence.

#### 📋 Manual Paste Mode

1. Click **📋 Manual Paste** on the slot
2. Enter the contest name
3. Paste rank data in CSV format — one participant per line:
   ```
   handle,rank,solved
   alice,1,7
   bob,2,6
   charlie,3,5
   ```
   You can copy rows directly from the VJudge rank table, then reformat as needed.

---

### Step 5 — Calculate

Once all contest slots have data, click **⚡ Calculate Ranking**.

The app will:
- Compute BP, SP, PP, and CP for every participant in every contest
- Build the merged leaderboard with bonus points
- Display per-contest breakdown tables and the final ranked leaderboard

---

### Step 6 — Add Recording Links *(optional)*

In each per-contest table, there is a **Recording Link** column. Paste a video URL (YouTube, Google Drive, etc.) next to each participant's row. These links will be included in the Excel export if filled.

---

### Step 7 — Export

Click **Export Excel (.xlsx)** to download a workbook with:
- A **Final Leaderboard** sheet (first tab)
- One sheet per contest with full score breakdown
- Recording links included automatically if any were entered

---

## 📐 How Ranking Is Calculated

Each participant in each contest receives a **Contest Point (CP)**, computed from three components:

### 1. Base Point (BP)

Rewards finishing rank — higher rank = more points. Decays exponentially:

```
BP = 4.00 × (0.98)^(rank - 1)
```

| Rank | BP     |
|------|--------|
| 1    | 4.0000 |
| 2    | 3.9200 |
| 5    | 3.6947 |
| 10   | 3.3447 |
| 20   | 2.7350 |
| 50   | 1.3542 |

---

### 2. Solve Point (SP)

Rewards solving more problems relative to the top solver in that contest:

```
SP = √(S / Smax)
```

Where:
- `S` = number of problems solved by this participant
- `Smax` = maximum problems solved by anyone in this contest

A participant who solved half the max gets `SP = √0.5 ≈ 0.707`.

---

### 3. Participation Point (PP)

Rewards participating in a **more popular** contest. Normalised across all contests being merged:

```
PP = max( (Xi − Xmin) / (Xmax − Xmin) , 0.1 )
```

Where:
- `Xi` = participant count of this contest
- `Xmin` = lowest participant count across all contests
- `Xmax` = highest participant count across all contests
- Minimum PP is always `0.1` (even the smallest contest counts)

PP is the **same value for every participant in the same contest** — it reflects the contest, not the individual.

---

### 4. Contest Point (CP)

```
CP = (BP × SP) + PP
```

---

### 5. Bonus

A participant who appeared in **every single contest** being merged earns a bonus:

```
Bonus = 0.5 × N
```

Where `N` = total number of contests merged. This rewards consistent participation.

---

### 6. Final Score

```
Final Score = Σ CP  +  Bonus
```

Participants are ranked by Final Score (descending). Anyone absent from a contest gets `CP = 0` for that contest.

---

## ✨ Features

### Data Input

| Mode | Description |
|------|-------------|
| 🧩 **Extension** | Click the Chrome extension while on a VJudge rank page. Data auto-fills the slot and switches to Manual for review. |
| 📋 **Manual Paste** | Paste rank data in CSV format: `handle,rank,solved` — one participant per line. |

- After the extension pushes data, it is automatically displayed in the editable text area so you can review, correct, or add rows before calculating.
- The extension also works via a **queue**: if you push data before switching a slot to Extension mode, the data is held and fills the next available slot when you do.

---

### Per-Contest Tables

For each contest a detailed breakdown table is shown:

| Column | Description |
|--------|-------------|
| Handle | VJudge username |
| Recording Link | Editable field — paste a video/screencast URL per participant |
| Rank | Contest rank |
| Solved | Problems solved |
| BP | Base Point |
| SP | Solve Point |
| PP | Participation Point |
| CP | Contest Point = (BP × SP) + PP |

---

### Final Leaderboard

- All participants merged across all contests
- Per-contest CP columns side by side
- Bonus column (only non-zero if present in all contests)
- Final Score column with a visual score bar
- 🥇 🥈 🥉 highlights for top 3
- Sorted by Final Score (descending)

---

### Export to Excel (.xlsx)

Click **Export Excel (.xlsx)** to download a multi-sheet workbook:

- **Sheet 1 — Final Leaderboard**: complete merged rankings with all CP columns, bonus, and formula reference notes
- **Sheets 2–N — Per Contest**: one sheet per contest with Handle, Rank, Solved, BP, SP, PP, CP

**Recording links are included smartly:**
- If all recording link fields are empty for a contest → the Recording column is **omitted**
- If at least one link is filled → a `Recording Link` column is **included** in that contest's sheet

---

### Other Features

- **Step-by-step UI** — guided 3-step flow: Setup → Data → Results
- **Editable data** — after any data load, the CSV textarea is always editable before calculating
- **Clear Slot** — reset any extension slot back to waiting state
- **Queue system** — extension data pushed before a slot is ready is queued and auto-filled when the slot becomes available
- **Responsive design** — works on desktop and mobile
- **No backend** — pure HTML + CSS + JavaScript, zero server required

---

## 🤝 Contributing

Contributions are welcome! Here's how to get involved:

### Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/<repo-name>.git
   cd <repo-name>
   ```
3. Open `index.html` directly in your browser — no build step needed
4. For extension changes, reload it at `chrome://extensions` after editing

### What You Can Work On

- 🐛 **Bug fixes** — open an issue first to discuss the problem
- ✨ **New features** — check existing issues or open a new one to propose
- 🎨 **UI/UX improvements** — better design, accessibility, mobile experience
- 📐 **Formula improvements** — better scoring models or configurable weights
- 🌍 **Codeforces / other platforms** — extend beyond VJudge
- 🧩 **Extension improvements** — support more browsers (Firefox), better handle extraction
- 📖 **Documentation** — improve this README, add examples

### Submitting a Pull Request

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Commit with a clear message:
   ```bash
   git commit -m "feat: add configurable BP decay rate"
   ```
4. Push and open a **Pull Request** against `main`
5. Describe what you changed and why

### Code Style

- Plain ES6+ JavaScript — no frameworks, no build tools
- Keep the extension and site code in sync (same handle-extraction logic)
- Comment non-obvious formula steps
- Test with at least 2 contests before submitting

### Reporting Issues

Open a GitHub Issue with:
- What you expected to happen
- What actually happened
- Contest ID(s) involved (if relevant)
- Browser and OS

---

## 📄 License

MIT — free to use, modify, and distribute.
