const form = document.getElementById('babyForm');
const nameResults = document.getElementById('nameResults');
const favorites = document.getElementById('favorites');
const generateBtn = document.getElementById('generateBtn');

// Load favorites from localStorage on page load
function loadFavorites() {
  const saved = JSON.parse(localStorage.getItem('favorites')) || [];
  favorites.innerHTML = '';
  saved.forEach(name => {
    createFavoriteItem(name);
  });
}

// Save favorites to localStorage
function saveFavorites() {
  const favNames = [...favorites.children].map(li => li.dataset.name);
  localStorage.setItem('favorites', JSON.stringify(favNames));
}

// Create a favorite list item with delete button
function createFavoriteItem(name) {
  const li = document.createElement('li');
  li.dataset.name = name;
  li.style.position = 'relative';
  li.style.paddingRight = '60px';

  const span = document.createElement('span');
  span.textContent = name;

  // Delete icon
  const deleteBtn = document.createElement('i');
  deleteBtn.className = 'fas fa-trash';
  deleteBtn.style.cursor = 'pointer';
  deleteBtn.style.position = 'absolute';
  deleteBtn.style.top = '50%';
  deleteBtn.style.transform = 'translateY(-50%)';
  deleteBtn.style.right = '30px';
  deleteBtn.title = 'Remove from favorites';
  deleteBtn.addEventListener('click', () => {
    li.remove();
    saveFavorites();
    updateHearts();
  });

  // Download icon
  const downloadIcon = document.createElement('i');
  downloadIcon.className = 'fas fa-download';
  downloadIcon.style.cursor = 'pointer';
  downloadIcon.style.position = 'absolute';
  downloadIcon.style.top = '50%';
  downloadIcon.style.transform = 'translateY(-50%)';
  downloadIcon.style.right = '5px';
  downloadIcon.title = 'Download Name Card';
  downloadIcon.addEventListener('click', () => {
    const cardName = document.getElementById('cardName');
    const cardDetails = document.getElementById('cardDetails');

    const gender = document.getElementById('gender').value || 'Any';
    const origin = document.getElementById('origin').value || 'Any';
    const religion = document.getElementById('religion').value || 'Any';
    const numerology = document.getElementById('numerology').value || 'Any';
    const startWith = document.getElementById('startWith').value.trim();
    const rashi = document.getElementById('rashi').value;
    const deity = document.getElementById('deity').value || 'Any';
    const meaningCategory = document.getElementById('meaningCategory').value || 'Any';

    cardName.textContent = name;
    cardDetails.innerHTML = `
      Gender: ${gender}<br>
      Origin: ${origin}<br>
      Religion: ${religion}<br>
      Numerology: ${numerology}<br>
      Start With / Rashi: ${startWith || rashi || 'Any'}<br>
      Deity: ${deity}<br>
      Meaning Category: ${meaningCategory}
    `;

    const nameCard = document.getElementById('nameCard');
    html2canvas(nameCard).then(canvas => {
      const link = document.createElement('a');
      link.download = `${name}_NameCard.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  });

  li.appendChild(span);
  li.appendChild(deleteBtn);
  li.appendChild(downloadIcon);

  favorites.appendChild(li);
}


// Update hearts in generated names based on favorites
function updateHearts() {
  const favNames = JSON.parse(localStorage.getItem('favorites')) || [];
  document.querySelectorAll('#nameResults li').forEach(li => {
    const heart = li.querySelector('.heart-icon');
    if (!heart) return;
    if (favNames.includes(li.dataset.name)) {
      heart.classList.add('fas');
      heart.classList.remove('far');
    } else {
      heart.classList.add('far');
      heart.classList.remove('fas');
    }
  });
}

// Add a name to favorites
function addToFavorites(name) {
  const favNames = JSON.parse(localStorage.getItem('favorites')) || [];
  if (!favNames.includes(name)) {
    createFavoriteItem(name);
    saveFavorites();
    updateHearts();
  }
}

// Initialize favorites
loadFavorites();

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Show loading state
  generateBtn.disabled = true;
  const originalText = generateBtn.textContent;
  generateBtn.textContent = 'Generating...';
  nameResults.innerHTML = '<li>Generating names...</li>';

  const gender = document.getElementById('gender').value;
  const origin = document.getElementById('origin').value;
  const religion = document.getElementById('religion').value;
  const numerology = document.getElementById('numerology').value;
  const startWith = document.getElementById('startWith').value.trim();
  const rashi = document.getElementById('rashi').value;
  const deity = document.getElementById('deity').value;
  const meaningCategory = document.getElementById('meaningCategory').value;

  const data = {
    gender,
    origin,
    religion,
    numerology,
    startWith: startWith || '',
    rashi: !startWith ? rashi : '',
    deity,
    meaningCategory
  };

  try {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    const names = result.names || [];
    nameResults.innerHTML = '';

    if (names.length === 0) {
      nameResults.innerHTML = `<li>${result.error || 'No names generated.'}</li>`;
    }

    const favNames = JSON.parse(localStorage.getItem('favorites')) || [];

    names.forEach(name => {
      const li = document.createElement('li');
      li.textContent = name;
      li.dataset.name = name;
      li.style.position = 'relative';
      li.style.paddingRight = '60px'; // space for icons

      // Heart icon
      const heart = document.createElement('i');
      heart.className = favNames.includes(name) ? 'fas fa-heart heart-icon' : 'far fa-heart heart-icon';
      heart.style.cursor = 'pointer';
      heart.style.position = 'absolute';
      heart.style.top = '50%';
      heart.style.transform = 'translateY(-50%)';
      heart.style.right = '30px';
      heart.addEventListener('click', () => {
        if (heart.classList.contains('far')) {
          addToFavorites(name);
        } else {
          document.querySelectorAll('#favorites li').forEach(favLi => {
            if (favLi.dataset.name === name) {
              favLi.remove();
            }
          });
          saveFavorites();
          updateHearts();
        }
      });

      // Download icon
      const downloadIcon = document.createElement('i');
      downloadIcon.className = 'fas fa-download';
      downloadIcon.style.cursor = 'pointer';
      downloadIcon.style.position = 'absolute';
      downloadIcon.style.top = '50%';
      downloadIcon.style.transform = 'translateY(-50%)';
      downloadIcon.style.right = '5px';
      downloadIcon.title = 'Download Name Card';
      downloadIcon.addEventListener('click', () => {
        const cardName = document.getElementById('cardName');
        const cardDetails = document.getElementById('cardDetails');

        cardName.textContent = name;
        cardDetails.innerHTML = `
          Gender: ${gender || 'Any'}<br>
          Origin: ${origin || 'Any'}<br>
          Religion: ${religion || 'Any'}<br>
          Numerology: ${numerology || 'Any'}<br>
          Start With / Rashi: ${startWith || rashi || 'Any'}<br>
          Deity: ${deity || 'Any'}<br>
          Meaning Category: ${meaningCategory || 'Any'}
        `;

        const nameCard = document.getElementById('nameCard');
        html2canvas(nameCard).then(canvas => {
          const link = document.createElement('a');
          link.download = `${name}_NameCard.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        });
      });

      li.appendChild(heart);
      li.appendChild(downloadIcon);
      nameResults.appendChild(li);
    });

    updateHearts(); // sync hearts after generating

  } catch (err) {
    console.error(err);
    nameResults.innerHTML = '<li>Error generating names. Please try again later.</li>';
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = originalText;
  }
});
