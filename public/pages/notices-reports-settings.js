// ═══ Notices Page ═══
async function loadNotices() {
    const notices = await api('/api/notices');
    const list = Array.isArray(notices)?notices:[];
    $('contentArea').innerHTML = `
        <div class="section-header">
            <div class="section-title"><i class="fas fa-bullhorn"></i> Notices</div>
            <div class="section-actions">${currentUser.role!=='student'?'<button class="btn btn-primary" onclick="showNoticeForm()"><i class="fas fa-plus"></i> Add Notice</button>':''}</div>
        </div>
        <div class="upcoming-list">${list.map(n=>{
            const pColor = n.Priority==='Urgent'?'var(--danger)':n.Priority==='Important'?'var(--warning)':'var(--accent)';
            return`<div class="upcoming-item" style="border-left:3px solid ${pColor}"><div style="flex:1"><h4 style="margin-bottom:4px">${n.Title} <span class="status-badge" style="background:${pColor}22;color:${pColor}">${n.Priority}</span></h4><p style="color:var(--text-secondary);font-size:.85rem;margin-bottom:4px">${n.Description||''}</p><small style="color:var(--text-muted)"><i class="fas fa-calendar"></i> ${formatDate(n.PublishDate)} • <i class="fas fa-users"></i> ${n.Audience}</small></div>
            ${currentUser.role!=='student'?`<button class="action-btn delete" onclick="deleteNotice(${n.NoticeId})"><i class="fas fa-trash"></i></button>`:''}</div>`}).join('')}
        ${!list.length?'<div class="empty-state"><i class="fas fa-bullhorn"></i><h3>No notices</h3></div>':''}</div>`;
}

function showNoticeForm() {
    openModal(`<div class="modal-header"><h2>Add Notice</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <form class="modal-form" onsubmit="saveNotice(event)">
        <div class="form-group"><label>Title *</label><input id="nc_title" required></div>
        <div class="form-group"><label>Description *</label><textarea id="nc_desc" rows="4" required></textarea></div>
        <div class="form-row"><div class="form-group"><label>Audience</label><select id="nc_aud"><option>All</option><option>Students</option></select></div><div class="form-group"><label>Priority</label><select id="nc_pri"><option>Normal</option><option>Important</option><option>Urgent</option></select></div></div>
        <div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Publish</button></div>
    </form>`);
}

async function saveNotice(e){e.preventDefault();const r=await post('/api/notices',{Title:$('nc_title').value,Description:$('nc_desc').value,Audience:$('nc_aud').value,Priority:$('nc_pri').value});if(r.success){toast('Notice published');closeModal();loadNotices();}else toast('Error','error');}
async function deleteNotice(id){if(confirm('Delete?')){await del(`/api/notices/${id}`);toast('Deleted');loadNotices();}}

// ═══ Timetable Page ═══
async function loadTimetable() {
    const [tt, batches] = await Promise.all([api('/api/timetable'), api('/api/batches')]);
    const list = Array.isArray(tt)?tt:[];
    const bl = Array.isArray(batches)?batches:[];
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    
    $('contentArea').innerHTML = `
        <div class="section-header">
            <div class="section-title"><i class="fas fa-clock"></i> Timetable</div>
            <div class="section-actions">
                <select id="tt_filter" class="filter-select" onchange="filterTimetable(this.value)"><option value="">All Batches</option>${bl.map(b=>`<option value="${b.BatchId}">${b.BatchName}</option>`).join('')}</select>
                ${currentUser.role==='admin'?'<button class="btn btn-primary" onclick="showTimetableForm()"><i class="fas fa-plus"></i> Add</button>':''}
            </div>
        </div>
        <div class="data-table-container"><table id="timetableTable"><thead><tr><th>Day</th><th>Batch</th><th>Subject</th><th>Time</th><th>Room</th></tr></thead>
        <tbody>${list.map(t=>`<tr data-batch="${t.BatchId}"><td><strong>${t.Day}</strong></td><td>${t.BatchName||'-'}</td><td>${t.Subject||'-'}</td><td>${t.StartTime?.substring(0,5)} - ${t.EndTime?.substring(0,5)}</td><td>${t.Room||'-'}</td></tr>`).join('')}</tbody></table></div>`;
}

function filterTimetable(batchId) {
    document.querySelectorAll('#timetableTable tbody tr').forEach(r => { r.style.display = !batchId || r.dataset.batch == batchId ? '' : 'none'; });
}

function showTimetableForm() {
    api('/api/batches').then(function(batches){
        const bl=Array.isArray(batches)?batches:[];
        openModal(`<div class="modal-header"><h2>Add Timetable Entry</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
        <form class="modal-form" onsubmit="saveTimetable(event)">
            <div class="form-row"><div class="form-group"><label>Batch *</label><select id="tte_batch">${bl.map(b=>`<option value="${b.BatchId}">${b.BatchName}</option>`).join('')}</select></div>
            <div class="form-group"><label>Day *</label><select id="tte_day">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=>`<option>${d}</option>`).join('')}</select></div></div>
            <div class="form-row"><div class="form-group"><label>Subject</label><input id="tte_subj"></div><div class="form-group"><label>Room</label><input id="tte_room"></div></div>
            <div class="form-row"><div class="form-group"><label>Start Time *</label><input type="time" id="tte_start" required></div><div class="form-group"><label>End Time *</label><input type="time" id="tte_end" required></div></div>
            <div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Add</button></div>
        </form>`);
    });
}

async function saveTimetable(e){e.preventDefault();const r=await post('/api/timetable',{BatchId:$('tte_batch').value,Day:$('tte_day').value,Subject:$('tte_subj').value,StartTime:$('tte_start').value,EndTime:$('tte_end').value,Room:$('tte_room').value});if(r.success){toast('Entry added');closeModal();loadTimetable();}else toast('Error','error');}

// ═══ Reports Page ═══
async function loadReports() {
    $('contentArea').innerHTML = `
        <div class="section-header"><div class="section-title"><i class="fas fa-file-alt"></i> Reports</div></div>
        <div class="quick-actions">
            <div class="quick-action" onclick="generateReport('attendance')"><i class="fas fa-calendar-check"></i><span>Attendance Report</span></div>
            <div class="quick-action" onclick="generateReport('fees')"><i class="fas fa-rupee-sign"></i><span>Fee Collection</span></div>
            <div class="quick-action" onclick="generateReport('pending')"><i class="fas fa-exclamation-triangle"></i><span>Pending Fees</span></div>
            <div class="quick-action" onclick="generateReport('toppers')"><i class="fas fa-trophy"></i><span>Topper Report</span></div>
            <div class="quick-action" onclick="generateReport('students')"><i class="fas fa-user-graduate"></i><span>Student Report</span></div>
            <div class="quick-action" onclick="generateReport('batch')"><i class="fas fa-layer-group"></i><span>Batch Performance</span></div>
        </div>
        <div id="reportOutput"></div>`;
}

async function generateReport(type) {
    let html = '';
    if (type==='attendance') {
        const data = await api('/api/attendance?date='+localDateStr());
        const list = Array.isArray(data)?data:[];
        const p=list.filter(a=>a.Status==='Present').length, ab=list.filter(a=>a.Status==='Absent').length;
        html = `<h3>Today's Attendance</h3><div class="perf-grid"><div class="perf-card"><div class="perf-value" style="color:var(--success)">${p}</div><div class="perf-label">Present</div></div><div class="perf-card"><div class="perf-value" style="color:var(--danger)">${ab}</div><div class="perf-label">Absent</div></div><div class="perf-card"><div class="perf-value">${list.length?Math.round(p/list.length*100):0}%</div><div class="perf-label">Rate</div></div></div>`;
    } else if (type==='fees') {
        const data = await api('/api/fees');
        const list = Array.isArray(data)?data:[];
        const total = list.reduce((s,f)=>s+parseFloat(f.PaidAmount||0),0);
        html = `<h3>Fee Collection Summary</h3><div class="perf-grid"><div class="perf-card"><div class="perf-value">${formatCurrency(total)}</div><div class="perf-label">Total Collected</div></div><div class="perf-card"><div class="perf-value">${list.filter(f=>f.Status==='Paid').length}</div><div class="perf-label">Paid</div></div><div class="perf-card"><div class="perf-value">${list.filter(f=>f.Status==='Pending').length}</div><div class="perf-label">Pending</div></div></div>`;
    } else if (type==='toppers') {
        const data = await api('/api/results');
        const list = (Array.isArray(data)?data:[]).sort((a,b)=>(b.Percentage||0)-(a.Percentage||0)).slice(0,10);
        html = `<h3>🏆 Top Performers</h3><table><thead><tr><th>#</th><th>Student</th><th>Test</th><th>Marks</th><th>%</th><th>Grade</th></tr></thead><tbody>${list.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${r.FullName}</strong></td><td>${r.TestName}</td><td>${r.MarksObtained}/${r.MaximumMarks}</td><td style="font-weight:700;color:var(--success)">${r.Percentage||0}%</td><td>${r.Grade}</td></tr>`).join('')}</tbody></table>`;
    } else if (type==='pending') {
        const data = await api('/api/fees/pending');
        const list = Array.isArray(data)?data:[];
        html = `<h3>Pending Fees Report</h3><table><thead><tr><th>Student</th><th>Class</th><th>Month</th><th>Pending Amount</th></tr></thead><tbody>${list.map(f=>`<tr><td>${f.FullName}</td><td>${f.Class}</td><td>${f.Month} ${f.Year}</td><td style="color:var(--danger);font-weight:700">${formatCurrency(f.TotalFee-f.PaidAmount)}</td></tr>`).join('')}</tbody></table>`;
    } else if (type==='students') {
        const data = await api('/api/students');
        const list = Array.isArray(data)?data:[];
        html = `<h3>Student Report (${list.length} students)</h3><table><thead><tr><th>Name</th><th>Class</th><th>Batch</th><th>Phone</th><th>Status</th></tr></thead><tbody>${list.map(s=>`<tr><td>${s.FullName}</td><td>${s.Class}</td><td>${s.BatchName||'-'}</td><td>${s.ParentPhone||'-'}</td><td><span class="status-badge status-${(s.Status||'').toLowerCase()}">${s.Status}</span></td></tr>`).join('')}</tbody></table>`;
    } else {
        const data = await api('/api/batches');
        const list = Array.isArray(data)?data:[];
        html = `<h3>Batch Performance</h3><table><thead><tr><th>Batch</th><th>Class</th><th>Students</th><th>Fee/Month</th></tr></thead><tbody>${list.map(b=>`<tr><td>${b.BatchName}</td><td>${b.Class}</td><td>${b.StudentCount||0}</td><td>${formatCurrency(b.MonthlyFee)}</td></tr>`).join('')}</tbody></table>`;
    }
    $('reportOutput').innerHTML = `<div class="data-table-container" style="padding:20px">${html}<div style="margin-top:16px"><button class="btn btn-outline" onclick="window.print()"><i class="fas fa-print"></i> Print</button></div></div>`;
}

// ═══ Settings Page ═══
function settingsEsc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function loadSettings() {
    const settings = await api('/api/settings');
    $('contentArea').innerHTML = `
        <div class="section-header"><div class="section-title"><i class="fas fa-cog"></i> Settings</div></div>
        <div class="data-table-container" style="padding:24px;margin-bottom:20px">
            <h3 style="margin-bottom:16px"><i class="fas fa-school" style="color:var(--accent)"></i> Institute Details</h3>
            <form onsubmit="saveInstituteSettings(event)">
                <div class="modal-form">
                    <div class="form-group"><label>Institute Name</label><input id="set_name" value="${settingsEsc(settings.instituteName)}"></div>
                    <div class="form-row"><div class="form-group"><label>Phone</label><input id="set_phone" value="${settingsEsc(settings.phone)}"></div><div class="form-group"><label>Email</label><input id="set_email" value="${settingsEsc(settings.email)}"></div></div>
                    <div class="form-group"><label>Address</label><input id="set_address" value="${settingsEsc(settings.address)}"></div>
                    <div class="form-group"><label>Classes Offered</label><input value="${(settings.classes || []).join(', ')}" readonly></div>
                </div>
                <div class="modal-actions" style="justify-content:flex-start"><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Details</button></div>
            </form>
        </div>
        <div class="data-table-container" style="padding:24px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px">
                <h3 style="margin:0"><i class="fas fa-qrcode" style="color:var(--accent)"></i> Fee Payment QR</h3>
                <button class="btn btn-primary" onclick="showPaymentSettings()"><i class="fas fa-pen"></i> Edit Payment QR / UPI</button>
            </div>
            <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">
                <div style="text-align:center">
                    ${settings.qrImage
                        ? '<img src="' + settings.qrImage + '" class="qr-image">'
                        : '<div class="qr-placeholder"><i class="fas fa-qrcode"></i><p>No QR uploaded</p><small>Upload your GPay / PhonePe QR</small></div>'}
                </div>
                <div style="flex:1;min-width:220px">
                    <div class="settings-row"><span>UPI ID</span><strong>${settings.upiId ? settingsEsc(settings.upiId) : '<span style="color:var(--text-muted);font-weight:400">Not set</span>'}</strong></div>
                    <div class="settings-row"><span>Display Name</span><strong>${settingsEsc(settings.upiName || '-')}</strong></div>
                    <p style="color:var(--text-muted);font-size:.8rem;margin-top:12px">Students see this QR on their Pay Fees page. Upload a screenshot of the QR from GPay/PhonePe, and optionally add your UPI ID so the pay buttons work.</p>
                </div>
            </div>
        </div>`;
}

async function saveInstituteSettings(e) {
    e.preventDefault();
    const r = await post('/api/settings', {
        instituteName: $('set_name').value,
        phone: $('set_phone').value,
        email: $('set_email').value,
        address: $('set_address').value
    });
    if (r.success) toast('Settings saved'); else toast(r.error || 'Error saving', 'error');
}

// ═══ Data Export ═══
function exportData(type) { toast('Export feature - use Print button in Reports section', 'info'); }
