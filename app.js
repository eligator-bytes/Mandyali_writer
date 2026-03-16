const consonants = [
    'क', 'ख', 'ग', 'घ', 'ङ',
    'च', 'छ', 'ज', 'झ', 'ञ',
    'ट', 'ठ', 'ड', 'ढ', 'ण',
    'त', 'थ', 'द', 'ध', 'न',
    'प', 'फ', 'ब', 'भ', 'म',
    'y', 'r', 'l', 'v', 'श', // Note: y, r, l, v map cleanly in JS 
    'ष', 'स', 'ह', 'क्ष', 'त्र', 'ज्ञ'
];
// Fix transliterated consonants for UI
const mappedConsonants = consonants.map(c => window.englishToDevanagari(c) || c);

const vowels = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः'];
const matras = ['ा', 'ि', 'ी', 'ु', 'ू', 'ृ', 'े', 'ै', 'ो', 'ौ', 'ं', 'ः', 'ँ', '्'];
const punctuations = ['।', '॥', ',', '.', '?', '!', '-'];

let showingMatras = false;
let showTooltips = true;
let dialectSuggestionsEnabled = true;

const dictManager = new DictionaryManager();
let currentEnglishWord = "";
let currentDevWord = "";
let popupIndex = -1;

const elements = {
    editor: document.getElementById('editor'),
    keyboard: document.getElementById('keyboard'),
    suggestionPopup: document.getElementById('suggestionPopup'),
    transliterationToggle: document.getElementById('transliterationToggle'),
    dialectModeBtn: document.getElementById('dialectModeBtn'),
    matraToggleBtn: document.getElementById('matraToggleBtn'),
    copyAllBtn: document.getElementById('copyAllBtn'),
    aaMatraBtn: document.getElementById('aaMatraBtn'),
    iMatraBtn: document.getElementById('iMatraBtn')
};

async function init() {
    await dictManager.loadDictionary();
    buildKeyboard();
    setupEventListeners();
}

function buildKeyboard() {
    elements.keyboard.innerHTML = '';
    const texts = (showingMatras ? matras : [...vowels, ...mappedConsonants]).concat(punctuations);

    texts.forEach(text => {
        const btn = document.createElement('button');
        btn.className = 'key-btn';
        btn.textContent = text;

        if (showTooltips) {
            const engText = window.devanagariToEnglish(text);
            if (engText && engText !== text) {
                btn.title = engText;
            }
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            insertDevanagariChar(text);
            elements.editor.focus();
        });

        elements.keyboard.appendChild(btn);
    });
}

function setupEventListeners() {
    elements.transliterationToggle.addEventListener('change', (e) => {
        showTooltips = e.target.checked;
        buildKeyboard();
    });

    elements.dialectModeBtn.addEventListener('click', () => {
        dialectSuggestionsEnabled = !dialectSuggestionsEnabled;
        elements.dialectModeBtn.textContent = dialectSuggestionsEnabled ? "Dialect Suggestions: ON" : "Dialect Suggestions: OFF";
        if (!dialectSuggestionsEnabled) {
            hidePopup();
        } else {
            updatePopupState();
        }
    });

    elements.matraToggleBtn.addEventListener('click', () => {
        showingMatras = !showingMatras;
        elements.matraToggleBtn.textContent = showingMatras ? "Show Alphabets (वर्णमाला)" : "Show Matras (मात्राएं)";
        buildKeyboard();
    });

    elements.copyAllBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(elements.editor.value);
            const originalText = elements.copyAllBtn.textContent;
            elements.copyAllBtn.textContent = "Copied!";
            setTimeout(() => elements.copyAllBtn.textContent = originalText, 1500);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    });

    elements.aaMatraBtn.addEventListener('click', () => { insertDevanagariChar('ा'); elements.editor.focus(); });
    elements.iMatraBtn.addEventListener('click', () => { insertDevanagariChar('ि'); elements.editor.focus(); });

    elements.editor.addEventListener('keydown', handleKeyDown);
    elements.editor.addEventListener('input', handleInput);
    elements.editor.addEventListener('click', resetWordState);
}

function resetWordState() {
    currentEnglishWord = "";
    currentDevWord = "";
    hidePopup();
}

function hidePopup() {
    elements.suggestionPopup.style.display = 'none';
    popupIndex = -1;
}

function showPopup(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        hidePopup();
        return;
    }

    elements.suggestionPopup.innerHTML = '';
    suggestions.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = item.eng ? `${item.word}  (${item.eng})` : item.word;
        div.dataset.word = item.word;

        div.addEventListener('click', () => {
            insertSuggestion(item.word);
            elements.editor.focus();
        });

        elements.suggestionPopup.appendChild(div);
    });

    // Primitive cursor tracking for popup position
    const { selectionStart } = elements.editor;
    const textBeforeCursor = elements.editor.value.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const lastLine = lines[lines.length - 1];

    // Estimate position based on font size. Real getBoundingClientRect for cursor is complex in textarea.
    // Using a fixed rough position above/below the cursor for simplicity in this port.
    elements.suggestionPopup.style.display = 'block';

    // Adjust active state
    updatePopupSelection();
}

function updatePopupSelection() {
    const items = elements.suggestionPopup.querySelectorAll('.suggestion-item');
    items.forEach((item, i) => {
        if (i === popupIndex) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

function insertDevanagariChar(char) {
    const start = elements.editor.selectionStart;
    const end = elements.editor.selectionEnd;
    const text = elements.editor.value;

    elements.editor.value = text.substring(0, start) + char + text.substring(end);
    elements.editor.selectionStart = elements.editor.selectionEnd = start + char.length;

    currentDevWord += char;
    currentEnglishWord = "";
    updatePopupState();
}

function updatePopupState() {
    if (!currentDevWord || !dialectSuggestionsEnabled) {
        hidePopup();
        return;
    }
    const suggestions = dictManager.getSuggestions(currentDevWord);
    showPopup(suggestions);
}

function replaceCurrentWord(newWord) {
    const start = elements.editor.selectionStart;
    const text = elements.editor.value;

    // Calculate how much text to replace based on what we've tracked
    const wordStart = start - currentDevWord.length;

    if (wordStart >= 0) {
        elements.editor.value = text.substring(0, wordStart) + newWord + text.substring(start);
        elements.editor.selectionStart = elements.editor.selectionEnd = wordStart + newWord.length;
    }

    currentDevWord = newWord;
}

function insertSuggestion(suggestion) {
    replaceCurrentWord(suggestion);
    resetWordState();

    // Add trailing space
    const start = elements.editor.selectionStart;
    const text = elements.editor.value;
    elements.editor.value = text.substring(0, start) + " " + text.substring(start);
    elements.editor.selectionStart = elements.editor.selectionEnd = start + 1;
}

function handleKeyDown(e) {
    const isPopupVisible = elements.suggestionPopup.style.display === 'block';

    if (isPopupVisible) {
        const items = elements.suggestionPopup.querySelectorAll('.suggestion-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            popupIndex = (popupIndex + 1) % items.length;
            updatePopupSelection();
            return;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            popupIndex = popupIndex <= 0 ? items.length - 1 : popupIndex - 1;
            updatePopupSelection();
            return;
        } else if (e.key === 'Escape') {
            e.preventDefault();
            resetWordState();
            return;
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (popupIndex >= 0 && popupIndex < items.length) {
                e.preventDefault();
                insertSuggestion(items[popupIndex].dataset.word);
            } else {
                resetWordState();
            }
            return;
        } else if (e.key === ' ') {
            if (popupIndex >= 0 && popupIndex < items.length) {
                e.preventDefault();
                insertSuggestion(items[popupIndex].dataset.word);
                return;
            }
            // Let the space happen normally and reset
            resetWordState();
            return;
        }
    }

    if (e.key === 'Backspace') {
        if (currentEnglishWord) {
            e.preventDefault();
            currentEnglishWord = currentEnglishWord.slice(0, -1);
            if (!currentEnglishWord) {
                replaceCurrentWord("");
                resetWordState();
            } else {
                const newDev = window.englishToDevanagari(currentEnglishWord);
                replaceCurrentWord(newDev);
                updatePopupState();
            }
            return;
        } else if (currentDevWord) {
            e.preventDefault();
            const newDev = currentDevWord.slice(0, -1);
            if (!newDev) {
                replaceCurrentWord("");
                resetWordState();
            } else {
                replaceCurrentWord(newDev);
                updatePopupState();
            }
            return;
        }
    }
}

function handleInput(e) {
    // Basic interception of ascii layout keystrokes
    if (e.inputType === 'insertText' && e.data) {
        const char = e.data;
        if (/^[a-zA-Z]$/.test(char)) {
            // Revert the native insertion since we are replacing it
            const start = elements.editor.selectionStart;
            elements.editor.value = elements.editor.value.substring(0, start - 1) + elements.editor.value.substring(start);
            elements.editor.selectionStart = elements.editor.selectionEnd = start - 1;

            currentEnglishWord += char.toLowerCase();
            const newDev = window.englishToDevanagari(currentEnglishWord);
            replaceCurrentWord(newDev);
            updatePopupState();
        } else if (/\s/.test(char) || /[.,!?]/.test(char)) {
            resetWordState();
        }
    } else if (e.inputType === 'deleteContentBackward') {
        // Handled by keydown mostly
    } else {
        // E.g. pasting
        resetWordState();
    }
}

// Initialize the app
init();
