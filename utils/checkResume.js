const fs = require('fs');
const pdfParse = require('pdf-parse');

// Reads the resume PDF and checks for BTech or MTech
function checkResume(resumePath, callback) {
  fs.readFile(resumePath, (err, data) => {
    if (err) return callback(false, 'Could not read resume');
    pdfParse(data).then(pdf => {
      const text = pdf.text.toLowerCase();
      // Criteria for qualification (MTech only, with variations)
      const criteria = [
        'm.tech',
        'mtech',
        'm. tech.',
        'master of technology',
        'mtech (cse)',
        'mtech (ece)',
        'mtech (ai)',
        'm.tech in computer science',
        'm.tech (specialization)'
      ];
      const found = criteria.some(term => text.includes(term));
      if (found) {
        callback(true);
      } else {
        callback(false, 'Candidate not eligible: MTech not found in resume');
      }
    }).catch(() => callback(false, 'Could not parse resume'));
  });
}

module.exports = checkResume;
