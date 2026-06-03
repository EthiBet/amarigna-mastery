// =====================================================================
// AUDIO.JS — Text-to-Speech, Speech Recognition, and Normalizer
// =====================================================================

const Audio = (() => {
  let amharicVoice = null;
  let voicesLoaded = false;
  let activeRec = null;

  // ── Voice loading ─────────────────────────────────────────────
  function loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    amharicVoice = voices.find(v => v.lang === 'am-ET') ||
                   voices.find(v => v.lang.startsWith('am')) || null;
    voicesLoaded = true;
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }

  // ── Public: speak text ────────────────────────────────────────
  // Tries Amharic voice for Amharic text; always falls back gracefully
  function speakText(text, lang = 'am-ET') {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate  = 0.82;
    utter.pitch = 1.0;

    if (lang === 'am-ET' && amharicVoice) {
      utter.voice = amharicVoice;
      utter.lang  = 'am-ET';
    } else if (lang === 'am-ET') {
      // No native Amharic voice — read transliteration hint (silent fail is ok)
      utter.lang = 'am-ET';
    } else {
      utter.lang = lang; // 'en-US', etc.
    }

    window.speechSynthesis.speak(utter);
  }

  function speakEnglish(text) {
    speakText(text, 'en-US');
  }

  // ── Amharic Unicode normalizer ────────────────────────────────
  // Collapses visually-distinct homophones to a single base character
  // so learner answers aren't penalised for alternate spellings.
  function normalizeAmharic(text) {
    if (!text) return '';
    return text
      // "ha" variants → ሀ
      .replace(/[ሐሑሒሓሔሕሖ]/g, s => {
        const map = ['ሐ','ሑ','ሒ','ሓ','ሔ','ሕ','ሖ'];
        const base = ['ሀ','ሁ','ሂ','ሃ','ሄ','ህ','ሆ'];
        const i = map.indexOf(s); return i > -1 ? base[i] : s;
      })
      // "se" variants → ሰ row
      .replace(/[ሠሡሢሣሤሥሦ]/g, s => {
        const map = ['ሠ','ሡ','ሢ','ሣ','ሤ','ሥ','ሦ'];
        const base = ['ሰ','ሱ','ሲ','ሳ','ሴ','ስ','ሶ'];
        const i = map.indexOf(s); return i > -1 ? base[i] : s;
      })
      // "a" variants → አ row
      .replace(/[ዐዑዒዓዔዕዖ]/g, s => {
        const map = ['ዐ','ዑ','ዒ','ዓ','ዔ','ዕ','ዖ'];
        const base = ['አ','ኡ','ኢ','ኣ','ኤ','እ','ኦ'];
        const i = map.indexOf(s); return i > -1 ? base[i] : s;
      })
      // "ts'" variants → ጸ row
      .replace(/[ፀፁፂፃፄፅፆ]/g, s => {
        const map = ['ፀ','ፁ','ፂ','ፃ','ፄ','ፅ','ፆ'];
        const base = ['ጸ','ጹ','ጺ','ጻ','ጼ','ጽ','ጾ'];
        const i = map.indexOf(s); return i > -1 ? base[i] : s;
      })
      .trim();
  }

  // ── Text-comparison score (0–100) ────────────────────────────
  // Word-level Jaccard-style match with 1-char Levenshtein tolerance
  function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = a[i-1] === b[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return dp[a.length][b.length];
  }

  function calculateScore(expected, received) {
    const norm = s => s.toLowerCase().replace(/[^\u1200-\u137F\w\s]/g, '').trim();
    const expW = norm(expected).split(/\s+/).filter(Boolean);
    const recW = norm(received).split(/\s+/).filter(Boolean);
    if (!expW.length) return 0;

    const used = new Set();
    let hits = 0;
    for (const ew of expW) {
      for (let i = 0; i < recW.length; i++) {
        if (!used.has(i) && levenshtein(ew, recW[i]) <= 1) {
          hits++; used.add(i); break;
        }
      }
    }
    return Math.round((hits / expW.length) * 100);
  }

  // ── Speech Recognition wrapper ────────────────────────────────
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;

  function isRecognitionSupported() { return !!SR; }

  function startRecognition({ lang = 'en-US', onResult, onEnd, onError } = {}) {
    if (!SR) { onError && onError('not-supported'); return null; }
    if (activeRec) { activeRec.abort(); }

    const rec = new SR();
    rec.continuous    = false;
    rec.interimResults = true;
    rec.lang          = lang;

    rec.onresult = e => {
      const t = Array.from(e.results)
        .map(r => r[0].transcript).join(' ');
      onResult && onResult(t, e.results[e.results.length - 1].isFinal);
    };
    rec.onend  = () => { activeRec = null; onEnd && onEnd(); };
    rec.onerror = ev => { activeRec = null; onError && onError(ev.error); };

    try { rec.start(); activeRec = rec; }
    catch(err) { onError && onError(err.message); }
    return rec;
  }

  function stopRecognition() {
    if (activeRec) { activeRec.stop(); activeRec = null; }
  }

  // ── Public API ────────────────────────────────────────────────
  return {
    speakText,
    speakEnglish,
    normalizeAmharic,
    calculateScore,
    startRecognition,
    stopRecognition,
    isRecognitionSupported,
  };
})();
