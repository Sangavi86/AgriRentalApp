const now = new Date();
const minAllowedDate = new Date(now);
minAllowedDate.setDate(now.getDate() + 3);
minAllowedDate.setHours(0, 0, 0, 0);

const startDate = 'invalid-date';
const reqStart = new Date(startDate);
reqStart.setHours(0, 0, 0, 0);

console.log('minAllowedDate:', minAllowedDate);
console.log('reqStart:', reqStart);
console.log('reqStart < minAllowedDate:', reqStart < minAllowedDate);
console.log('reqStart >= minAllowedDate:', reqStart >= minAllowedDate);
