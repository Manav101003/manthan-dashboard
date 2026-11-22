// ═══ Teachers Page ═══
async function loadTeachers() {
    const teachers = await api('/api/teachers');
    const list = Array.isArray(teachers) ? teachers : [];
    $('contentArea').innerHTML = `
        <div class="section-header">
            <div class="section-title"><i class="fas fa-chalkboard-teacher"></i> Teachers Management</div>
            <div class="section-actions">${currentUser.role==='admin'?'<button class="btn btn-primary" onclick="showTeacherForm()"><i class="fas fa-plus"></i> Add Teacher</button>':''}</div>
        </div>
        <div class="data-table-container">
            <div class="table-toolbar"><div class="table-search"><i class="fas fa-search"></i><input placeholder="Search teachers..." oninput="filterTable(this.value,'teachersTable')"></div></div>
            <table id="teachersTable"><thead><tr><th>#</th><th>Name</th><th>Subject</th><th>Phone</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${list.map((t,i)=>`<tr><td>${i+1}</td><td><strong>${t.Name}</strong></td><td>${t.Subject||'-'}</td><td>${t.Phone||'-'}</td><td>${t.Email||'-'}</td>
            <td><span class="status-badge status-${(t.Status||'').toLowerCase()}">${t.Status}</span></td>
            <td><div class="action-btns">${currentUser.role==='admin'?`<button class="action-btn" onclick='showTeacherForm(${JSON.stringify(t).replace(/\'/g,"&#39;")})'><i class="fas fa-edit"></i></button><button class="action-btn delete" onclick="deleteTeacher(${t.TeacherId})"><i class="fas fa-trash"></i></button>`:''}</div></td></tr>`).join('')}</tbody></table>
            ${!list.length?'<div class="empty-state"><i class="fas fa-chalkboard-teacher"></i><h3>No teachers</h3></div>':''}
        </div>`;
}

function showTeacherForm(t=null) {
    openModal(`<div class="modal-header"><h2>${t?'Edit':'Add'} Teacher</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <form class="modal-form" onsubmit="saveTeacher(event,${t?t.TeacherId:'null'})">
        <div class="form-row"><div class="form-group"><label>Name *</label><input id="tf_name" value="${t?.Name||''}" required></div><div class="form-group"><label>Subject</label><input id="tf_subj" value="${t?.Subject||''}"></div></div>
        <div class="form-row"><div class="form-group"><label>Phone</label><input id="tf_phone" value="${t?.Phone||''}"></div><div class="form-group"><label>Email</label><input type="email" id="tf_email" value="${t?.Email||''}"></div></div>
        ${!t?'<div class="form-row"><div class="form-group"><label>Username *</label><input id="tf_user" required></div><div class="form-group"><label>Password</label><input id="tf_pass" value="teacher123"></div></div>':''}
        ${t?`<div class="form-group"><label>Status</label><select id="tf_status"><option ${t.Status==='Active'?'selected':''}>Active</option><option ${t.Status==='Inactive'?'selected':''}>Inactive</option></select></div>`:''}
        <div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">${t?'Update':'Add'}</button></div>
    </form>`);
}

async function saveTeacher(e,id) {
    e.preventDefault();
    const data = { Name:$('tf_name').value, Subject:$('tf_subj').value, Phone:$('tf_phone').value, Email:$('tf_email').value };
    if(id) data.Status=$('tf_status')?.value||'Active'; else { data.Username=$('tf_user').value; data.Password=$('tf_pass').value; }
    const r = id ? await put(`/api/teachers/${id}`,data) : await post('/api/teachers',data);
    if(r.success){toast(id?'Updated':'Added');closeModal();loadTeachers();}else toast(r.error||'Error','error');
}

async function deleteTeacher(id){if(confirm('Delete?')){await del(`/api/teachers/${id}`);toast('Deleted');loadTeachers();}}

// ═══ Batches Page ═══
async function loadBatches() {
    const [batches, teachers] = await Promise.all([api('/api/batches'), api('/api/teachers')]);
    const list = Array.isArray(batches) ? batches : [];
    $('contentArea').innerHTML = `
        <div class="section-header">
            <div class="section-title"><i class="fas fa-layer-group"></i> Batch Management</div>
            <div class="section-actions">${currentUser.role==='admin'?'<button class="btn btn-primary" onclick="showBatchForm()"><i class="fas fa-plus"></i> Add Batch</button>':''}</div>
        </div>
        <div class="stats-grid" style="margin-bottom:20px">${list.slice(0,6).map(b=>`<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-layer-group"></i></div><span class="stat-card-label">${b.Class}</span></div><div class="stat-card-value" style="font-size:1.1rem">${b.BatchName}</div><div class="stat-card-change">${b.StudentCount||0} students • ${formatCurrency(b.MonthlyFee)}/mo</div></div>`).join('')}</div>
        <div class="data-table-container">
            <table><thead><tr><th>#</th><th>Batch</th><th>Class</th><th>Subject</th><th>Timing</th><th>Teacher</th><th>Fee</th><th>Students</th><th>Actions</th></tr></thead>
            <tbody>${list.map((b,i)=>`<tr><td>${i+1}</td><td><strong>${b.BatchName}</strong></td><td>${b.Class}</td><td>${b.Subject||'-'}</td><td>${b.Timing||'-'}</td><td>${b.TeacherName||'-'}</td><td>${formatCurrency(b.MonthlyFee)}</td><td>${b.StudentCount||0}</td>
            <td><div class="action-btns">${currentUser.role==='admin'?`<button class="action-btn" onclick='showBatchForm(${JSON.stringify(b).replace(/\'/g,"&#39;")})'><i class="fas fa-edit"></i></button><button class="action-btn delete" onclick="deleteBatch(${b.BatchId})"><i class="fas fa-trash"></i></button>`:''}</div></td></tr>`).join('')}</tbody></table>
        </div>`;
}

function showBatchForm(b=null) {
    api('/api/teachers').then(teachers => {
        const tl = Array.isArray(teachers)?teachers:[];
        openModal(`<div class="modal-header"><h2>${b?'Edit':'Add'} Batch</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
        <form class="modal-form" onsubmit="saveBatch(event,${b?b.BatchId:'null'})">
            <div class="form-row"><div class="form-group"><label>Batch Name *</label><input id="bf_name" value="${b?.BatchName||''}" required></div><div class="form-group"><label>Class *</label><select id="bf_class">${['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th'].map(c=>`<option ${b?.Class===c?'selected':''}>${c}</option>`).join('')}</select></div></div>
            <div class="form-row"><div class="form-group"><label>Subject</label><input id="bf_subj" value="${b?.Subject||''}"></div><div class="form-group"><label>Timing</label><input id="bf_time" value="${b?.Timing||''}"></div></div>
            <div class="form-row"><div class="form-group"><label>Teacher</label><select id="bf_teacher"><option value="">Select</option>${tl.map(t=>`<option value="${t.TeacherId}" ${b?.TeacherId==t.TeacherId?'selected':''}>${t.Name} (${t.Subject||''})</option>`).join('')}</select></div><div class="form-group"><label>Monthly Fee (₹)</label><input type="number" id="bf_fee" value="${b?.MonthlyFee||0}"></div></div>
            <div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">${b?'Update':'Add'}</button></div>
        </form>`);
    });
}

async function saveBatch(e,id) {
    e.preventDefault();
    const data={BatchName:$('bf_name').value,Class:$('bf_class').value,Subject:$('bf_subj').value,Timing:$('bf_time').value,TeacherId:$('bf_teacher').value||null,MonthlyFee:$('bf_fee').value};
    if(id)data.Status='Active';
    const r=id?await put(`/api/batches/${id}`,data):await post('/api/batches',data);
    if(r.success){toast(id?'Updated':'Added');closeModal();loadBatches();}else toast(r.error||'Error','error');
}

async function deleteBatch(id){if(confirm('Delete?')){await del(`/api/batches/${id}`);toast('Deleted');loadBatches();}}
