const searchInput = document.getElementById('searchInput');
const clearBtn = document.getElementById('clearSearch');
const resultsList = document.getElementById('results');
const reportFrame = document.getElementById('reportFrame');
const gpoSelect = document.getElementById('gpoSelect');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const matchCounter = document.getElementById('matchCounter');

let index = [];
let allMatches = [];
let currentMatchIndex = -1;

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resetHighlightsAndNavigation() {
  const iframeDoc = reportFrame.contentDocument || reportFrame.contentWindow.document;

  if (iframeDoc) {
    iframeDoc.querySelectorAll('mark.__highlighted').forEach(el => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });
  }

  allMatches = [];
  currentMatchIndex = -1;
  prevBtn.disabled = true;
  nextBtn.disabled = true;
  matchCounter.textContent = '';
}

function scrollToMatch(index) {
  if (index >= 0 && index < allMatches.length) {
    allMatches[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    allMatches.forEach(el => el.style.backgroundColor = '');
    allMatches[index].style.backgroundColor = '#ffff66';
    matchCounter.textContent = `Match ${index + 1} of ${allMatches.length}`;
  }
}

function updateNavButtons() {
  prevBtn.disabled = currentMatchIndex <= 0;
  nextBtn.disabled = currentMatchIndex >= allMatches.length - 1;
}

function highlightTermInIframe(term) {
  try {
    const iframeDoc = reportFrame.contentDocument || reportFrame.contentWindow.document;

    const showAllBtn = iframeDoc.querySelector('#objshowhide');
    if (showAllBtn) {
      showAllBtn.click();
    }

    iframeDoc.querySelectorAll('mark.__highlighted').forEach(el => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });

    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');

    function walk(node) {
      if (node.nodeType === 3) {
        const match = node.nodeValue.match(regex);
        if (match) {
          const span = document.createElement('span');
          span.innerHTML = node.nodeValue.replace(regex, '<mark class="__highlighted">$1</mark>');
          node.parentNode.replaceChild(span, node);
        }
      } else if (node.nodeType === 1 && node.childNodes && !['SCRIPT', 'STYLE', 'IFRAME'].includes(node.tagName)) {
        Array.from(node.childNodes).forEach(walk);
      }
    }

    setTimeout(() => {
// Inject highlight style into iframe head
const style = iframeDoc.createElement('style');
style.textContent = `
mark.__highlighted {
background-color: #fdd835 !important;
color: #000 !important;
padding: 0 2px;
border-radius: 2px;
box-shadow: 0 0 0 1px rgba(0,0,0,0.2);
}
`;
iframeDoc.head.appendChild(style);
      

walk(iframeDoc.body);

      allMatches = Array.from(iframeDoc.querySelectorAll('mark.__highlighted'));
      currentMatchIndex = 0;

      updateNavButtons();

      if (allMatches.length > 0) {
        scrollToMatch(currentMatchIndex);
      } else {
        matchCounter.textContent = 'No matches';
      }
    }, 50);
  } catch (err) {
    console.error('Highlighting and navigation failed:', err);
  }
}

searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase();
  gpoSelect.value = '';
  resultsList.innerHTML = '';
  resetHighlightsAndNavigation();

  if (!query.trim()) {
    reportFrame.src = '';
    return;
  }

  const filtered = index.filter(item =>
    item.name.toLowerCase().includes(query) ||
    item.content.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    resultsList.innerHTML = '<li>No matching reports found.</li>';
    return;
  }

  filtered.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.name;
    li.addEventListener('click', () => {
      reportFrame.src = item.file;

      reportFrame.onload = () => {
        highlightTermInIframe(query);
      };
    });
    resultsList.appendChild(li);
  });
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  resultsList.innerHTML = '';
  gpoSelect.value = '';
  reportFrame.src = '';
  resetHighlightsAndNavigation();
});

gpoSelect.addEventListener('change', () => {
  const selected = gpoSelect.value;
  searchInput.value = '';
  resultsList.innerHTML = '';
  resetHighlightsAndNavigation();

  if (selected) {
    reportFrame.src = selected;

    reportFrame.onload = () => {
      const iframeDoc = reportFrame.contentDocument || reportFrame.contentWindow.document;
      const showAllBtn = iframeDoc.querySelector('#objshowhide');
      if (showAllBtn) showAllBtn.click();
    };
  } else {
    reportFrame.src = '';
  }
});

prevBtn.addEventListener('click', () => {
  if (currentMatchIndex > 0) {
    currentMatchIndex--;
    scrollToMatch(currentMatchIndex);
    updateNavButtons();
  }
});

nextBtn.addEventListener('click', () => {
  if (currentMatchIndex < allMatches.length - 1) {
    currentMatchIndex++;
    scrollToMatch(currentMatchIndex);
    updateNavButtons();
  }
});

// Load search index
fetch('searchIndex.json')
  .then(res => res.json())
  .then(data => {
    index = data;

    data.forEach(item => {
      const option = document.createElement('option');
      option.value = item.file;
      option.textContent = item.name;
      gpoSelect.appendChild(option);
    });
  });