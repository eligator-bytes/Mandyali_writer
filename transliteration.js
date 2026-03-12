// Simple ITRANS to Devanagari mapping
const itransToDevanagari = {
    'a': 'अ', 'A': 'आ', 'aa': 'आ', 'i': 'इ', 'I': 'ई', 'ii': 'ई', 'u': 'उ', 'U': 'ऊ', 'uu': 'ऊ',
    'RRi': 'ऋ', 'RRI': 'ॠ', 'LLi': 'ऌ', 'LLI': 'ॡ', 'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ',
    'M': 'ं', 'H': 'ः', '.N': 'ँ',
    'k': 'क्', 'kh': 'ख्', 'g': 'ग्', 'gh': 'घ्', '~N': 'ङ्', 'N^': 'ङ्',
    'c': 'च्', 'ch': 'छ्', 'Ch': 'छ्', 'j': 'ज्', 'jh': 'झ्', '~n': 'ञ्', 'JN': 'ञ्',
    'T': 'ट्', 'Th': 'ठ्', 'D': 'ड्', 'Dh': 'ढ्', 'N': 'ण्',
    't': 'त्', 'th': 'थ्', 'd': 'द्', 'dh': 'ध्', 'n': 'न्',
    'p': 'प्', 'ph': 'फ्', 'b': 'ब्', 'bh': 'भ्', 'm': 'म्',
    'y': 'य्', 'r': 'र्', 'l': 'ल्', 'v': 'व्', 'w': 'व्',
    'sh': 'श्', 'S': 'ष्', 'Sh': 'ष्', 's': 'स्', 'h': 'ह्',
    'L': 'ळ्', 'ksh': 'क्ष्', 'x': 'क्ष्', 'j~n': 'ज्ञ्', 'GY': 'ज्ञ्', 'shr': 'श्र्',
    'R': 'ड़्', 'Rh': 'ढ़्',
    'q': 'क़्', 'K': 'ख़्', 'G': 'ग़्', 'z': 'ज़्', 'J': 'ज़्', 'f': 'फ़्',

    // Matras (dependent vowels)
    'A_matra': 'ा', 'aa_matra': 'ा', 'i_matra': 'ि', 'I_matra': 'ी', 'ii_matra': 'ी',
    'u_matra': 'ु', 'U_matra': 'ू', 'uu_matra': 'ू', 'RRi_matra': 'ृ', 'RRI_matra': 'ॄ',
    'LLi_matra': 'ॢ', 'LLI_matra': 'ॣ', 'e_matra': 'े', 'ai_matra': 'ै',
    'o_matra': 'ो', 'au_matra': 'ौ'
};

const devanagariToItrans = {};
for (const [key, value] of Object.entries(itransToDevanagari)) {
    if (!devanagariToItrans[value] || key.length < devanagariToItrans[value].length) {
        devanagariToItrans[value] = key;
    }
}
// Specific overrides for reverse mapping cleanliness
devanagariToItrans['ा'] = 'a';
devanagariToItrans['ि'] = 'i';
devanagariToItrans['ी'] = 'I';
devanagariToItrans['ु'] = 'u';
devanagariToItrans['ू'] = 'U';
devanagariToItrans['े'] = 'e';
devanagariToItrans['ै'] = 'ai';
devanagariToItrans['ो'] = 'o';
devanagariToItrans['ौ'] = 'au';
devanagariToItrans['्'] = ''; // halant has no mapping in english string logically unless trailing

Object.keys(itransToDevanagari).forEach(k => {
    if (k.endsWith('_matra')) return;
    if (k.toLowerCase() === k) return; // simple optimization
});

// A robust but lightweight fallback rule-based transliterator
function englishToDevanagari(text) {
    if (!text) return "";

    // Sort keys by length descending to match longest sequences first (e.g. 'ksh' before 'k')
    const sortedKeys = Object.keys(itransToDevanagari)
        .filter(k => !k.includes('_matra'))
        .sort((a, b) => b.length - a.length);

    let result = "";
    let i = 0;
    while (i < text.length) {
        let matched = false;

        // Handle Vowels following consonants (Matras)
        if (result.endsWith('्')) {
            for (const key of sortedKeys) {
                if (text.startsWith(key, i)) {
                    const devChar = itransToDevanagari[key];
                    // If the next character is a vowel, turn it into a matra instead of an independent vowel
                    if ('अआइईउऊऋॠऌॡएऐओऔ'.includes(devChar)) {
                        // Remove the halant from the previous consonant
                        result = result.slice(0, -1);
                        if (devChar !== 'अ') {
                            const matraKey = key + '_matra';
                            if (itransToDevanagari[matraKey]) {
                                result += itransToDevanagari[matraKey];
                            }
                        }
                        i += key.length;
                        matched = true;
                        break;
                    }
                }
            }
        }

        if (matched) continue;

        for (const key of sortedKeys) {
            if (text.startsWith(key, i)) {
                result += itransToDevanagari[key];
                i += key.length;
                matched = true;
                break;
            }
        }

        if (!matched) {
            result += text[i];
            i++;
        }
    }
    return result;
}

function devanagariToEnglish(text) {
    if (!text) return "";
    let result = "";
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (devanagariToItrans[char]) {
            let eng = devanagariToItrans[char];
            if (eng.endsWith('्')) eng = eng.slice(0, -1); // Remove trailing halant from var names
            result += eng;

            // If the next char is not a matra or halant, add an 'a' (implicit vowel)
            const nextChar = text[i + 1];
            if (char >= 'क' && char <= 'ह' && (!nextChar || (nextChar !== '्' && !'ािीुूृॄॢॣेैोौंःँ'.includes(nextChar)))) {
                result += 'a';
            }
        } else {
            result += char;
        }
    }
    // Clean up trailing a's that are technically implicit but usually dropped in latin transliterations like 'sakar'
    if (result.endsWith('a') && text.length > 2) {
        result = result.slice(0, -1);
    }
    return result;
}

window.englishToDevanagari = englishToDevanagari;
window.devanagariToEnglish = devanagariToEnglish;
