const form = document.getElementById('babyForm');
const nameResults = document.getElementById('nameResults');
const favorites = document.getElementById('favorites');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  nameResults.innerHTML = '<li>Generating names...</li>';

  const data = {
    gender: document.getElementById('gender').value,
    origin: document.getElementById('origin').value,
    religion: document.getElementById('religion').value,
    numerology: document.getElementById('numerology').value,
    startWith: document.getElementById('startWith').value,
    deity: document.getElementById('deity').value,
    meaningCategory: document.getElementById('meaningCategory').value
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

    names.forEach(name => {
      const li = document.createElement('li');
      li.textContent = name;
      li.addEventListener('click', () => addToFavorites(name));
      nameResults.appendChild(li);
    });

  } catch (err) {
    console.error(err);
    nameResults.innerHTML = '<li>Error generating names. Please try again later.</li>';
  }
});

function addToFavorites(name) {
  if (![...favorites.children].some(li => li.textContent === name)) {
    const li = document.createElement('li');
    li.textContent = name;
    favorites.appendChild(li);
  }
}
