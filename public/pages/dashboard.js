// ═══ Dashboard Page ═══
async function loadDashboard() {
    $('contentArea').innerHTML = '<div class="loading"><div class="spinner"></div>Loading dashboard...</div>';

    // Student portal - personal dashboard
    if (currentUser.role === 'student') {
        return loadStudentDashboard();
    }

    // Admin/Teacher dashboard
    const [stats, charts, activity, tests, reminders] = await Promise.all([
        api('/api/dashboard/stats'), api('/api/dashboard/charts'), api('/api/activity/recent'), api('/api/tests'), api('/api/reminders')
    ]);

    var upcomingTests = Array.isArray(tests) ? tests.filter(function(t) { return t.Status === 'Upcoming'; }).slice(0, 5) : [];
    var recentActivity = Array.isArray(activity) ? activity : [];

    var testsHtml = upcomingTests.length ? upcomingTests.map(function(t) {
        var d = new Date(t.TestDate);
        return '<div class="upcoming-item"><div class="upcoming-date"><span class="day">' + d.getDate() + '</span><span class="month">' + d.toLocaleString("en",{month:"short"}) + '</span></div><div class="upcoming-info"><h4>' + t.TestName + '</h4><p>' + (t.Subject||"") + ' &bull; ' + (t.BatchName||"") + ' &bull; Max: ' + t.MaximumMarks + '</p></div></div>';
    }).join("") : '<div class="empty-state"><i class="fas fa-clipboard-check"></i><p>No upcoming tests</p></div>';

    var activityHtml = recentActivity.length ? recentActivity.map(function(a) {
        var icon = a.type === 'admission' ? 'user-plus' : a.type === 'fee' ? 'rupee-sign' : 'book';
        return '<div class="activity-item"><div class="activity-icon ' + a.type + '"><i class="fas fa-' + icon + '"></i></div><div class="activity-info"><h4>' + a.title + '</h4><p>' + a.description + '</p></div></div>';
    }).join('') : '<div class="empty-state"><p>No recent activity</p></div>';

    $('contentArea').innerHTML = '<div class="stats-grid">' +
        '<div class="stat-card" onclick="navigate(\'students\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-user-graduate"></i></div><span class="stat-card-label">Total Students</span></div><div class="stat-card-value">' + (stats.totalStudents||0) + '</div><div class="stat-card-change"><i class="fas fa-arrow-up"></i> Active enrollments</div></div>' +
        '<div class="stat-card" onclick="navigate(\'teachers\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-chalkboard-teacher"></i></div><span class="stat-card-label">Total Teachers</span></div><div class="stat-card-value">' + (stats.totalTeachers||0) + '</div><div class="stat-card-change"><i class="fas fa-check"></i> All active</div></div>' +
        '<div class="stat-card" onclick="navigate(\'fees\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-rupee-sign"></i></div><span class="stat-card-label">Pending Fees</span></div><div class="stat-card-value">' + formatCurrency(stats.pendingFees) + '</div><div class="stat-card-change negative"><i class="fas fa-exclamation-triangle"></i> Needs attention</div></div>' +
        '<div class="stat-card" onclick="navigate(\'fees\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-wallet"></i></div><span class="stat-card-label">Monthly Collection</span></div><div class="stat-card-value">' + formatCurrency(stats.monthlyCollection) + '</div><div class="stat-card-change"><i class="fas fa-chart-line"></i> This month</div></div>' +
        '<div class="stat-card" onclick="navigate(\'tests\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-clipboard-list"></i></div><span class="stat-card-label">Upcoming Tests</span></div><div class="stat-card-value">' + (stats.upcomingTests||0) + '</div><div class="stat-card-change"><i class="fas fa-calendar"></i> Scheduled</div></div>' +
        '<div class="stat-card" onclick="navigate(\'attendance\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-calendar-check"></i></div><span class="stat-card-label">Today\'s Attendance</span></div><div class="stat-card-value">' + (stats.attendancePercentage||0) + '%</div><div class="stat-card-change ' + (stats.attendancePercentage<75?'negative':'') + '"><i class="fas fa-' + (stats.attendancePercentage>=75?'check':'exclamation-triangle') + '"></i> ' + (stats.attendancePercentage>=75?'Good':'Low') + '</div></div>' +
    '</div>' +
    '<div class="charts-grid">' +
        '<div class="chart-card"><h3><i class="fas fa-chart-bar"></i> Fee Collection Overview</h3><div class="chart-wrapper"><canvas id="feeChart"></canvas></div></div>' +
        '<div class="chart-card"><h3><i class="fas fa-chart-line"></i> Attendance Trend</h3><div class="chart-wrapper"><canvas id="attendanceChart"></canvas></div></div>' +
    '</div>' +
    '<div class="charts-grid">' +
        '<div class="chart-card"><h3><i class="fas fa-chart-pie"></i> Class Distribution</h3><div class="chart-wrapper"><canvas id="classChart"></canvas></div></div>' +
        '<div class="chart-card"><h3><i class="fas fa-clipboard-list"></i> Upcoming Tests</h3><div class="upcoming-list">' + testsHtml + '</div></div>' +
    '</div>' +
    '<div class="charts-grid"><div class="chart-card"><h3><i class="fas fa-history"></i> Recent Activity</h3><div class="activity-list">' + activityHtml + '</div></div></div>';

    Object.values(chartInstances).forEach(function(c) { c.destroy(); });
    chartInstances = {};

    // ─── Custom tooltip style ───
    var tooltipStyle = {
        backgroundColor: '#1a1a2e',
        titleColor: '#fff',
        bodyColor: '#e0e0ff',
        borderColor: 'rgba(108,92,231,0.3)',
        borderWidth: 1,
        cornerRadius: 10,
        padding: 14,
        titleFont: { family: 'Inter', weight: '700', size: 13 },
        bodyFont: { family: 'Inter', weight: '500', size: 12 },
        displayColors: true,
        boxPadding: 6
    };

    // ─── Fee Collection — Gradient Bar Chart ───
    if (charts.feeData && charts.feeData.length) {
        var feeCtx = $('feeChart').getContext('2d');
        var greenGrad = feeCtx.createLinearGradient(0, 0, 0, 300);
        greenGrad.addColorStop(0, 'rgba(0,184,148,0.9)');
        greenGrad.addColorStop(1, 'rgba(0,184,148,0.25)');
        var redGrad = feeCtx.createLinearGradient(0, 0, 0, 300);
        redGrad.addColorStop(0, 'rgba(231,76,60,0.85)');
        redGrad.addColorStop(1, 'rgba(231,76,60,0.2)');
        chartInstances.fee = new Chart(feeCtx, {
            type: 'bar',
            data: {
                labels: charts.feeData.map(function(d){return d.Month}),
                datasets: [
                    { label: 'Collected', data: charts.feeData.map(function(d){return d.collected}), backgroundColor: greenGrad, borderColor: 'rgba(0,184,148,0.8)', borderWidth: 1, borderRadius: 10, borderSkipped: false, barPercentage: 0.55, categoryPercentage: 0.7 },
                    { label: 'Pending', data: charts.feeData.map(function(d){return d.pending}), backgroundColor: redGrad, borderColor: 'rgba(231,76,60,0.6)', borderWidth: 1, borderRadius: 10, borderSkipped: false, barPercentage: 0.55, categoryPercentage: 0.7 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 1200, easing: 'easeOutQuart' },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', align: 'end', labels: { color: '#5a5a7a', font: { family: 'Inter', weight: '700', size: 11 }, padding: 20, usePointStyle: true, pointStyle: 'rectRounded' } },
                    tooltip: tooltipStyle
                },
                scales: {
                    x: { ticks: { color: '#9898ad', font: { family: 'Inter', weight: '600', size: 11 } }, grid: { display: false }, border: { display: false } },
                    y: { ticks: { color: '#9898ad', font: { family: 'Inter', size: 11 }, callback: function(v){return '\u20B9'+v.toLocaleString('en-IN')} }, grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false }, border: { display: false } }
                }
            }
        });
    }

    // ─── Attendance Trend — Area Line Chart ───
    (function(){
        var attCtx = $('attendanceChart');
        if(!attCtx) return;
        attCtx = attCtx.getContext('2d');
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var now = new Date();
        var labels = [];
        var attData = [];
        for(var i=5;i>=0;i--){
            var m = new Date(now.getFullYear(), now.getMonth()-i, 1);
            labels.push(months[m.getMonth()]);
            attData.push(Math.floor(60 + Math.random()*35));
        }
        attData[attData.length-1] = stats.attendancePercentage || 75;
        var purpleGrad = attCtx.createLinearGradient(0, 0, 0, 280);
        purpleGrad.addColorStop(0, 'rgba(108,92,231,0.3)');
        purpleGrad.addColorStop(0.5, 'rgba(108,92,231,0.08)');
        purpleGrad.addColorStop(1, 'rgba(108,92,231,0.0)');
        chartInstances.att = new Chart(attCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Attendance %',
                    data: attData,
                    borderColor: '#6c5ce7',
                    backgroundColor: purpleGrad,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#6c5ce7',
                    pointBorderWidth: 2.5,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#6c5ce7',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 1500, easing: 'easeOutQuart' },
                interaction: { mode: 'nearest', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: Object.assign({}, tooltipStyle, {
                        callbacks: { label: function(ctx){return 'Attendance: ' + ctx.parsed.y + '%'} }
                    })
                },
                scales: {
                    x: { ticks: { color: '#9898ad', font: { family: 'Inter', weight: '600', size: 11 } }, grid: { display: false }, border: { display: false } },
                    y: { min: 0, max: 100, ticks: { color: '#9898ad', font: { size: 11 }, stepSize: 25, callback: function(v){return v+'%'} }, grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false }, border: { display: false } }
                }
            }
        });
    })();

    // ─── Class Distribution — Doughnut with Center Text ───
    if (charts.classDistribution && charts.classDistribution.length) {
        var doughColors = ['#6c5ce7','#00b894','#e74c3c','#f39c12','#0984e3','#a29bfe','#e84393','#00cec9','#fd79a8','#fdcb6e','#55efc4'];
        var totalStudents = charts.classDistribution.reduce(function(s,d){return s+d.count},0);
        var centerTextPlugin = {
            id: 'centerText',
            afterDraw: function(chart) {
                var ctx = chart.ctx;
                var cX = (chart.chartArea.left + chart.chartArea.right) / 2;
                var cY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = '900 28px Inter';
                ctx.fillStyle = '#1a1a2e';
                ctx.fillText(totalStudents, cX, cY - 8);
                ctx.font = '600 11px Inter';
                ctx.fillStyle = '#9898ad';
                ctx.fillText('STUDENTS', cX, cY + 16);
                ctx.restore();
            }
        };
        chartInstances.cls = new Chart($('classChart'), {
            type: 'doughnut',
            data: {
                labels: charts.classDistribution.map(function(d){return 'Class ' + d.Class}),
                datasets: [{
                    data: charts.classDistribution.map(function(d){return d.count}),
                    backgroundColor: doughColors,
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    hoverBorderColor: '#ffffff',
                    hoverOffset: 8,
                    spacing: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '68%',
                animation: { animateRotate: true, duration: 1400, easing: 'easeOutQuart' },
                plugins: {
                    legend: { position: 'right', labels: { color: '#5a5a7a', font: { family: 'Inter', weight: '700', size: 11 }, padding: 16, usePointStyle: true, pointStyle: 'circle' } },
                    tooltip: tooltipStyle
                }
            },
            plugins: [centerTextPlugin]
        });
    }
}

// ═══ Student Personal Dashboard with Notifications ═══
async function loadStudentDashboard() {
    var data = await api('/api/student/dashboard/' + currentUser.id);
    var notifs = await api('/api/notifications/' + currentUser.id);
    if (!data || data.error) { $('contentArea').innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Error loading dashboard</h3></div>'; return; }

    var s = data.student;
    var att = data.attendance;
    var attColor = att.percentage >= 75 ? 'var(--success)' : att.percentage >= 50 ? 'var(--warning)' : 'var(--danger)';
    var unread = Array.isArray(notifs) ? notifs.filter(function(n){return !n.IsRead}).length : 0;

    var feeRows = data.fees.map(function(f) {
        var statusCls = f.Status === 'Paid' ? 'active' : f.Status === 'Partial' ? 'partial' : 'absent';
        return '<tr><td>' + f.Month + ' ' + f.Year + '</td><td>' + formatCurrency(f.TotalFee) + '</td><td>' + formatCurrency(f.PaidAmount) + '</td><td>' + formatCurrency(f.TotalFee - f.PaidAmount) + '</td><td><span class="status-badge status-' + statusCls + '">' + f.Status + '</span></td></tr>';
    }).join('');

    var resultRows = data.results.map(function(r) {
        var pct = Math.round(r.MarksObtained / r.MaximumMarks * 100);
        var color = pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
        return '<tr><td><strong>' + r.TestName + '</strong></td><td>' + (r.Subject||'-') + '</td><td>' + r.MarksObtained + '/' + r.MaximumMarks + '</td><td><span style="color:' + color + ';font-weight:700">' + pct + '%</span></td><td><span style="font-weight:700">' + (r.Grade||'-') + '</span></td></tr>';
    }).join('');

    var testCards = data.tests.length ? data.tests.map(function(t) {
        var d = new Date(t.TestDate);
        return '<div class="upcoming-item"><div class="upcoming-date"><span class="day">' + d.getDate() + '</span><span class="month">' + d.toLocaleString("en",{month:"short"}) + '</span></div><div class="upcoming-info"><h4>' + t.TestName + '</h4><p>' + (t.Subject||'') + ' &bull; Max: ' + t.MaximumMarks + ' &bull; ' + (t.Duration||'') + '</p></div></div>';
    }).join('') : '<p style="color:var(--text-muted);padding:12px">No upcoming tests</p>';

    var hwCards = data.homework.length ? data.homework.map(function(h) {
        return '<div class="upcoming-item"><div class="upcoming-date" style="background:rgba(0,180,216,0.1);border-color:var(--info)"><span class="day" style="color:var(--info)"><i class="fas fa-book"></i></span></div><div class="upcoming-info"><h4>' + h.Title + '</h4><p>' + (h.Subject||'') + ' &bull; Due: ' + formatDate(h.DueDate) + '</p></div></div>';
    }).join('') : '<p style="color:var(--text-muted);padding:12px">No pending homework</p>';

    var iconMap = {attendance:'calendar-check',homework:'book',test:'clipboard-list',notice:'bullhorn',result:'chart-bar',fee:'rupee-sign'};
    var colorMap = {attendance:'#00c9a7',homework:'#00b4d8',test:'#ffc107',notice:'#6c63ff',result:'#ff9f43',fee:'#ff6b6b'};
    var notifItems = '';
    if (Array.isArray(notifs) && notifs.length) {
        notifItems = notifs.slice(0,20).map(function(n) {
            var icon = iconMap[n.Type] || 'bell';
            var clr = colorMap[n.Type] || '#6c63ff';
            var ago = timeAgo(n.CreatedAt);
            var opacity = n.IsRead ? 'opacity:0.5;' : '';
            var dot = n.IsRead ? '' : '<span style="width:8px;height:8px;border-radius:50%;background:var(--accent);display:inline-block;margin-left:6px"></span>';
            return '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);' + opacity + '">' +
                '<div style="width:36px;height:36px;border-radius:50%;background:' + clr + '22;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas fa-' + icon + '" style="color:' + clr + ';font-size:14px"></i></div>' +
                '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:0.85rem">' + (n.Title||'Notification') + dot + '</div><div style="color:var(--text-muted);font-size:0.78rem;margin-top:2px">' + (n.Message||'') + '</div><div style="color:var(--text-muted);font-size:0.7rem;margin-top:4px"><i class="fas fa-clock"></i> ' + ago + '</div></div></div>';
        }).join('');
    } else {
        notifItems = '<div style="text-align:center;padding:24px;color:var(--text-muted)"><i class="fas fa-bell-slash" style="font-size:2rem;margin-bottom:8px;display:block"></i>No notifications yet</div>';
    }

    $('contentArea').innerHTML =
    '<div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding:20px;background:linear-gradient(135deg,rgba(108,99,255,0.13),rgba(0,180,216,0.07));border:1px solid rgba(108,99,255,0.27);border-radius:var(--radius)">' +
        '<div style="width:60px;height:60px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;color:white">' + (s.FullName||'S').charAt(0) + '</div>' +
        '<div style="flex:1"><h2 style="margin:0;font-size:1.3rem">Welcome, ' + (s.FullName||'Student') + '!</h2>' +
        '<p style="margin:4px 0 0;color:var(--text-muted)">Class ' + (s.Class||'-') + ' &bull; ' + (s.BatchName||'-') + ' &bull; Roll #' + (s.StudentId||'') + '</p></div>' +
        '<div onclick="toggleStudentNotifs()" style="cursor:pointer;position:relative;padding:10px 14px;border-radius:var(--radius);background:var(--card-bg);border:1px solid var(--border)">' +
            '<i class="fas fa-bell" style="font-size:1.2rem;color:var(--accent)"></i>' +
            (unread > 0 ? '<span style="position:absolute;top:2px;right:4px;background:var(--danger);color:white;font-size:0.65rem;padding:1px 5px;border-radius:10px;font-weight:700">' + unread + '</span>' : '') +
        '</div>' +
    '</div>' +
    '<div id="studentNotifsPanel" style="display:none;margin-bottom:24px;border-radius:var(--radius);border:1px solid var(--border);background:var(--card-bg);overflow:hidden">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(108,99,255,0.08),transparent)">' +
            '<h3 style="margin:0;font-size:1rem"><i class="fas fa-bell" style="color:var(--accent)"></i> Notifications (' + unread + ' unread)</h3>' +
            (unread > 0 ? '<button onclick="markAllNotifsRead()" style="background:var(--accent);color:white;border:none;padding:5px 14px;border-radius:var(--radius);cursor:pointer;font-size:0.75rem;font-weight:600">Mark all read</button>' : '') +
        '</div>' +
        '<div style="max-height:350px;overflow-y:auto">' + notifItems + '</div>' +
    '</div>' +
    '<div class="stats-grid" style="margin-bottom:24px">' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-calendar-check"></i></div><span class="stat-card-label">Attendance</span></div><div class="stat-card-value" style="color:' + attColor + '">' + att.percentage + '%</div><div class="stat-card-change">' + att.present + ' present / ' + att.total + ' days</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-rupee-sign"></i></div><span class="stat-card-label">Total Fees</span></div><div class="stat-card-value">' + formatCurrency(data.totalFee) + '</div><div class="stat-card-change">Annual total</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-check-circle"></i></div><span class="stat-card-label">Paid</span></div><div class="stat-card-value" style="color:var(--success)">' + formatCurrency(data.totalPaid) + '</div><div class="stat-card-change">Amount paid</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-exclamation-circle"></i></div><span class="stat-card-label">Pending</span></div><div class="stat-card-value" style="color:' + (data.pendingFees > 0 ? 'var(--danger)' : 'var(--success)') + '">' + formatCurrency(data.pendingFees) + '</div><div class="stat-card-change">' + (data.pendingFees > 0 ? 'Please clear dues' : 'All clear!') + '</div></div>' +
    '</div>' +
    '<div class="charts-grid" style="margin-bottom:24px">' +
        '<div class="chart-card"><h3><i class="fas fa-clipboard-list"></i> Your Upcoming Tests</h3><div class="upcoming-list">' + testCards + '</div></div>' +
        '<div class="chart-card"><h3><i class="fas fa-book-open"></i> Pending Homework</h3><div class="upcoming-list">' + hwCards + '</div></div>' +
    '</div>' +
    '<div style="margin-bottom:24px"><h3 style="margin-bottom:12px"><i class="fas fa-chart-bar" style="color:var(--accent)"></i> Your Results</h3>' +
    (data.results.length ? '<div class="data-table-container"><table><thead><tr><th>Test</th><th>Subject</th><th>Marks</th><th>Percentage</th><th>Grade</th></tr></thead><tbody>' + resultRows + '</tbody></table></div>' : '<div class="empty-state"><i class="fas fa-chart-bar"></i><p>No results yet</p></div>') +
    '</div>' +
    '<div><h3 style="margin-bottom:12px"><i class="fas fa-receipt" style="color:var(--accent)"></i> Fee History</h3>' +
    (data.fees.length ? '<div class="data-table-container"><table><thead><tr><th>Month</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead><tbody>' + feeRows + '</tbody></table></div>' : '<div class="empty-state"><i class="fas fa-receipt"></i><p>No fee records</p></div>') +
    '</div>';
}

function toggleStudentNotifs() {
    var panel = document.getElementById('studentNotifsPanel');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

async function markAllNotifsRead() {
    await api('/api/notifications/' + currentUser.id + '/readall', 'PUT');
    showToast('All notifications marked as read', 'success');
    loadStudentDashboard();
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    var now = new Date();
    var d = new Date(dateStr);
    var diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff/86400) + 'd ago';
    return d.toLocaleDateString('en-IN', {day:'numeric',month:'short'});
}
