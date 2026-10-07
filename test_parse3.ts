const texts = [
  'דקדוק 2 3 5.           תוע"י 1 4',
  '11:00 שיעור פתיחה הרב לפיד\nט2 גיבוש (ערב)',
  'מבחן מיון- אנגלית 1 2 5 . מבחן מיון במתמטיקה- 4',
  'תנ"ך 1 2 4 5',
  '21:00  סיור סליחות בחברון',
  'יב 2'
];

texts.forEach(t => {
  const digits = Array.from(t.matchAll(/(?<!\d)([1-6])(?!\d)/g)).map(m => parseInt(m[1]));
  console.log(`Text: "${t}" =>`, digits);
});
