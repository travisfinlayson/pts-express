/**
 * Format a JotForm date object into a YYYY-MM-DD string.
 * @param {Object} dateObj - The date object from JotForm containing year, month, and day.
 * @returns {string|null} - The formatted date as a string or null if the date is invalid.
 */
const formatJotformDate = (dateObj) => {
    return (dateObj?.year && dateObj?.month && dateObj?.day)
        ? `${dateObj.year}-${dateObj.month.padStart(2, '0')}-${dateObj.day.padStart(2, '0')}`
        : null;
};

module.exports = { formatJotformDate };
