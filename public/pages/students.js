// ═══ Students Page ═══
async function loadStudents() {
    var students = await api('/api/students');
    var list = Array.isArray(students) ? students : [];

    var rows = list.map(function(s, i) {
        var actionBtns = '<button class="action-btn" title="View" onclick="viewStudent(' + s.StudentId + ')"><i class="fas fa-eye"></i></button>';
        if (currentUser.role === 'admin') {
            actionBtns += '<button class="action-btn" title="Change Password" style="color:var(--accent)" onclick="promptChangeStudentPassword(' + s.StudentId + ',\'' + (s.FullName||'').replace(/'/g, "\\'") + '\')"><i class="fas fa-key"></i></button>';
            actionBtns += '<button class="action-btn" title="Edit" onclick="editStudentById(' + s.StudentId + ')"><i class="fas fa-edit"></i></button>';
            actionBtns += '<button class="action-btn delete" title="Delete" onclick="deleteStudent(' + s.StudentId + ')"><i class="fas fa-trash"></i></button>';
        }
        return '<tr data-class="' + (s.Class||'') + '" data-status="' + (s.Status||'') + '"><td>' + (i+1) + '</td><td><strong>' + s.FullName + '</strong><br><small style="color:var(--text-muted)">' + (s.FatherName||'') + '</small></td><td>' + (s.Class||'-') + '</td><td>' + (s.AllBatches||s.BatchName||'-') + '</td><td>' + (s.StudentPhone||'-') + '</td><td>' + (s.ParentPhone||'-') + '</td><td><span class="status-badge status-' + (s.Status||'').toLowerCase() + '">' + (s.Status||'-') + '</span></td><td><div class="action-btns">' + actionBtns + '</div></td></tr>';
    }).join('');

    var classOpts = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map(function(c) { return '<option>' + c + '</option>'; }).join('');
    var addBtn = currentUser.role === 'admin' ? '<button class="btn btn-primary" onclick="showStudentForm()"><i class="fas fa-plus"></i> Add Student</button>' : '';

    $('contentArea').innerHTML = '<div class="section-header"><div class="section-title"><i class="fas fa-user-graduate"></i> Students Management</div><div class="section-actions">' + addBtn + '<button class="btn btn-outline" onclick="exportStudentsCsv()"><i class="fas fa-download"></i> Export CSV</button></div></div>' +
        '<div class="data-table-container"><div class="table-toolbar"><div class="table-search"><i class="fas fa-search"></i><input type="text" placeholder="Search students..." oninput="filterTable(this.value,\'studentsTable\')"></div><div class="table-filters"><select class="filter-select" onchange="filterByClass(this.value)"><option value="">All Classes</option>' + classOpts + '</select><select class="filter-select" onchange="filterByStatus(this.value)"><option value="">All Status</option><option>Active</option><option>Inactive</option></select></div></div>' +
        '<div style="overflow-x:auto"><table id="studentsTable"><thead><tr><th>#</th><th>Name</th><th>Class</th><th>Batch</th><th>Phone</th><th>Parent Phone</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (list.length === 0 ? '<div class="empty-state"><i class="fas fa-user-graduate"></i><h3>No students found</h3></div>' : '') + '</div>';
}

async function showStudentForm(s) {
    s = s || null;
    var batches = await api('/api/batches');
    window._studentBatches = Array.isArray(batches) ? batches : [];
    window._editBatchId = s ? (s.BatchId || null) : null;
    var classOpts = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map(function(c) { return '<option ' + (s && s.Class===c ? 'selected' : '') + '>' + c + '</option>'; }).join('');
    var currentClass = s ? s.Class : '1st';

    openModal('<div class="modal-header"><h2>' + (s ? 'Edit' : 'Add') + ' Student</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<form class="modal-form" onsubmit="saveStudent(event,' + (s ? s.StudentId : 'null') + ')">' +
        '<div class="form-row"><div class="form-group"><label>Full Name *</label><input id="sf_name" value="' + (s ? s.FullName||'' : '') + '" required></div><div class="form-group"><label>Class *</label><select id="sf_class" onchange="updateSubjectOptions()" required>' + classOpts + '</select></div></div>' +
        '<div class="form-group"><label>Subjects *</label><div id="sf_subjects_container"></div></div>' +
        '<div class="form-group"><label>Batch *</label><select id="sf_batch" onchange="updateBatchHint()"></select><small id="sf_batch_hint" style="color:var(--text-muted);font-size:.75rem;display:block;margin-top:4px"></small></div>' +
        '<div class="form-row"><div class="form-group"><label>Father\'s Name</label><input id="sf_father" value="' + (s ? s.FatherName||'' : '') + '"></div><div class="form-group"><label>Mother\'s Name</label><input id="sf_mother" value="' + (s ? s.MotherName||'' : '') + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Student Phone</label><input id="sf_phone" value="' + (s ? s.StudentPhone||'' : '') + '"></div><div class="form-group"><label>Parent Phone</label><input id="sf_pphone" value="' + (s ? s.ParentPhone||'' : '') + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Date of Birth</label><input type="date" id="sf_dob" value="' + (s && s.DateOfBirth ? s.DateOfBirth.split('T')[0] : '') + '"></div><div class="form-group"><label>Gender</label><select id="sf_gender"><option ' + (s && s.Gender==='Male'?'selected':'') + '>Male</option><option ' + (s && s.Gender==='Female'?'selected':'') + '>Female</option><option ' + (s && s.Gender==='Other'?'selected':'') + '>Other</option></select></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Username *</label><input id="sf_user" value="' + (s ? s.Username||'' : '') + '" required></div><div class="form-group"><label>Address</label><input id="sf_addr" value="' + (s ? s.Address||'' : '') + '"></div></div>' +
        '<div class="form-group"><label>' + (s ? 'Change Password (leave blank to keep current)' : 'Password') + '</label><input id="sf_pass" ' + (s ? 'placeholder="Leave blank to keep unchanged"' : 'value="student123"') + '></div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">' + (s ? 'Update' : 'Add') + ' Student</button></div></form>');

    // Store existing batch IDs / subjects if editing
    window._editSubjects = (s && s._subjects) ? s._subjects : null;
    window._editBatchIds = (s && s._batchIds) ? s._batchIds : null;
    updateSubjectOptions();
}

function updateSubjectOptions() {
    var cls = document.getElementById('sf_class').value;
    var container = document.getElementById('sf_subjects_container');
    if (!container) return;
    var classNum = parseInt(cls);
    var existing = window._editSubjects || null;

    if (classNum >= 1 && classNum <= 5) {
        container.innerHTML = '<div style="padding:10px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius)">' +
            '<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" class="subj-check" value="All Subjects" checked disabled><span style="font-weight:600">All Subjects</span><span style="color:var(--text-muted);font-size:.8rem">(all subjects included)</span></label></div>';
    } else {
        var subjects = [
            { label: 'Maths', value: 'Mathematics' },
            { label: 'Science', value: 'Science' }
        ];
        var html = '<div style="display:flex;gap:16px;flex-wrap:wrap">';
        subjects.forEach(function(subj) {
            var checked = !existing || existing.indexOf(subj.value) >= 0 ? 'checked' : '';
            html += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 16px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius)">' +
                '<input type="checkbox" class="subj-check" value="' + subj.value + '" ' + checked + ' onchange="updateStudentBatchOptions()">' +
                '<span style="font-weight:600">' + subj.label + '</span></label>';
        });
        html += '</div><small style="color:var(--text-muted);font-size:.75rem;display:block;margin-top:6px">Optional — choose Maths, Science, or both.</small>';
        container.innerHTML = html;
    }
    updateStudentBatchOptions();
}

function studentSubjectMatches(selected, batchSubject) {
    var a = String(selected || '').trim().toLowerCase();
    var b = String(batchSubject || '').trim().toLowerCase();
    if (a === b) return true;
    if ((b === 'maths + science' || b === 'mathematics + science') && (a === 'mathematics' || a === 'science')) return true;
    if ((a === 'maths + science' || a === 'mathematics + science') && (b === 'mathematics' || b === 'science')) return true;
    return false;
}

// Show the batches available for the selected class and pick the best match
function updateStudentBatchOptions() {
    var clsEl = document.getElementById('sf_class');
    var sel = document.getElementById('sf_batch');
    if (!clsEl || !sel) return;
    var list = (window._studentBatches || []).filter(function(b) { return b.Class === clsEl.value; });

    if (!list.length) {
        sel.innerHTML = '<option value="">No batch for Class ' + clsEl.value + ' yet</option>';
        updateBatchHint();
        return;
    }

    var checked = Array.prototype.map.call(document.querySelectorAll('.subj-check:checked'), function(c) { return c.value; });
    var preferred = window._editBatchId;
    if (!preferred || !list.some(function(b) { return String(b.BatchId) === String(preferred); })) {
        var match = list.filter(function(b) { return checked.some(function(v) { return studentSubjectMatches(v, b.Subject); }); })[0];
        preferred = match ? match.BatchId : list[0].BatchId;
    }
    sel.innerHTML = list.map(function(b) {
        var label = b.BatchName + (b.Timing ? ' — ' + formatTiming(b.Timing) : '') + ' (' + b.Subject + ')';
        return '<option value="' + b.BatchId + '" ' + (String(b.BatchId) === String(preferred) ? 'selected' : '') + '>' + label + '</option>';
    }).join('');
    window._editBatchId = null;
    updateBatchHint();
}

function updateBatchHint() {
    var el = document.getElementById('sf_batch_hint');
    if (!el) return;
    if (!(window._studentBatches || []).filter(function(b) { return b.Class === $('sf_class').value; }).length) {
        el.innerHTML = '<i class="fas fa-info-circle"></i> Create a batch for this class first — students added now will be allotted automatically once you do.';
    } else {
        el.innerHTML = '<i class="fas fa-check-circle"></i> Allotted automatically by class. For classes 6–12, the student is also enrolled in every subject batch selected above.';
    }
}

async function saveStudent(e, id) {
    e.preventDefault();
    var cls = document.getElementById('sf_class').value;

    // Get selected subjects
    var checks = document.querySelectorAll('.subj-check:checked');
    var selectedSubjects = [];
    checks.forEach(function(c) { selectedSubjects.push(c.value); });
    if (!selectedSubjects.length) { toast('Select at least one subject', 'error'); return; }

    var data = { FullName: $('sf_name').value, Class: cls, FatherName: $('sf_father').value, MotherName: $('sf_mother').value, StudentPhone: $('sf_phone').value, ParentPhone: $('sf_pphone').value, DateOfBirth: $('sf_dob').value, Gender: $('sf_gender').value, Username: $('sf_user').value, Address: $('sf_addr').value, Subjects: selectedSubjects, BatchId: $('sf_batch') ? ($('sf_batch').value || null) : null };
    if ($('sf_pass') && $('sf_pass').value.trim()) {
        data.Password = $('sf_pass').value.trim();
    } else if (!id) {
        data.Password = 'student123';
    }

    var r = id ? await put('/api/students/' + id, data) : await post('/api/students', data);
    if (r.success) { toast(id ? 'Student updated' : 'Student added'); closeModal(); loadStudents(); }
    else toast(r.error || 'Error', 'error');
}

async function editStudentById(id) {
    var results = await Promise.all([api('/api/students/' + id), api('/api/batches'), api('/api/students/' + id + '/batches')]);
    var s = results[0];
    var bl = Array.isArray(results[1]) ? results[1] : [];
    var mine = Array.isArray(results[2]) ? results[2] : [];
    var byId = {};
    bl.forEach(function(b) { byId[String(b.BatchId)] = b; });
    s._batchIds = mine.map(function(x) { return x.BatchId; });
    s._subjects = [];
    mine.forEach(function(x) {
        var b = byId[String(x.BatchId)];
        if (b && b.Subject && s._subjects.indexOf(b.Subject) < 0) s._subjects.push(b.Subject);
    });
    showStudentForm(s);
}

function editStudent(s) { editStudentById(s.StudentId); }
async function deleteStudent(id) { if (confirm('Delete this student?')) { await del('/api/students/' + id); toast('Student deleted'); loadStudents(); } }

async function viewStudent(id) {
    var s = await api('/api/students/' + id);
    openModal('<div class="modal-header"><h2>Student Details</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
    '<div class="perf-grid"><div class="perf-card"><div class="perf-value" style="font-size:1.2rem">' + s.FullName + '</div><div class="perf-label">Student Name</div></div>' +
    '<div class="perf-card"><div class="perf-value" style="font-size:1.2rem">' + (s.Class||'-') + '</div><div class="perf-label">Class</div></div></div>' +
    '<div style="margin-top:16px"><p><strong>Father:</strong> ' + (s.FatherName||'-') + ' | <strong>Mother:</strong> ' + (s.MotherName||'-') + '</p>' +
    '<p><strong>Phone:</strong> ' + (s.StudentPhone||'-') + ' | <strong>Parent:</strong> ' + (s.ParentPhone||'-') + '</p>' +
    '<p><strong>Batch:</strong> ' + (s.AllBatches || s.BatchName || '-') + ' | <strong>Fee:</strong> ' + formatCurrency(s.MonthlyFee) + '/month</p>' +
    '<p><strong>DOB:</strong> ' + formatDate(s.DateOfBirth) + ' | <strong>Admission:</strong> ' + formatDate(s.AdmissionDate) + '</p>' +
    '<p><strong>Address:</strong> ' + (s.Address||'-') + '</p></div>');
}

function filterTable(query, tableId) {
    var rows = document.querySelectorAll('#' + tableId + ' tbody tr');
    rows.forEach(function(r) { r.style.display = r.textContent.toLowerCase().indexOf(query.toLowerCase()) >= 0 ? '' : 'none'; });
}
function filterByClass(cls) { document.querySelectorAll('#studentsTable tbody tr').forEach(function(r) { r.style.display = !cls || r.dataset.class === cls ? '' : 'none'; }); }
function filterByStatus(st) { document.querySelectorAll('#studentsTable tbody tr').forEach(function(r) { r.style.display = !st || r.dataset.status === st ? '' : 'none'; }); }


// Export the student list as a CSV file
async function exportStudentsCsv() {
    var list = await api('/api/students');
    if (!Array.isArray(list) || !list.length) { toast('No students to export', 'error'); return; }
    var cols = ['FullName','Class','Batches','FatherName','MotherName','StudentPhone','ParentPhone','Address','AdmissionDate','Status'];
    function cell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    var rows = list.map(function(s) {
        return [s.FullName, s.Class, s.AllBatches || s.BatchName || '', s.FatherName, s.MotherName, s.StudentPhone, s.ParentPhone, s.Address, (s.AdmissionDate || '').split('T')[0], s.Status].map(cell).join(',');
    });
    var csv = [cols.map(cell).join(',')].concat(rows).join('\r\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'students.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
    toast('Students exported');
}

function promptChangeStudentPassword(id, name) {
    openModal('<div class="modal-header"><h2><i class="fas fa-key" style="color:var(--accent)"></i> Change Password for ' + name + '</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<form class="modal-form" onsubmit="saveStudentPassword(event,' + id + ')">' +
        '<div class="form-group"><label>New Password *</label><input type="text" id="csp_pass" value="student123" required>' +
        '<small style="color:var(--text-muted);font-size:.75rem;display:block;margin-top:6px">Immediately updates student login credentials in database without student consent or notification.</small></div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Password</button></div></form>');
}

async function saveStudentPassword(e, id) {
    e.preventDefault();
    var pass = $('csp_pass').value;
    if (!pass || !pass.trim()) { toast('Password cannot be empty', 'error'); return; }
    var r = await put('/api/students/' + id + '/password', { password: pass.trim() });
    if (r.success) {
        toast('Student password updated successfully');
        closeModal();
    } else {
        toast(r.error || 'Failed to update password', 'error');
    }
}
