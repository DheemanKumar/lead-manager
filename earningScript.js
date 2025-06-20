// earningScript.js
// Script to calculate and print earning breakdown for a given employee email

const { db } = require('./models/db');

function calculateEarning(email) {
  db.all('SELECT name, status FROM leads WHERE submitted_by = ?', [email], (err, leads) => {
    if (err) {
      console.error('Earning breakdown DB error:', err);
      process.exit(1);
    }
    let totalEarning = 0;
    let joinedCount = 0;
    const leadDetails = leads.map(lead => {
      let earning = 0;
      switch ((lead.status || '').toLowerCase()) {
        case 'qualified lead':
        case 'review stage':
          earning = 50;
          break;
        case 'shortlisted':
          earning = 1000;
          break;
        case 'joined':
          earning = 5000;
          joinedCount++;
          break;
        case 'rejected':
        default:
          earning = 0;
      }
      totalEarning += earning;
      return { name: lead.name, status: lead.status, earning };
    });
    // Bonus: +10,000 for every 5th joined
    const bonus = Math.floor(joinedCount / 5) * 10000;
    const finalEarning = totalEarning + bonus;
    console.log('Earning breakdown for:', email);
    console.table(leadDetails);
    console.log('Total Earning:', totalEarning);
    console.log('Bonus:', bonus);
    console.log('Final Earning:', finalEarning);
    process.exit(0);
  });
}

// Usage: node earningScript.js employee@email.com
const email = process.argv[2];
if (!email) {
  console.error('Usage: node earningScript.js <employee_email>');
  process.exit(1);
}
calculateEarning(email);
