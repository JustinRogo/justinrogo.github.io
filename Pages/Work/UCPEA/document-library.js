'use strict';

(() => {
  const library = document.getElementById('document-library');
  const filters = document.getElementById('library-filters');
  const search = document.getElementById('library-search');
  const category = document.getElementById('library-category');
  const clear = document.getElementById('library-clear');
  const count = document.getElementById('library-count');
  const empty = document.getElementById('library-empty');
  const normalize = text => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const documents = Array.from(library.querySelectorAll('tr[data-library-category]'), row => {
    const type = row.querySelector('.library-type').getAttribute('aria-label');
    return { row, keywords: normalize(`${row.textContent} ${type} ${row.dataset.searchTerms ?? ''}`) };
  });

  function updateResults() {
    const words = normalize(search.value).split(' ').filter(Boolean);
    let matches = 0;
    for (const { row, keywords } of documents) {
      const categoryMatches = !category.value || row.dataset.libraryCategory === category.value;
      const show = categoryMatches && words.every(word => keywords.includes(word));
      row.hidden = !show;
      if (show) matches++;
    }
    count.textContent = `${matches} ${matches === 1 ? 'result' : 'results'}`;
    empty.hidden = matches > 0;
    clear.hidden = !search.value && !category.value;
  }

  search.addEventListener('input', updateResults);
  category.addEventListener('change', updateResults);
  clear.addEventListener('click', () => {
    search.value = '';
    category.value = '';
    updateResults();
    search.focus();
  });

  filters.hidden = false;
  updateResults();
})();
