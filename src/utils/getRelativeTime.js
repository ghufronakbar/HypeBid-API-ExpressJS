const getRelativeTime = (dateString, lang) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);

    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

    if (diffTime < 1000 * 60 * 60) { 
        return lang === "id" ? `${diffMinutes}m` : `${diffMinutes}min`;
    } else if (diffTime < 1000 * 60 * 60 * 24) {
        return lang === "id" ? `${diffHours}j` : `${diffHours}h`;
    } else if (diffDays < 7) { 
        return lang === "id" ? `${diffDays}h` : `${diffDays}d`;
    } else { 
        return lang === "id" ? `${diffWeeks}m` : `${diffWeeks}w`;
    }
};

export default getRelativeTime;
