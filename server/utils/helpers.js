const os = require('os');

const today = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

const monthName = () => new Date().toLocaleString('en', { month: 'long' });

const currentYear = () => new Date().getFullYear();

function gradeForPct(pct) {
    return pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
}

function cleanDriveLink(link) {
    if (!link) return null;
    link = String(link).trim();
    if (!link) return null;
    if (!/^https?:\/\//i.test(link)) link = 'https://' + link;
    return link;
}

function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) return net.address;
        }
    }
    return 'localhost';
}

// Find the class batches that match a student's selected subjects.
// Classes 1-5 use "All Subjects"; classes 6-12 use "Mathematics" / "Science".
// Legacy combined "Maths + Science" batches also match either subject.
function matchSubjectBatches(batchRows, subjects) {
    const n = s => String(s || '').trim().toLowerCase();
    const wanted = (subjects || []).map(n);
    return batchRows.filter(b => {
        const subj = n(b.subject || b.Subject);
        if (!subj) return false;
        return wanted.some(w => {
            if (subj === w) return true;
            if ((subj === 'maths + science' || subj === 'mathematics + science') && (w === 'mathematics' || w === 'maths' || w === 'science')) return true;
            if ((w === 'maths + science' || w === 'mathematics + science') && (subj === 'mathematics' || subj === 'maths' || subj === 'science')) return true;
            return false;
        });
    });
}

module.exports = {
    today,
    monthName,
    currentYear,
    gradeForPct,
    cleanDriveLink,
    getLocalIP,
    matchSubjectBatches
};
