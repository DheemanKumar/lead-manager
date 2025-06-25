const fs = require('fs');
const pdfParse = require('pdf-parse');

// Reads the resume PDF and checks for MTech and Computer Science or similar background
function checkResume(resumePath, callback) {
  fs.readFile(resumePath, (err, data) => {
    if (err) return callback(false, 'Could not read resume');

    pdfParse(data).then(pdf => {
      const text = pdf.text.toLowerCase();

      // MTech qualification criteria
      const mtechCriteria = [
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

      // Computer science or similar background criteria
      const csBackground = [
        'computer science',
        'cse',
        'information technology',
        'it engineering',
        'software engineering',
        'ai',
        'artificial intelligence',
        'data science',
        'machine learning'
      ];

      const hasMtech = mtechCriteria.some(term => text.includes(term));
      const hasCSBackground = csBackground.some(term => text.includes(term));

      if (hasMtech && hasCSBackground) {
        callback(true);
      } else if (!hasMtech) {
        callback(false, 'Candidate not eligible: MTech not found in resume');
      } else if (!hasCSBackground) {
        callback(false, 'Candidate not eligible: Computer Science or similar background not found');
      }
    }).catch(() => callback(false, 'Could not parse resume'));
  });
}

module.exports = checkResume;
