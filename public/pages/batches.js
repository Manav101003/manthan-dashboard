// ═══ Batches Page ═══
// Default timings per class (24h: start, end). Blank = admin sets it manually.
var CLASS_TIMINGS = {
    '1st': ['16:00', '18:30'],
    '2nd': ['16:00', '18:30'],
    '3rd': ['16:00', '18:30'],
    '4th': ['16:00', '18:30'],
    '5th': ['16:00', '18:30'],
    '6th': ['', ''],
    '7th': ['', ''],
    '8th': ['18:30', '19:30'],
    '9th': ['19:30', '20:30'],
    '10th': ['17:45', '19:30'],
    '11th': ['', ''],
    '12th': ['', '']
};

async function loadBatches() {
    const batches = await api('/api/batches');
    const list = Array.isArray(batches) ? batches : [];
    $('contentArea').innerHTML = `
        <div class="section-header">
            <div class="section-title"><i class="fas fa-layer-group"></i> Batch Management</div>
            <div class="section-actions">${currentUser.role==='admin'?'<button class="btn btn-primary" onclick="showBatchForm()"><i class="fas fa-plus"></i> Add Batch</button>':''}</div>
        </div>
        <div class="stats-grid" style="margin-bottom:20px">${list.slice(0,6).map(b=>`<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-layer-group"></i></div><span class="stat-card-label">${b.Class}</span></div><div class="stat-card-value" style="font-size:1.1rem">${b.BatchName}</div><div class="stat-card-change">${b.StudentCount||0} students • ${formatCurrency(b.MonthlyFee)}/mo</div></div>`).join('')}</div>
        <div class="data-table-container">
            <table><thead><tr><th>#</th><th>Batch</th><th>Class</th><th>Subject</th><th>Timing</th><th>Fee</th><th>Students</th><th>Actions</th></tr></thead>
            <tbody>${list.map((b,i)=>`<tr><td>${i+1}</td><td><strong>${b.BatchName}</strong></td><td>${b.Class}</td><td>${b.Subject||'-'}</td><td>${formatTiming(b.Timing)}</td><td>${formatCurrency(b.MonthlyFee)}</td><td>${b.StudentCount||0}</td>
            <td><div class="action-btns">${currentUser.role==='admin'?`<button class="action-btn" onclick='showBatchForm(${JSON.stringify(b).replace(/\'/g,"&#39;")})'><i class="fas fa-edit"></i></button><button class="action-btn delete" onclick="deleteBatch(${b.BatchId})"><i class="fas fa-trash"></i></button>`:''}</div></td></tr>`).join('')}</tbody></table>
            ${!list.length?'<div class="empty-state"><i class="fas fa-layer-group"></i><h3>No batches yet</h3><p>Create your first batch to start adding students.</p></div>':''}
        </div>`;
}

function showBatchForm(b=null) {
    window._batchSubject = b ? (b.Subject || '') : '';
    openModal(`<div class="modal-header"><h2>${b?'Edit':'Add'} Batch</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <form class="modal-form" onsubmit="saveBatch(event,${b?b.BatchId:'null'})">
        <div class="form-row"><div class="form-group"><label>Batch Name *</label><input id="bf_name" value="${b?.BatchName||''}" required placeholder="e.g. Class 10 - Maths"></div><div class="form-group"><label>Class *</label><select id="bf_class" onchange="onBatchClassChange()">${['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map(c=>`<option ${b?.Class===c?'selected':''}>${c}</option>`).join('')}</select></div></div>
        <div class="form-row"><div class="form-group"><label>Subject *</label><select id="bf_subj" onchange="autoBatchName()"></select></div><div class="form-group"><label>Monthly Fee (₹)</label><input type="number" id="bf_fee" value="${b?.MonthlyFee||0}"></div></div>
        <div class="form-row">
            <div class="form-group"><label>Start Time *</label><input type="time" id="bf_start" required onchange="updateTimingHint()"></div>
            <div class="form-group"><label>End Time *</label><input type="time" id="bf_end" required onchange="updateTimingHint()"></div>
        </div>
        <div id="bf_time_hint" style="margin:-6px 0 12px;font-size:.76rem;color:var(--text-muted)"></div>
        <div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">${b?'Update':'Add'}</button></div>
    </form>`);

    window._autoBatchName = b ? null : '';
    updateBatchSubjectOptions();

    // Editing: keep the saved timing; new batch: apply the class default
    var parsed = b ? parseTimingRange(b.Timing) : null;
    if (parsed) {
        $('bf_start').value = parsed[0];
        $('bf_end').value = parsed[1];
    } else {
        applyClassTiming();
    }
    autoBatchName();
    updateTimingHint();
}

// Class 1-5 → All Subjects; Class 6-12 → Maths or Science
function updateBatchSubjectOptions() {
    var clsEl = document.getElementById('bf_class');
    var sel = document.getElementById('bf_subj');
    if (!clsEl || !sel) return;
    var classNum = parseInt(clsEl.value);
    var opts = (classNum >= 1 && classNum <= 5) ? ['All Subjects'] : ['Mathematics', 'Science'];
    var existing = window._batchSubject || '';
    if (existing && opts.indexOf(existing) < 0) opts.push(existing);
    sel.innerHTML = opts.map(function(s) { return '<option value="' + s + '" ' + (existing === s ? 'selected' : '') + '>' + s + '</option>'; }).join('');
    window._batchSubject = '';
}

function onBatchClassChange() {
    updateBatchSubjectOptions();
    applyClassTiming();
    autoBatchName();
    updateTimingHint();
}

// Fill the start/end fields with the default for the selected class
function applyClassTiming() {
    var cls = $('bf_class') ? $('bf_class').value : '';
    var range = CLASS_TIMINGS[cls] || ['', ''];
    if ($('bf_start')) $('bf_start').value = range[0];
    if ($('bf_end')) $('bf_end').value = range[1];
    updateTimingHint();
}

function updateTimingHint() {
    var el = document.getElementById('bf_time_hint');
    if (!el) return;
    var cls = $('bf_class').value;
    var range = CLASS_TIMINGS[cls] || ['', ''];
    if (range[0] && range[1]) {
        el.innerHTML = '<i class="fas fa-clock"></i> Class ' + cls + ' default: <strong>' + formatTime12(range[0]) + ' - ' + formatTime12(range[1]) + '</strong> — you can change it.';
    } else {
        el.innerHTML = '<i class="fas fa-pen"></i> No default timing for Class ' + cls + ' — set the timing manually.';
    }
}

// Suggest a name like "Class 10 - Mathematics" without overwriting a custom name
function autoBatchName() {
    var nameEl = document.getElementById('bf_name');
    var clsEl = document.getElementById('bf_class');
    var subjEl = document.getElementById('bf_subj');
    if (!nameEl || !clsEl || !subjEl) return;
    var suggested = 'Class ' + clsEl.value + ' - ' + subjEl.value;
    if (!nameEl.value || nameEl.value === window._autoBatchName) {
        nameEl.value = suggested;
        window._autoBatchName = suggested;
    }
}

// "4:00 PM - 6:30 PM" / "16:00 - 18:30" / "8:00-9:00 AM" → ["16:00","18:30"]
function parseTimingRange(str) {
    if (!str) return null;
    var m = String(str).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[-–—]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return null;
    var ap1 = m[3] ? m[3].toUpperCase() : '';
    var ap2 = m[6] ? m[6].toUpperCase() : '';
    if (ap1 && !ap2) ap2 = ap1;
    if (!ap1 && ap2) ap1 = ap2;
    function to24(h, mi, ap) {
        h = parseInt(h, 10);
        if (ap) h = (h % 12) + (ap === 'PM' ? 12 : 0);
        return String(h).padStart(2, '0') + ':' + mi;
    }
    return [to24(m[1], m[2], ap1), to24(m[4], m[5], ap2)];
}

async function saveBatch(e,id) {
    e.preventDefault();
    var start = $('bf_start').value;
    var end = $('bf_end').value;
    if (!start || !end) { toast('Please set the batch start and end time', 'error'); return; }
    if (end <= start) { toast('End time must be after start time', 'error'); return; }
    const data={BatchName:$('bf_name').value,Class:$('bf_class').value,Subject:$('bf_subj').value,Timing:start + ' - ' + end,MonthlyFee:$('bf_fee').value};
    if(id)data.Status='Active';
    const r=id?await put(`/api/batches/${id}`,data):await post('/api/batches',data);
    if(r.success){toast(id?'Updated':'Added');closeModal();loadBatches();}else toast(r.error||'Error','error');
}

async function deleteBatch(id){if(confirm('Delete this batch?')){const r=await del(`/api/batches/${id}`);if(r.success){toast('Deleted');loadBatches();}else toast(r.error||'Delete failed','error');}}
