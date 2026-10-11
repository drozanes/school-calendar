const text = 'דקדוק 2 3 5.           תוע"י 1 4\nמבחן שני. משהו אחר 1';
const lines = text.split(/\n|\.\s+/).map(l => l.trim()).filter(Boolean);
console.log(lines);
