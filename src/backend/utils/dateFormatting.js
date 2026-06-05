export const formatBookingDisplay = (start, end) => {
    if (!start) return 'N/A';
    if (!end || start === end) return start;
    return `${start} - ${end}`;
};

export const formatDuration = (start, end) => {
    if (!start || !end) return '0 hours';
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.abs(e - s);
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    return `${hours || 1} hours`;
};
