// קבוע: URL של ה-API
var NETFREE_API_BASE = "https://www.google.com/~netfree/test-url?u=";

document.addEventListener("DOMContentLoaded", function () {
  var rescanBtn = document.getElementById("rescanBtn");
  var downloadOpenBtn = document.getElementById("downloadOpenBtn");
  var downloadUnknownBtn = document.getElementById("downloadUnknownBtn");
  var downloadBlockedBtn = document.getElementById("downloadBlockedBtn");
  var downloadErrorBtn = document.getElementById("downloadErrorBtn");
  var copyOpenBtn = document.getElementById("copyOpenBtn");
  var copyUnknownBtn = document.getElementById("copyUnknownBtn");
  var copyBlockedBtn = document.getElementById("copyBlockedBtn");
  var copyErrorBtn = document.getElementById("copyErrorBtn");
  var openWindowBtn = document.getElementById("openWindowBtn");
  var retryErrorsBtn = document.getElementById("retryErrorsBtn");

  initCollapseButtons();

  rescanBtn.addEventListener("click", function () {
    runScan();
  });

  downloadOpenBtn.addEventListener("click", function () {
    downloadListAsTxt(openUrls, "open-videos.txt");
  });

  downloadUnknownBtn.addEventListener("click", function () {
    downloadListAsTxt(unknownUrls, "unknown-videos.txt");
  });

  downloadBlockedBtn.addEventListener("click", function () {
    downloadListAsTxt(blockedUrls, "blocked-videos.txt");
  });

  downloadErrorBtn.addEventListener("click", function () {
    downloadListAsTxt(errorUrls, "error-videos.txt");
  });

  copyOpenBtn.addEventListener("click", function () {
    copyListToClipboard(openUrls);
  });

  copyUnknownBtn.addEventListener("click", function () {
    copyListToClipboard(unknownUrls);
  });

  copyBlockedBtn.addEventListener("click", function () {
    copyListToClipboard(blockedUrls);
  });

  copyErrorBtn.addEventListener("click", function () {
    copyListToClipboard(errorUrls);
  });

  openWindowBtn.addEventListener("click", function () {
    openInStandaloneWindow();
  });

  retryErrorsBtn.addEventListener("click", function () {
    retryErrorChecks();
  });

  runScan();
});

function initCollapseButtons() {
  var buttons = document.querySelectorAll(".collapse-btn");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var targetId = btn.getAttribute("data-target");
      var listEl = document.getElementById(targetId);
      if (!listEl) return;

      var expanded = btn.getAttribute("aria-expanded") === "true";
      if (expanded) {
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "▸";
        listEl.style.display = "none";
      } else {
        btn.setAttribute("aria-expanded", "true");
        btn.textContent = "▾";
        listEl.style.display = "";
      }
    });
  });
}

var openUrls = [];
var unknownUrls = [];
var blockedUrls = [];
var errorUrls = [];
var openSet = new Set();
var unknownSet = new Set();
var blockedSet = new Set();
var errorSet = new Set();
var totalUrlsCount = 0;

function setStatus(text) {
  var el = document.getElementById("statusText");
  if (el) el.textContent = text;
}

function setError(message) {
  var box = document.getElementById("errorBox");
  if (!box) return;
  if (!message) {
    box.hidden = true;
    box.textContent = "";
  } else {
    box.hidden = false;
    box.textContent = message;
  }
}

// פונקציה לשינוי ויזואלי של הכותרת
function setVisualStatus(finished) {
  var header = document.querySelector(".header");
  if (!header) return;
  
  if (finished) {
    header.classList.add("finished");
  } else {
    header.classList.remove("finished");
  }
}

function setProgress(current, total) {
  var progressBar = document.getElementById("progressBar");
  var progressCount = document.getElementById("progressCount");
  var progressTotal = document.getElementById("progressTotal");

  if (progressCount) progressCount.textContent = String(current);
  if (progressTotal) progressTotal.textContent = String(total);

  var percent = 0;
  if (total > 0) {
    percent = Math.round((current / total) * 100);
  }
  if (progressBar) {
    progressBar.style.width = percent + "%";
  }
}

function setSummary(totalFound, openCount, unknownCount, blockedCount, errorCount) {
  var totalFoundEl = document.getElementById("totalFound");
  var openCountEl = document.getElementById("openCount");
  var unknownCountEl = document.getElementById("unknownCount");
  var blockedCountEl = document.getElementById("blockedCount");
  var errorCountEl = document.getElementById("errorCount");

  if (totalFoundEl) totalFoundEl.textContent = String(totalFound);
  if (openCountEl) openCountEl.textContent = String(openCount);
  if (unknownCountEl) unknownCountEl.textContent = String(unknownCount);
  if (blockedCountEl) blockedCountEl.textContent = String(blockedCount);
  if (errorCountEl) errorCountEl.textContent = String(errorCount);
}

function clearLists() {
  var openListEl = document.getElementById("openList");
  var unknownListEl = document.getElementById("unknownList");
  var blockedListEl = document.getElementById("blockedList");
  var errorListEl = document.getElementById("errorList");

  if (openListEl) openListEl.innerHTML = "";
  if (unknownListEl) unknownListEl.innerHTML = "";
  if (blockedListEl) blockedListEl.innerHTML = "";
  if (errorListEl) errorListEl.innerHTML = "";

  openUrls = [];
  unknownUrls = [];
  blockedUrls = [];
  errorUrls = [];
  openSet = new Set();
  unknownSet = new Set();
  blockedSet = new Set();
  errorSet = new Set();
  totalUrlsCount = 0;

  var downloadOpenBtn = document.getElementById("downloadOpenBtn");
  var downloadUnknownBtn = document.getElementById("downloadUnknownBtn");
  var downloadBlockedBtn = document.getElementById("downloadBlockedBtn");
  var downloadErrorBtn = document.getElementById("downloadErrorBtn");
  var copyOpenBtn = document.getElementById("copyOpenBtn");
  var copyUnknownBtn = document.getElementById("copyUnknownBtn");
  var copyBlockedBtn = document.getElementById("copyBlockedBtn");
  var copyErrorBtn = document.getElementById("copyErrorBtn");
  var retryErrorsBtn = document.getElementById("retryErrorsBtn");

  if (downloadOpenBtn) downloadOpenBtn.disabled = true;
  if (downloadUnknownBtn) downloadUnknownBtn.disabled = true;
  if (downloadBlockedBtn) downloadBlockedBtn.disabled = true;
  if (downloadErrorBtn) downloadErrorBtn.disabled = true;
  if (copyOpenBtn) copyOpenBtn.disabled = true;
  if (copyUnknownBtn) copyUnknownBtn.disabled = true;
  if (copyBlockedBtn) copyBlockedBtn.disabled = true;
  if (copyErrorBtn) copyErrorBtn.disabled = true;
  if (retryErrorsBtn) retryErrorsBtn.disabled = true;
}

function runScan() {
  setError(null);
  clearLists();
  setVisualStatus(false); // איפוס צבע כותרת
  setStatus("סורק את העמוד ומוצא קישורי YouTube...");
  setProgress(0, 0);
  setSummary(0, 0, 0, 0, 0);

  chrome.windows.getLastFocused({ windowTypes: ["normal"] }, function (win) {
    if (chrome.runtime.lastError || !win) {
      setStatus("לא נמצא חלון דפדפן רגיל לסריקה.");
      return;
    }

    chrome.tabs.query({ active: true, windowId: win.id }, function (tabs) {
      if (chrome.runtime.lastError || !tabs || !tabs.length) {
        setStatus("לא נמצאה לשונית פעילה לסריקה.");
        return;
      }

      var tab = tabs[0];
      if (!tab.url || !/^https?:/i.test(tab.url)) {
        setStatus("יש לפתוח לשונית עם קישורי YouTube ואז ללחוץ על 'סריקה מחדש'.");
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: extractYouTubeLinksFromPage
        },
        function (results) {
          if (chrome.runtime.lastError) {
            setStatus("שגיאה בהרצת סקריפט בדף.");
            setError(chrome.runtime.lastError.message);
            return;
          }

          if (!results || !results.length) {
            setStatus("לא נמצאו תוצאות מהעמוד.");
            return;
          }

          var urls = results[0].result || [];
          urls = uniqueArray(urls);

          if (!urls.length) {
            setStatus("לא נמצאו קישורי YouTube בעמוד.");
            setSummary(0, 0, 0, 0, 0);
            return;
          }

          totalUrlsCount = urls.length;
          setStatus("בודק מול נטפרי (" + urls.length + " קישורים)...");
          setProgress(0, urls.length);
          setSummary(totalUrlsCount, 0, 0, 0, 0);

          checkUrlsSequential(urls);
        }
      );
    });
  });
}

function extractYouTubeLinksFromPage() {
  function normalizeUrl(url) {
    try {
      var u = new URL(url);
      if (u.hostname.indexOf("youtube.com") !== -1) {
        if (u.pathname === "/watch") {
          return "https://www.youtube.com/watch?v=" + (u.searchParams.get("v") || "");
        }
      }
      if (u.hostname.indexOf("youtu.be") !== -1) {
        var videoId = u.pathname.replace("/", "");
        return "https://www.youtube.com/watch?v=" + videoId;
      }
      return url;
    } catch (e) {
      return url;
    }
  }

  var anchors = Array.prototype.slice.call(
    document.querySelectorAll('a[href*="youtube.com/watch"], a[href*="youtu.be/"]')
  );

  var urls = anchors
    .map(function (a) { return a.href; })
    .filter(function (href) { return !!href; })
    .map(normalizeUrl)
    .filter(function (href) {
      return href.indexOf("https://www.youtube.com/watch") === 0;
    });

  var set = {};
  var unique = [];
  for (var i = 0; i < urls.length; i++) {
    var u = urls[i];
    if (!set[u]) {
      set[u] = true;
      unique.push(u);
    }
  }
  return unique;
}

function uniqueArray(arr) {
  var seen = {};
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var val = arr[i];
    if (!seen[val]) {
      seen[val] = true;
      out.push(val);
    }
  }
  return out;
}

function checkUrlsSequential(urls) {
  var index = 0;
  var total = urls.length;

  function next() {
    if (index >= total) {
      setStatus("הבדיקה הסתיימה בהצלחה!");
      setSummary(totalUrlsCount, openUrls.length, unknownUrls.length, blockedUrls.length, errorUrls.length);

      var downloadOpenBtn = document.getElementById("downloadOpenBtn");
      var downloadUnknownBtn = document.getElementById("downloadUnknownBtn");
      var downloadBlockedBtn = document.getElementById("downloadBlockedBtn");
      var downloadErrorBtn = document.getElementById("downloadErrorBtn");
      var copyOpenBtn = document.getElementById("copyOpenBtn");
      var copyUnknownBtn = document.getElementById("copyUnknownBtn");
      var copyBlockedBtn = document.getElementById("copyBlockedBtn");
      var copyErrorBtn = document.getElementById("copyErrorBtn");
      var retryErrorsBtn = document.getElementById("retryErrorsBtn");

      if (downloadOpenBtn && openUrls.length > 0) downloadOpenBtn.disabled = false;
      if (downloadUnknownBtn && unknownUrls.length > 0) downloadUnknownBtn.disabled = false;
      if (downloadBlockedBtn && blockedUrls.length > 0) downloadBlockedBtn.disabled = false;
      if (downloadErrorBtn && errorUrls.length > 0) downloadErrorBtn.disabled = false;
      if (copyOpenBtn && openUrls.length > 0) copyOpenBtn.disabled = false;
      if (copyUnknownBtn && unknownUrls.length > 0) copyUnknownBtn.disabled = false;
      if (copyBlockedBtn && blockedUrls.length > 0) copyBlockedBtn.disabled = false;
      if (copyErrorBtn && errorUrls.length > 0) copyErrorBtn.disabled = false;
      if (retryErrorsBtn && errorUrls.length > 0) retryErrorsBtn.disabled = false;

      // 1. הפעלת צליל (מוטמע)
      playCompleted();
      
      // 2. שינוי ויזואלי (צבע הכותרת)
      setVisualStatus(true);
      
      return;
    }

    var url = urls[index];
    var currentIndex = index + 1;
    setProgress(currentIndex, total);

    checkSingleUrl(url).then(function () {
      index++;
      next();
    });
  }

  next();
}

function checkSingleUrl(videoUrl) {
  var apiUrl = NETFREE_API_BASE + encodeURIComponent(videoUrl);

  return fetch(apiUrl, {
    method: "GET"
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Response not OK: " + response.status);
      }
      return response.json();
    })
    .then(function (data) {
      var blockStatus = data ? data.block : undefined;

      if (blockStatus === "deny") {
        if (!blockedSet.has(videoUrl)) {
          blockedSet.add(videoUrl);
          blockedUrls.push(videoUrl);
          appendUrlToList("blockedList", videoUrl, "חסום", "url-pill-blocked");
        }
      } else if (blockStatus === "unknown-video") {
        if (!unknownSet.has(videoUrl)) {
          unknownSet.add(videoUrl);
          unknownUrls.push(videoUrl);
          appendUrlToList("unknownList", videoUrl, "עדיין לא נבדק", "url-pill-unknown");
        }
      } else {
        if (!openSet.has(videoUrl)) {
          openSet.add(videoUrl);
          openUrls.push(videoUrl);
          appendUrlToList("openList", videoUrl, "פתוח", "url-pill-open");
        }
      }

      setSummary(totalUrlsCount, openUrls.length, unknownUrls.length, blockedUrls.length, errorUrls.length);
    })
    .catch(function (err) {
      if (!errorSet.has(videoUrl)) {
        errorSet.add(videoUrl);
        errorUrls.push(videoUrl);
        appendUrlToList("errorList", videoUrl, "שגיאה בבדיקה", "url-pill-error");
        setSummary(totalUrlsCount, openUrls.length, unknownUrls.length, blockedUrls.length, errorUrls.length);
      }
    });
}

function retryErrorChecks() {
  if (!errorUrls.length) return;

  var urlsToRetry = errorUrls.slice();
  var errorListEl = document.getElementById("errorList");
  var retryErrorsBtn = document.getElementById("retryErrorsBtn");
  var downloadErrorBtn = document.getElementById("downloadErrorBtn");
  var copyErrorBtn = document.getElementById("copyErrorBtn");

  if (errorListEl) errorListEl.innerHTML = "";
  errorUrls = [];
  errorSet = new Set();

  if (retryErrorsBtn) retryErrorsBtn.disabled = true;
  if (downloadErrorBtn) downloadErrorBtn.disabled = true;
  if (copyErrorBtn) copyErrorBtn.disabled = true;

  setError(null);
  setVisualStatus(false);
  setStatus("מנסה שוב לבדוק את הקישורים עם שגיאה (" + urlsToRetry.length + " קישורים)...");
  setProgress(0, urlsToRetry.length);
  setSummary(totalUrlsCount, openUrls.length, unknownUrls.length, blockedUrls.length, 0);

  checkUrlsSequential(urlsToRetry);
}

function appendUrlToList(listId, url, label, pillClass) {
  var listEl = document.getElementById(listId);
  if (!listEl) return;

  var li = document.createElement("li");
  li.className = "url-item";

  var spanUrl = document.createElement("span");
  spanUrl.className = "url-text";
  spanUrl.textContent = url;

  var pill = document.createElement("span");
  pill.className = "url-pill " + pillClass;
  pill.textContent = label;

  li.appendChild(spanUrl);
  li.appendChild(pill);

  listEl.appendChild(li);
}

function downloadListAsTxt(urls, filename) {
  if (!urls || !urls.length) return;

  var content = urls.join("\n");
  var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  var url = URL.createObjectURL(blob);

  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

function copyListToClipboard(urls) {
  if (!urls || !urls.length) return;
  var text = urls.join("\n");

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      setStatus("הרשימה הועתקה ללוח.");
    }).catch(function () {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  var textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    setStatus("הרשימה הועתקה ללוח.");
  } catch (err) {
    setError("לא ניתן להעתיק ללוח בדפדפן זה.");
  }
  document.body.removeChild(textarea);
}

function openInStandaloneWindow() {
  var url = chrome.runtime.getURL("popup.html");
  chrome.windows.create({
    url: url,
    type: "popup",
    width: 480,
    height: 720
  }, function () {
    window.close();
  });
}

function playCompleted() {
  try {
    // צליל "ביפ" נעים באמצעות Web Audio API
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    var ctx = new AudioContext();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.error("Audio play failed:", e);
  }
}