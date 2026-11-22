// ═══ Attendance Page ═══
async function loadAttendance() {
    const [batches, students] = await Promise.all([api('/api/batches'), api('/api/students')]);
    const bl = Array.isArray(batches)?batches:[];
    const today = new Date().toISOString().split('T')[0];
    $('contentArea').innerHTML = `
        <div class="section-header">
            <div class="section-title"><i class="fas fa-calendar-check"></i> Attendance Management</div>
            <div class="section-actions"><button class="btn btn-outline" onclick="loadAttendanceReport()"><i class="fas fa-chart-bar"></i> Reports</button></div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
            <div class="form-group" style="flex:1;min-width:200px"><label>Select Batch</label><select id="att_batch" onchange="loadBatchStudents()">${bl.map(b=>`<option value="${b.BatchId}">${b.BatchName} (${b.Class})</option>`).join('')}</select></div>
            <div class="form-group" style="flex:1;min-width:200px"><label>Date</label><input type="date" id="att_date" value="${today}" onchange="loadBatchStudents()"></div>
        </div>
        <div id="attendanceList"></div>
        <div style="margin-top:16px"><button class="btn btn-primary" onclick="saveAttendance()"><i class="fas fa-save"></i> Save Attendance</button></div>`;
    loadBatchStudents();
}

async function loadBatchStudents() {
    const batchId = $('att_batch')?.value;
    const date = $('att_date')?.value;
    if (!batchId) return;
    const [students, existing] = await Promise.all([api('/api/students/batch/' + batchId), api('/api/attendance?batchId=' + batchId + '&date=' + date)]);
    const sl = Array.isArray(students)?students:[];
    const ex = Array.isArray(existing)?existing:[];
    const exMap = {};
    ex.forEach(a => exMap[a.StudentId] = a.Status);
    $('attendanceList').innerHTML = sl.length ? `<div class="attendance-grid">${sl.map(s => {
        const st = exMap[s.StudentId] || '';
        return `<div class="attendance-row" data-sid="${s.StudentId}"><span class="student-name">${s.FullName}</span><span style="color:var(--text-muted);font-size:.8rem">${s.Class}</span>
        <div class="attendance-btns">
            <button class="att-btn present ${st==='Present'?'selected':''}" onclick="selectAtt(this,'Present')">Present</button>
            <button class="att-btn absent ${st==='Absent'?'selected':''}" onclick="selectAtt(this,'Absent')">Absent</button>
            <button class="att-btn late ${st==='Late'?'selected':''}" onclick="selectAtt(this,'Late')">Late</button>
        </div></div>`;
    }).join('')}</div>` : '<div class="empty-state"><i class="fas fa-users"></i><h3>No students in this batch</h3></div>';
}

function selectAtt(btn, status) {
    btn.parentElement.querySelectorAll('.att-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

async function saveAttendance() {
    const batchId = $('att_batch').value;
    const date = $('att_date').value;
    const records = [];
    document.querySelectorAll('.attendance-row').forEach(row => {
        const sid = row.dataset.sid;
        const sel = row.querySelector('.att-btn.selected');
        if (sel) records.push({ StudentId: sid, BatchId: batchId, Date: date, Status: sel.textContent, MarkedBy: currentUser.id });
    });
    if (!records.length) { toast('Please mark attendance', 'error'); return; }
    const r = await post('/api/attendance/mark', { records });
    if (r.success) toast(`Attendance saved for ${records.length} students`); else toast('Error saving', 'error');
}

async function loadAttendanceReport() {
    const data = await api('/api/attendance?date=' + new Date().toISOString().split('T')[0]);
    const list = Array.isArray(data)?data:[];
    openModal(`<div class="modal-header"><h2>Today's Attendance Report</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="perf-grid">
        <div class="perf-card"><div class="perf-value" style="color:var(--success)">${list.filter(a=>a.Status==='Present').length}</div><div class="perf-label">Present</div></div>
        <div class="perf-card"><div class="perf-value" style="color:var(--danger)">${list.filter(a=>a.Status==='Absent').length}</div><div class="perf-label">Absent</div></div>
        <div class="perf-card"><div class="perf-value" style="color:var(--warning)">${list.filter(a=>a.Status==='Late').length}</div><div class="perf-label">Late</div></div>
    </div>
    <table style="margin-top:12px"><thead><tr><th>Student</th><th>Class</th><th>Status</th></tr></thead>
    <tbody>${list.map(a=>`<tr><td>${a.FullName}</td><td>${a.Class||'-'}</td><td><span class="status-badge status-${a.Status.toLowerCase()}">${a.Status}</span></td></tr>`).join('')}</tbody></table>`);
}

// ═══ Fees Page ═══
async function loadFees() {
    const [fees, pending] = await Promise.all([api('/api/fees'), api('/api/fees/pending')]);
    const list = Array.isArray(fees)?fees:[];
    const pend = Array.isArray(pending)?pending:[];
    const totalCollected = list.reduce((s,f)=>s+parseFloat(f.PaidAmount||0),0);
    const totalPending = pend.reduce((s,f)=>s+parseFloat(f.TotalFee||0)-parseFloat(f.PaidAmount||0),0);

    var addBtn = currentUser.role==='admin'?'<button class="btn btn-primary" onclick="showFeeForm()"><i class="fas fa-plus"></i> Add Fee</button>':'';
    var verifyBtn = currentUser.role==='admin'?'<button class="btn btn-outline" onclick="showPendingPayments()" id="verifyPaymentsBtn"><i class="fas fa-check-double"></i> Verify Payments</button>':'';

    var rows = list.map(function(f) {
        var remaining = f.TotalFee - f.PaidAmount;
        var statusCls = (f.Status||'').toLowerCase() === 'paid' ? 'active' : (f.Status||'').toLowerCase() === 'partial' ? 'partial' : 'absent';
        var actions = '';
        if (f.Status !== 'Paid' && currentUser.role === 'admin') {
            actions += '<button class="action-btn" title="Collect" onclick="collectFee(' + f.FeeId + ',' + f.TotalFee + ',' + f.PaidAmount + ')"><i class="fas fa-hand-holding-usd"></i></button>';
        }
        if (f.Status !== 'Paid' && currentUser.role === 'student') {
            actions += '<button class="action-btn" title="Pay Now via UPI" onclick="showPayNow(' + f.FeeId + ',' + remaining + ')" style="background:var(--accent)22;color:var(--accent)"><i class="fas fa-qrcode"></i> Pay</button>';
        }
        if (f.Status === 'Paid') {
            actions += '<button class="action-btn" title="Receipt" onclick=\'showReceipt(' + JSON.stringify(f).replace(/'/g,"&#39;") + ')\'><i class="fas fa-receipt"></i></button>';
        }
        return '<tr><td><strong>' + f.FullName + '</strong></td><td>' + (f.Class||'-') + '</td><td>' + f.Month + ' ' + f.Year + '</td><td>' + formatCurrency(f.TotalFee) + '</td><td>' + formatCurrency(f.PaidAmount) + '</td><td>' + formatCurrency(remaining) + '</td><td><span class="status-badge status-' + statusCls + '">' + f.Status + '</span></td><td><div class="action-btns">' + actions + '</div></td></tr>';
    }).join('');

    $('contentArea').innerHTML = '<div class="section-header"><div class="section-title"><i class="fas fa-rupee-sign"></i> Fee Management</div><div class="section-actions">' + addBtn + verifyBtn + '<button class="btn btn-warning" onclick="showPendingFees()"><i class="fas fa-exclamation-triangle"></i> Pending (' + pend.length + ')</button></div></div>' +
        '<div class="stats-grid" style="margin-bottom:20px">' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-check-circle"></i></div><span class="stat-card-label">Collected</span></div><div class="stat-card-value">' + formatCurrency(totalCollected) + '</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-clock"></i></div><span class="stat-card-label">Pending</span></div><div class="stat-card-value">' + formatCurrency(totalPending) + '</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-receipt"></i></div><span class="stat-card-label">Total Records</span></div><div class="stat-card-value">' + list.length + '</div></div></div>' +
        '<div class="data-table-container"><div class="table-toolbar"><div class="table-search"><i class="fas fa-search"></i><input placeholder="Search fees..." oninput="filterTable(this.value,\'feesTable\')"></div></div>' +
        '<div style="overflow-x:auto"><table id="feesTable"><thead><tr><th>Student</th><th>Class</th><th>Month</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Status</th><th>Actions</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div></div>';
}

function showFeeForm() {
    api('/api/students').then(students => {
        const sl = Array.isArray(students)?students:[];
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        openModal(`<div class="modal-header"><h2>Add Fee Record</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
        <form class="modal-form" onsubmit="saveFee(event)">
            <div class="form-group"><label>Student *</label><select id="ff_student" required>${sl.map(s=>`<option value="${s.StudentId}">${s.FullName} (${s.Class})</option>`).join('')}</select></div>
            <div class="form-row"><div class="form-group"><label>Month *</label><select id="ff_month">${months.map(m=>`<option>${m}</option>`).join('')}</select></div><div class="form-group"><label>Year *</label><input type="number" id="ff_year" value="2026"></div></div>
            <div class="form-row"><div class="form-group"><label>Total Fee *</label><input type="number" id="ff_total" required></div><div class="form-group"><label>Paid Amount</label><input type="number" id="ff_paid" value="0"></div></div>
            <div class="form-group"><label>Payment Method</label><select id="ff_method"><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Online</option></select></div>
            <div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div>
        </form>`);
    });
}

async function saveFee(e) {
    e.preventDefault();
    const r = await post('/api/fees', { StudentId:$('ff_student').value, Month:$('ff_month').value, Year:$('ff_year').value, TotalFee:$('ff_total').value, PaidAmount:$('ff_paid').value, PaymentMethod:$('ff_method').value });
    if(r.success){toast('Fee recorded');closeModal();loadFees();}else toast(r.error||'Error','error');
}

async function collectFee(feeId, total, paid) {
    const amt = prompt(`Total: ₹${total}, Paid: ₹${paid}\nEnter amount to collect:`);
    if(amt){const r=await put(`/api/fees/${feeId}`,{PaidAmount:parseFloat(paid)+parseFloat(amt),PaymentMethod:'Cash'});if(r.success){toast('Payment collected');loadFees();}else toast('Error','error');}
}

function showPendingFees() {
    api('/api/fees/pending').then(data => {
        const list = Array.isArray(data)?data:[];
        openModal(`<div class="modal-header"><h2>Pending Fees</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
        <table><thead><tr><th>Student</th><th>Month</th><th>Pending</th><th>Phone</th></tr></thead>
        <tbody>${list.map(f=>`<tr><td>${f.FullName}</td><td>${f.Month} ${f.Year}</td><td style="color:var(--danger);font-weight:700">${formatCurrency(f.TotalFee-f.PaidAmount)}</td><td>${f.ParentPhone||'-'}</td></tr>`).join('')}</tbody></table>`);
    });
}

function showReceipt(f) {
    openModal(`<div class="receipt">
        <div class="receipt-header"><h2>🏫 Mathan Institute of Career Development</h2><p>Fee Receipt</p><p style="font-size:.75rem">Receipt #: ${f.ReceiptNumber||'N/A'}</p></div>
        <div class="receipt-row"><span>Student Name</span><strong>${f.FullName}</strong></div>
        <div class="receipt-row"><span>Class</span><strong>${f.Class}</strong></div>
        <div class="receipt-row"><span>Month/Year</span><strong>${f.Month} ${f.Year}</strong></div>
        <div class="receipt-row"><span>Payment Date</span><strong>${formatDate(f.PaymentDate)}</strong></div>
        <div class="receipt-row"><span>Payment Method</span><strong>${f.PaymentMethod||'-'}</strong></div>
        <div class="receipt-row receipt-total"><span>Amount Paid</span><strong>${formatCurrency(f.PaidAmount)}</strong></div>
        <p style="text-align:center;margin-top:20px;color:#999;font-size:.75rem">This is a computer generated receipt</p>
    </div>
    <div style="text-align:center;margin-top:16px"><button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print</button></div>`);
}

// ═══ UPI Payment - Student ═══
async function showPayNow(feeId, amount) {
    var config = await api('/api/upi/config');
    var upiId = config.upiId || 'your-upi-id@upi';
    var upiName = config.upiName || 'Mathan Institute';
    var qrImage = config.qrImage || '/assets/upi-qr.png';
    var upiLink = 'upi://pay?pa=' + encodeURIComponent(upiId) + '&pn=' + encodeURIComponent(upiName) + '&am=' + amount + '&cu=INR';

    openModal('<div class="modal-header"><h2><i class="fas fa-qrcode"></i> Pay via UPI</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div style="text-align:center;padding:20px">' +
        '<div style="background:white;padding:20px;border-radius:12px;display:inline-block;margin-bottom:16px"><img src="' + qrImage + '" alt="UPI QR Code" style="width:200px;height:200px;display:block" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'block\'"><div style="display:none;width:200px;height:200px;background:#f0f0f0;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#666"><i class="fas fa-qrcode" style="font-size:3rem"></i></div></div>' +
        '<div style="margin-bottom:16px"><div style="font-size:1.2rem;font-weight:700;color:var(--accent)">₹' + amount + '</div><div style="color:var(--text-muted);font-size:.85rem;margin-top:4px">Amount to pay</div></div>' +
        '<div style="background:var(--bg-secondary);padding:12px 16px;border-radius:var(--radius);margin-bottom:16px;border:1px solid var(--border)">' +
        '<div style="font-size:.75rem;color:var(--text-muted);margin-bottom:4px">UPI ID</div>' +
        '<div style="font-weight:700;font-size:1rem;letter-spacing:0.5px">' + upiId + '</div>' +
        '<button onclick="navigator.clipboard.writeText(\'' + upiId + '\');toast(\'UPI ID copied!\');" style="margin-top:8px;background:var(--accent);color:white;border:none;padding:4px 12px;border-radius:var(--radius);cursor:pointer;font-size:.75rem"><i class="fas fa-copy"></i> Copy UPI ID</button></div>' +
        '<a href="' + upiLink + '" style="display:inline-block;background:linear-gradient(135deg,#5f27cd,#6c63ff);color:white;padding:10px 24px;border-radius:var(--radius);font-weight:600;text-decoration:none;margin-bottom:16px"><i class="fas fa-external-link-alt"></i> Open UPI App</a>' +
        '<div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px">' +
        '<p style="color:var(--text-muted);font-size:.8rem;margin-bottom:12px">After payment, enter your UPI Transaction ID below:</p>' +
        '<input id="upi_txn_id" placeholder="e.g. 412345678901" style="width:100%;padding:10px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:1rem;text-align:center;margin-bottom:12px">' +
        '<button onclick="submitUPIPayment(' + feeId + ',' + amount + ')" class="btn btn-primary" style="width:100%"><i class="fas fa-paper-plane"></i> Submit Payment</button>' +
        '</div></div>');
}

async function submitUPIPayment(feeId, amount) {
    var txnId = document.getElementById('upi_txn_id').value.trim();
    if (!txnId) { toast('Please enter Transaction ID', 'error'); return; }
    var r = await post('/api/payments/submit', { StudentId: currentUser.id, FeeId: feeId, Amount: amount, TransactionId: txnId });
    if (r.success) { toast(r.message || 'Payment submitted!'); closeModal(); loadFees(); }
    else toast(r.error || 'Error submitting payment', 'error');
}

// ═══ Admin: Verify UPI Payments ═══
async function showPendingPayments() {
    var payments = await api('/api/payments/pending');
    var list = Array.isArray(payments) ? payments : [];

    var rows = list.map(function(p) {
        return '<tr>' +
            '<td><strong>' + p.FullName + '</strong><br><small style="color:var(--text-muted)">' + (p.Class||'') + '</small></td>' +
            '<td>' + (p.Month||'-') + ' ' + (p.Year||'') + '</td>' +
            '<td style="font-weight:700;color:var(--accent)">' + formatCurrency(p.Amount) + '</td>' +
            '<td><code style="background:var(--bg-secondary);padding:2px 8px;border-radius:4px">' + (p.TransactionId||'-') + '</code></td>' +
            '<td>' + formatDate(p.SubmittedAt) + '</td>' +
            '<td><div style="display:flex;gap:6px">' +
            '<button class="btn btn-primary" style="padding:4px 12px;font-size:.75rem" onclick="approvePayment(' + p.PaymentId + ')"><i class="fas fa-check"></i> Approve</button>' +
            '<button class="btn btn-outline" style="padding:4px 12px;font-size:.75rem;color:var(--danger);border-color:var(--danger)" onclick="rejectPayment(' + p.PaymentId + ')"><i class="fas fa-times"></i> Reject</button>' +
            '</div></td></tr>';
    }).join('');

    var noData = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)"><i class="fas fa-check-circle" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--success)"></i>No pending payments to verify</td></tr>';

    openModal('<div class="modal-header"><h2><i class="fas fa-check-double"></i> Verify UPI Payments</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div style="max-height:60vh;overflow-y:auto"><table><thead><tr><th>Student</th><th>Fee Month</th><th>Amount</th><th>Transaction ID</th><th>Submitted</th><th>Action</th></tr></thead>' +
        '<tbody>' + (rows || noData) + '</tbody></table></div>');
}

async function approvePayment(paymentId) {
    var r = await put('/api/payments/' + paymentId + '/approve');
    if (r.success) { toast('Payment approved & fee updated!'); closeModal(); loadFees(); }
    else toast('Error approving', 'error');
}

async function rejectPayment(paymentId) {
    if (!confirm('Reject this payment?')) return;
    var r = await put('/api/payments/' + paymentId + '/reject');
    if (r.success) { toast('Payment rejected'); closeModal(); loadFees(); }
    else toast('Error rejecting', 'error');
}
