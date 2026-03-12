class DictionaryManager {
    constructor() {
        this.dictionary = {};
        this.loaded = false;
    }

    async loadDictionary() {
        try {
            const response = await fetch('dictionary.json');
            if (!response.ok) throw new Error("Failed to load dictionary");
            this.dictionary = await response.json();
            this.loaded = true;
            console.log("Dictionary loaded successfully");
        } catch (e) {
            console.error(e);
            this.loaded = false;
        }
    }

    getSuggestions(devanagariWord) {
        if (!this.loaded || !devanagariWord) return [];

        const searchTerm = devanagariWord.replace('्', '');

        let prefixMatches = [];
        let containsMatches = [];

        for (const [key, entriesList] of Object.entries(this.dictionary)) {
            if (key.startsWith(searchTerm)) {
                prefixMatches.push(...entriesList);
            } else if (key.includes(searchTerm)) {
                containsMatches.push(...entriesList);
            }
        }

        prefixMatches.sort((a, b) => (b.probability || 0) - (a.probability || 0));
        containsMatches.sort((a, b) => (b.probability || 0) - (a.probability || 0));

        const allMatches = [...prefixMatches, ...containsMatches].slice(0, 15);

        const results = [];
        const seenTranslations = new Set();

        for (const entry of allMatches) {
            if (!entry || !entry.translation) continue;
            const word = entry.translation.toString();

            if (seenTranslations.has(word)) continue;
            seenTranslations.add(word);

            let eng = this.getEnglishSpelling(word) || window.devanagariToEnglish(word);
            results.push({ word, eng });
        }

        if (results.length === 0) {
            let eng = this.getEnglishSpelling(devanagariWord) || window.devanagariToEnglish(devanagariWord);
            return [{ word: devanagariWord, eng }];
        }

        return results;
    }

    getEnglishSpelling(devanagariWord) {
        let bestSpelling = "";
        let highestProb = -1;

        for (const [engKey, entriesList] of Object.entries(this.dictionary)) {
            for (const entry of entriesList) {
                if (entry.translation === devanagariWord) {
                    const prob = entry.probability || 0;
                    if (prob > highestProb) {
                        highestProb = prob;
                        bestSpelling = engKey;
                    }
                }
            }
        }
        return bestSpelling;
    }
}

window.DictionaryManager = DictionaryManager;
