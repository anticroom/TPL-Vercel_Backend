/**
 * Numbers of decimal digits to round to
 */
const scale = 3;

// Export this constant if used in other files (like content.js)
export const PACK_MULTIPLIER = 0.33;

/**
 * Calculate the score awarded when having a certain percentage on a list level
 * @param {Number} rank Position on the list
 * @param {Number} percent Percentage of completion
 * @param {Number} minPercent Minimum percentage required
 * @returns {Number}
 */
export function score(rank, percent, minPercent) {
    // 1. LEGACY CHECK: If rank is higher than 150, it's Legacy.
    // Legacy levels award 0 points.
    if (rank > 150) {
        return 0;
    }

    // 2. HARDCODED SIZE: The curve always spans 1 to 150.
    // This ensures Rank 150 is the "lowest level not on legacy" and gets ~1 point.
    const listSize = 150;

    // 3. Calculate the dynamic coefficient based on 150 levels
    // Formula: Coefficient = -249 / ((150 - 1)^0.4)
    const coefficient = -249 / Math.pow(listSize - 1, 0.4);

    let score = (coefficient * Math.pow(rank - 1, 0.4) + 250) *
        ((percent - (minPercent - 1)) / (100 - (minPercent - 1)));

    score = Math.max(0, score);

    if (percent != 100) {
        return round(score - score / 3);
    }

    return Math.max(round(score), 0);
}

export function round(num) {
    if (!('' + num).includes('e')) {
        return +(Math.round(num + 'e+' + scale) + 'e-' + scale);
    } else {
        var arr = ('' + num).split('e');
        var sig = '';
        if (+arr[1] + scale > 0) {
            sig = '+';
        }
        return +(
            Math.round(+arr[0] + 'e' + sig + (+arr[1] + scale)) +
            'e-' +
            scale
        );
    }
}