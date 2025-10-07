const form = document.getElementById('babyForm');
const nameResults = document.getElementById('nameResults');
const favorites = document.getElementById('favorites');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  nameResults.innerHTML = '<li>Generating names...</li>';

  // Get all values
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
