// ════════════════════════════════════════════════════════════════
//  VJudge Extractor — background.js
//  Extracts rank data from an open VJudge contest rank page
//  and sends it to the merger site via postMessage.
// ════════════════════════════════════════════════════════════════

const MERGER_SITE_PATTERNS = [
  "ashiknur.github.io/vjudge_contest_merger/",   // ← your GitHub Pages domain
  "localhost",             // for local testing
  "127.0.0.1",
];

chrome.action.onClicked.addListener(async (tab) => {
  try {

    // ── 0. Make sure we're on a VJudge contest page ──────────────
    if (!tab.url || !tab.url.includes("vjudge.net/contest/")) {
      await alertTab(tab.id, "❌ Please open a VJudge contest rank page first!\n\nURL should look like:\nvjudge.net/contest/781164#rank");
      return;
    }

    // ── 1. Extract contest data from the VJudge tab ──────────────
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractVJudgeData,
    });

    const payload = result?.result;

    if (!payload || payload.error) {
      const msg = payload?.error || "No data found";
      console.error("❌ Extraction failed:", msg);
      await alertTab(tab.id, `❌ Failed to extract data:\n${msg}\n\nMake sure the rank table is visible and fully loaded.`);
      return;
    }

    if (!payload.participants || payload.participants.length === 0) {
      await alertTab(tab.id, "❌ No participants found in the rank table.\n\nMake sure the #rank tab is active and scroll down so rows are rendered.");
      return;
    }

    console.log(`✅ Extracted ${payload.participants.length} participants from "${payload.contestName}"`);

    // ── 2. Find the merger site tab ───────────────────────────────
    const allTabs = await chrome.tabs.query({});
    const siteTab = allTabs.find(t =>
      t.url && MERGER_SITE_PATTERNS.some(p => t.url.includes(p))
    );

    if (!siteTab) {
      await alertTab(tab.id,
        `❌ Merger site not found!\n\nOpen your site in another tab first:\n${MERGER_SITE_PATTERNS[0]}`
      );
      return;
    }

    // ── 3. Send data to merger site via postMessage ───────────────
    await chrome.scripting.executeScript({
      target: { tabId: siteTab.id },
      func: (data) => {
        console.log("📩 VJudge Extractor → received:", data.participants.length, "participants");
        window.postMessage({ type: "VJUDGE_DATA", payload: data.participants }, "*");
      },
      args: [payload],
    });

    // ── 4. Flash success on the VJudge tab ───────────────────────
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (name, count) => {
        // Toast-style notification (no blocking alert)
        const div = document.createElement("div");
        div.style.cssText = `
          position:fixed; bottom:24px; right:24px; z-index:99999;
          background:#0f172a; color:#22d3a5; border:1px solid #22d3a5;
          border-radius:10px; padding:14px 20px; font-family:monospace;
          font-size:14px; box-shadow:0 4px 24px rgba(0,0,0,.5);
          animation:fadeIn .3s ease;
        `;
        div.innerHTML = `✅ <b>${count} participants</b> from <b>${name}</b> sent to merger!`;
        const style = document.createElement("style");
        style.textContent = `@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;
        document.head.appendChild(style);
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 4000);
      },
      args: [payload.contestName, payload.participants.length],
    });

    // Also focus the merger site tab
    await chrome.tabs.update(siteTab.id, { active: true });

    console.log("✅ Data sent successfully to merger site");

  } catch (err) {
    console.error("❌ Extension error:", err);
    try {
      await alertTab(tab.id, `❌ Extension error:\n${err.message}`);
    } catch (_) {}
  }
});


// ════════════════════════════════════════════════════════════════
//  Injected into the VJudge page — runs in page context
//  Uses the exact DOM structure from DevTools screenshots:
//
//  table#contest-rank-table > tbody > tr[data-u][data-c]
//    td.rank              → rank number
//    td.team              → a[href="/user/Handle"] with title="Handle FullName"
//    td.solved span       → solved count
// ════════════════════════════════════════════════════════════════
function extractVJudgeData() {
  try {
    // ── Contest name & ID ──
    const contestName =
      document.querySelector('#time-info h3')?.innerText?.trim() ||
      document.querySelector('.contest-title')?.innerText?.trim() ||
      document.title?.replace(/\s*-\s*VJudge.*/, '').trim() ||
      "Unknown Contest";

    const contestIdMatch = location.pathname.match(/\/contest\/(\d+)/);
    const contestId = contestIdMatch ? contestIdMatch[1] : "";

    // ── Rank table rows ──
    const table = document.getElementById("contest-rank-table");
    if (!table) {
      return { error: "Could not find #contest-rank-table. Make sure the Rank tab is selected." };
    }

    const rows = Array.from(table.querySelectorAll("tbody tr"));
    if (rows.length === 0) {
      return { error: "Rank table is empty. Try scrolling down to trigger rendering." };
    }

    const participants = [];
    let autoRank = 1;

    rows.forEach(tr => {
      // ── Rank ──
      const rankTd = tr.querySelector("td.rank");
      let rank = rankTd ? parseInt(rankTd.innerText.trim()) : NaN;
      if (isNaN(rank) || rank <= 0) rank = autoRank;

      // ── Handle ──
      // Primary: a[href*="/user/"] title="Handle FullName" → first token
      let handle = "";
      const teamTd = tr.querySelector("td.team");
      if (teamTd) {
        const link = teamTd.querySelector('a[href*="/user/"]');
        if (link) {
          // title attr = "EmonHasan6768 Emon Hasan" → take first token
          const title = (link.getAttribute("title") || "").trim();
          if (title) handle = title.split(/\s+/)[0];

          // fallback: /user/EmonHasan6768 → last path segment
          if (!handle) {
            const href = link.getAttribute("href") || "";
            handle = href.split("/").filter(Boolean).pop() || "";
          }

          // fallback: link text (may include display name)
          if (!handle) handle = link.innerText.trim().split(/\s+/)[0];
        }

        // fallback: data-u attribute on the row
        if (!handle) handle = tr.getAttribute("data-u") || "";
      }

      if (!handle) return; // skip rows with no handle

      // ── Solved ──
      const solvedTd = tr.querySelector("td.solved");
      let solved = 0;
      if (solvedTd) {
        const span = solvedTd.querySelector("span");
        solved = parseInt((span || solvedTd).innerText.trim()) || 0;
      }

      participants.push({ contest: contestName, contestId, handle, rank, solved });
      autoRank++;
    });

    return { contestName, contestId, participants };

  } catch (err) {
    return { error: err.message };
  }
}


// ── Helper: non-blocking alert replacement ──
async function alertTab(tabId, message) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (msg) => {
      const div = document.createElement("div");
      div.style.cssText = `
        position:fixed; top:20px; right:20px; z-index:99999; max-width:360px;
        background:#1e293b; color:#f87171; border:1px solid #f87171;
        border-radius:10px; padding:14px 18px; font-family:monospace; font-size:13px;
        white-space:pre-wrap; box-shadow:0 4px 24px rgba(0,0,0,.6);
      `;
      div.textContent = msg;
      const btn = document.createElement("button");
      btn.textContent = "✕";
      btn.style.cssText = "float:right;background:none;border:none;color:#f87171;cursor:pointer;font-size:16px;margin:-4px -4px 0 8px";
      btn.onclick = () => div.remove();
      div.prepend(btn);
      document.body.appendChild(div);
      setTimeout(() => div.remove(), 8000);
    },
    args: [message],
  });
}
