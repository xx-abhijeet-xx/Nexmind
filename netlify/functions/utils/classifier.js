function classifyQuery(query) {
    const q = query.toLowerCase();

    if (any(q, ['code', 'bug', 'function', 'debug', 'error',
                 'fix', 'write', 'implement', 'class', 'api'])) {
        return 'coding';
    }

    if (any(q, ['news', 'latest', 'today', 'current', 'search',
                 'what happened', 'recently', '2025', '2026'])) {
        return 'search';
    }

    if (any(q, ['calculate', 'solve', 'math', 'equation',
                 'proof', 'formula', 'compute'])) {
        return 'reasoning';
    }

    return 'general';
}

function any(text, keywords) {
    return keywords.some(k => text.includes(k));
}

module.exports = { classifyQuery };