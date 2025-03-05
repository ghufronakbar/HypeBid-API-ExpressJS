const normalizeDecimal = (value) => {
    if (!value) return null;

    const commaCount = (value.match(/,/g) || []).length;
    if (commaCount > 1) return null;

    return value.replace(',', '.');
};

export default normalizeDecimal