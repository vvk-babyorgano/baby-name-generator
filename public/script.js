/* script.js - Updated
  - Displays only name in lists (no [object Object])
  - Stores full info per name (name + meaning + details)
  - Download works for both generated and favorite items
  - Backwards-compatible with older localStorage shape
*/

const form = document.getElementById('babyForm');
const nameResults = document.getElementById('nameResults');
const favorites = document.getElementById('favorites');
const generateBtn = document.getElementById('generateBtn');

// ---------- Helpers for localStorage (supports older formats) ----------
function readStoredFavorites() {
  const raw = localStorage.getItem('favorites');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    // If array of strings (old format), convert to objects
    if (Array.isArray(parsed) && parsed.length && typeof parsed[0] === 'string') {
      return parsed.map(name => ({ name, meaning: '', details: {} }));
    }
    // If already stored as objects, ensure shape
    if (Array.isArray(parsed)) {
      return parsed.map(it => ({
        name: it.name || (typeof it === 'string' ? it : ''),
        meaning: it.meaning || '',
        details: it.details || {}
      }));
    }
    return [];
  } catch (err) {
    console.warn('Failed to parse favorites from localStorage:', err);
    return [];
  }
}

function writeStoredFavorites(arr) {
  localStorage.setItem('favorites', JSON.stringify(arr));
}

// ---------- UI: create favorite item (shows name, delete, download) ----------
function createFavoriteItem(favObj) {
  // favObj = { name, meaning, details }
  const li = document.createElement('li');
  li.dataset.name = favObj.name;
  li.dataset.info = JSON.stringify(favObj); // store full info
  li.style.position = 'relative';
  li.style.paddingRight = '80px';
  li.style.marginBottom = '6px';

  const span = document.createElement('span');
  span.textContent = favObj.name; // show only name
  li.appendChild(span);

  // Delete button
  const deleteBtn = document.createElement('i');
  deleteBtn.className = 'fas fa-trash';
  deleteBtn.title = 'Remove from favorites';
  Object.assign(deleteBtn.style, {
    cursor: 'pointer',
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    right: '35px'
  });
  deleteBtn.addEventListener('click', () => {
    li.remove();
    const saved = readStoredFavorites().filter(f => f.name !== favObj.name);
    writeStoredFavorites(saved);
    updateHearts();
  });
  li.appendChild(deleteBtn);

  // Download button
  const downloadBtn = document.createElement('i');
  downloadBtn.className = 'fas fa-download';
  downloadBtn.title = 'Download Name Card';
  Object.assign(downloadBtn.style, {
    cursor: 'pointer',
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    right: '5px'
  });
  downloadBtn.addEventListener('click', () => {
    // Use favObj (stored details + meaning)
    downloadNameCard(favObj);
  });
  li.appendChild(downloadBtn);

  favorites.appendChild(li);
}

// ---------- Download function (reusable) ----------
function downloadNameCard(info) {
  // info: { name, meaning, details:{gender,origin,...} }
  const cardName = document.getElementById('cardName');
  const cardDetails = document.getElementById('cardDetails');

  // Fill card
  cardName.textContent = info.name;
  const d = info.details || {};
  const meaningText = info.meaning || 'Meaning not available';

  cardDetails.innerHTML = `
    <div style="margin:6px 0;"><strong>Meaning:</strong> ${escapeHtml(meaningText)}</div>
    <div style="margin-top:8px; text-align:left; display:flex; flex-direction: column; gap: 10px; font-size: 14px;">
      <div>👶 <strong>Gender:</strong> ${escapeHtml(d.gender || 'Not specified')}</div>
      <div>🌍 <strong>Origin:</strong> ${escapeHtml(d.origin || 'Not specified')}</div>
      <div>🕉️ <strong>Religion:</strong> ${escapeHtml(d.religion || 'Not specified')}</div>
      <div>🔢 <strong>Numerology:</strong> ${escapeHtml(d.numerology || 'Not specified')}</div>
      <div>📝 <strong>Start / Rashi:</strong> ${escapeHtml(d.startWith || d.rashi || 'Not specified')}</div>
      <div>🙏 <strong>Deity:</strong> ${escapeHtml(d.deity || 'Not specified')}</div>
      <div>💫 <strong>Category:</strong> ${escapeHtml(d.meaningCategory || 'Not specified')}</div>
    </div>
  `;

  // ensure nameCard is visible to html2canvas (it can be hidden visually)
  const nameCard = document.getElementById('nameCard');
  const prevDisplay = nameCard.style.display;
  nameCard.style.display = 'block';

  // Optional: small delay to let DOM paint fonts/styles (usually fine)
  setTimeout(() => {
    html2canvas(nameCard, { scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `${sanitizeFilename(info.name)}_BabyOrgano_Name_Card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      // restore
      nameCard.style.display = prevDisplay || 'none';
    }).catch(err => {
      console.error('html2canvas error:', err);
      nameCard.style.display = prevDisplay || 'none';
    });
  }, 80);
}

// ---------- Mutual exclusion: Start With vs Rashi ----------
const startWithInput = document.getElementById('startWith');
const rashiSelect = document.getElementById('rashi');

startWithInput.addEventListener('input', () => {
  if (startWithInput.value.trim()) {
    rashiSelect.disabled = true;
    rashiSelect.style.opacity = '0.5';
    rashiSelect.style.cursor = 'not-allowed';
  } else {
    rashiSelect.disabled = false;
    rashiSelect.style.opacity = '1';
    rashiSelect.style.cursor = 'pointer';
  }
});

rashiSelect.addEventListener('change', () => {
  if (rashiSelect.value) {
    startWithInput.disabled = true;
    startWithInput.style.opacity = '0.5';
    startWithInput.style.cursor = 'not-allowed';
  } else {
    startWithInput.disabled = false;
    startWithInput.style.opacity = '1';
    startWithInput.style.cursor = 'text';
  }
});

// ---------- Utility ----------
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_\- ]/gi, '').replace(/\s+/g, '_');
}
function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------- Hearts (sync with favorites) ----------
function updateHearts() {
  const saved = readStoredFavorites();
  const names = saved.map(f => f.name);
  document.querySelectorAll('#nameResults li').forEach(li => {
    const heart = li.querySelector('.heart-icon');
    if (!heart) return;
    if (names.includes(li.dataset.name)) {
      heart.classList.add('fas');
      heart.classList.remove('far');
    } else {
      heart.classList.add('far');
      heart.classList.remove('fas');
    }
  });
}

// ---------- add to favorites (object) ----------
function addToFavorites(info) {
  const saved = readStoredFavorites();
  if (!saved.some(f => f.name === info.name)) {
    saved.push(info);
    writeStoredFavorites(saved);
    createFavoriteItem(info);
    updateHearts();
  }
}

// ---------- Initialize favorites UI ----------
function loadFavorites() {
  favorites.innerHTML = '';
  const saved = readStoredFavorites();
  saved.forEach(item => createFavoriteItem(item));
}
loadFavorites();

// ---------- Form submit (generate names) ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Loading state
  generateBtn.disabled = true;
  const originalText = generateBtn.textContent;
  generateBtn.textContent = 'Generating...';
  nameResults.innerHTML = '<li>Generating names...</li>';

  const rashiSelect = document.getElementById('rashi');
  const selectedOption = rashiSelect.options[rashiSelect.selectedIndex];
  const rashiValue = selectedOption.value;

  // extract letters from option text, e.g. "Vrishabha (Taurus) - B, V, U"
  const matchLetters = selectedOption.textContent.match(/-\s*([A-Z,\s]+)/i);
  const rashiLetters = matchLetters ? matchLetters[1].trim() : '';


  // Collect filter/details
  const details = {
   gender: document.getElementById('gender').value,
   origin: document.getElementById('origin').value,
   religion: document.getElementById('religion').value,
   numerology: document.getElementById('numerology').value,
   startWith: document.getElementById('startWith').value.trim(),
   rashi: rashiValue,
   rashiLetters,
   deity: document.getElementById('deity').value,
   meaningCategory: document.getElementById('meaningCategory').value
  };


  try {
    const resp = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details)
    });

    const json = await resp.json();
    const items = json.names || []; // names can be array of strings OR objects {name,meaning}

    nameResults.innerHTML = '';

    if (!Array.isArray(items) || items.length === 0) {
      nameResults.innerHTML = `<li>${json.error || 'No names generated.'}</li>`;
      return;
    }

    // existing favorites to mark hearts
    const stored = readStoredFavorites();
    const storedNames = stored.map(s => s.name);

    items.forEach(item => {
      // normalize item -> info object with name + meaning + details
      let info;
      if (typeof item === 'string') {
        info = { name: item, meaning: '', details };
      } else if (item && typeof item === 'object') {
        info = {
          name: item.name || (item[0] || ''), // try fallback
          meaning: item.meaning || item.meaningText || '',
          details
        };
      } else {
        return; // skip unexpected
      }

      const li = document.createElement('li');
      li.dataset.name = info.name;
      li.dataset.info = JSON.stringify(info);
      li.style.position = 'relative';
      li.style.paddingRight = '80px';
      li.style.marginBottom = '6px';

      // name text span (so we don't overwrite children)
      const span = document.createElement('span');
      span.textContent = info.name;
      li.appendChild(span);

      // Heart icon
      const heart = document.createElement('i');
      heart.className = storedNames.includes(info.name) ? 'fas fa-heart heart-icon' : 'far fa-heart heart-icon';
      heart.title = 'Add to favorites';
      Object.assign(heart.style, {
        cursor: 'pointer',
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        right: '35px'
      });
      heart.addEventListener('click', () => {
        if (heart.classList.contains('far')) {
          addToFavorites(info);
          heart.classList.remove('far');
          heart.classList.add('fas');
        } else {
          // remove from favorites
          const saved = readStoredFavorites().filter(f => f.name !== info.name);
          writeStoredFavorites(saved);
          // remove any matching favorite li
          document.querySelectorAll('#favorites li').forEach(favLi => {
            try {
              const fi = JSON.parse(favLi.dataset.info);
              if (fi.name === info.name) favLi.remove();
            } catch (e) {}
          });
          heart.classList.remove('fas');
          heart.classList.add('far');
        }
      });
      li.appendChild(heart);

      // Download icon
      const downloadIcon = document.createElement('i');
      downloadIcon.className = 'fas fa-download';
      downloadIcon.title = 'Download Name Card';
      Object.assign(downloadIcon.style, {
        cursor: 'pointer',
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        right: '5px'
      });
      downloadIcon.addEventListener('click', () => {
        downloadNameCard(info);
      });
      li.appendChild(downloadIcon);

      nameResults.appendChild(li);
    });

    updateHearts();

  } catch (err) {
    console.error('Generate error:', err);
    nameResults.innerHTML = '<li>Error generating names. Please try again later.</li>';
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = originalText;
  }
});
