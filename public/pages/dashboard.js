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

    var hour = new Date().getHours();
    var greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    var hero = '<div class="page-hero">' +
        '<div><h1>' + greeting + ', ' + (currentUser.username ? currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1) : 'Administrator') + '</h1>' +
        '<p>Here is what is happening at your institute today.</p></div>' +
        '<div class="hero-actions">' +
            '<button class="btn btn-primary" onclick="showStudentForm()"><i class="fas fa-user-plus" aria-hidden="true"></i> Add Student</button>' +
            '<button class="btn btn-outline" onclick="navigate(\'attendance\')"><i class="fas fa-calendar-check" aria-hidden="true"></i> Mark Attendance</button>' +
            '<button class="btn btn-outline" onclick="showTestForm()"><i class="fas fa-clipboard-list" aria-hidden="true"></i> Create Test</button>' +
        '</div></div>';

    var feeChartHtml = (charts.feeData && charts.feeData.length)
        ? '<div class="chart-wrapper"><canvas id="feeChart"></canvas></div>'
        : '<div class="chart-empty"><i class="fas fa-chart-bar"></i><strong>No fee records yet</strong><span>Add a fee record to see collection trends.</span></div>';
    var classChartHtml = (charts.classDistribution && charts.classDistribution.length)
        ? '<div class="chart-wrapper"><canvas id="classChart"></canvas></div>'
        : '<div class="chart-empty"><i class="fas fa-chart-pie"></i><strong>No students yet</strong><span>Add students to see the class distribution.</span></div>';

    $('contentArea').innerHTML = hero + '<div class="stats-grid stats-6">' +
        '<div class="stat-card" onclick="navigate(\'students\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-user-graduate"></i></div><span class="stat-card-label">Total Students</span></div><div class="stat-card-value">' + (stats.totalStudents||0) + '</div><div class="stat-card-change"><i class="fas fa-arrow-up"></i> Active enrollments</div></div>' +
        '<div class="stat-card" onclick="navigate(\'batches\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-layer-group"></i></div><span class="stat-card-label">Total Batches</span></div><div class="stat-card-value">' + (stats.totalBatches||0) + '</div><div class="stat-card-change"><i class="fas fa-check"></i> All active</div></div>' +
        '<div class="stat-card" onclick="navigate(\'fees\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-rupee-sign"></i></div><span class="stat-card-label">Pending Fees</span></div><div class="stat-card-value">' + formatCurrency(stats.pendingFees) + '</div><div class="stat-card-change' + (+stats.pendingFees > 0 ? ' negative' : '') + '"><i class="fas fa-' + (+stats.pendingFees > 0 ? 'exclamation-triangle' : 'check') + '"></i> ' + (+stats.pendingFees > 0 ? 'Needs attention' : 'All clear') + '</div></div>' +
        '<div class="stat-card" onclick="navigate(\'fees\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-wallet"></i></div><span class="stat-card-label">Monthly Collection</span></div><div class="stat-card-value">' + formatCurrency(stats.monthlyCollection) + '</div><div class="stat-card-change"><i class="fas fa-chart-line"></i> This month</div></div>' +
        '<div class="stat-card" onclick="navigate(\'tests\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-clipboard-list"></i></div><span class="stat-card-label">Upcoming Tests</span></div><div class="stat-card-value">' + (stats.upcomingTests||0) + '</div><div class="stat-card-change"><i class="fas fa-calendar"></i> Scheduled</div></div>' +
        '<div class="stat-card" onclick="navigate(\'attendance\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-calendar-check"></i></div><span class="stat-card-label">Today\'s Attendance</span></div><div class="stat-card-value">' + (stats.attendanceMarked ? (stats.attendancePercentage||0) + '%' : '—') + '</div><div class="stat-card-change ' + (stats.attendanceMarked && stats.attendancePercentage<75?'negative':'') + '"><i class="fas fa-' + (!stats.attendanceMarked ? 'minus' : stats.attendancePercentage>=75?'check':'exclamation-triangle') + '"></i> ' + (!stats.attendanceMarked ? 'Not marked yet' : stats.attendancePercentage>=75?'Good':'Low') + '</div></div>' +
    '</div>' +
    '<div class="charts-grid">' +
        '<div class="chart-card"><h3><i class="fas fa-chart-bar"></i> Fee Collection Overview</h3>' + feeChartHtml + '</div>' +
        '<div class="chart-card"><h3><i class="fas fa-chart-pie"></i> Class Distribution</h3>' + classChartHtml + '</div>' +
    '</div>' +
    '<div class="charts-grid">' +
        '<div class="chart-card"><h3><i class="fas fa-clipboard-list"></i> Upcoming Tests</h3><div class="upcoming-list">' + testsHtml + '</div></div>' +
        '<div class="chart-card"><h3><i class="fas fa-history"></i> Recent Activity</h3><div class="activity-list">' + activityHtml + '</div></div>' +
    '</div>';

    Object.values(chartInstances).forEach(function(c) { c.destroy(); });
    chartInstances = {};

    // ─── Theme-aware chart colours ───
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var cssVar = function(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
    var chartText = cssVar('--text-muted') || '#9898ad';
    var chartTextStrong = cssVar('--text') || '#1a1a2e';
    var chartBorder = cssVar('--bg-card') || '#ffffff';
    var chartGrid = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    var isSmall = window.innerWidth <= 640;
    var chartAccent = cssVar('--accent') || '#9E2A3A';
    var chartInk = cssVar('--text') || '#0B0B0C';
    function toRgba(hex, alpha) {
        hex = String(hex).replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(function(c) { return c + c; }).join('');
        var n = parseInt(hex, 16);
        return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
    }

    // ─── Custom tooltip style ───
    var tooltipStyle = {
        backgroundColor: '#0B0B0C',
        titleColor: '#F4F1EA',
        bodyColor: '#D6D1C7',
        borderColor: toRgba(chartAccent, 0.5),
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
        var accentGrad = feeCtx.createLinearGradient(0, 0, 0, 300);
        accentGrad.addColorStop(0, toRgba(chartAccent, 0.95));
        accentGrad.addColorStop(1, toRgba(chartAccent, 0.35));
        var inkGrad = feeCtx.createLinearGradient(0, 0, 0, 300);
        inkGrad.addColorStop(0, toRgba(chartInk, 0.82));
        inkGrad.addColorStop(1, toRgba(chartInk, 0.22));
        chartInstances.fee = new Chart(feeCtx, {
            type: 'bar',
            data: {
                labels: charts.feeData.map(function(d){return d.Month}),
                datasets: [
                    { label: 'Collected', data: charts.feeData.map(function(d){return Number(d.collected) || 0}), backgroundColor: accentGrad, borderColor: chartAccent, borderWidth: 1, borderRadius: 3, borderSkipped: false, barPercentage: 0.55, categoryPercentage: 0.7 },
                    { label: 'Pending', data: charts.feeData.map(function(d){return Number(d.pending) || 0}), backgroundColor: inkGrad, borderColor: chartInk, borderWidth: 1, borderRadius: 3, borderSkipped: false, barPercentage: 0.55, categoryPercentage: 0.7 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 1200, easing: 'easeOutQuart' },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', align: 'end', labels: { color: chartText, font: { family: 'Inter', weight: '700', size: 11 }, padding: 20, usePointStyle: true, pointStyle: 'rectRounded' } },
                    tooltip: tooltipStyle
                },
                scales: {
                    x: { ticks: { color: chartText, font: { family: 'Inter', weight: '600', size: 11 } }, grid: { display: false }, border: { display: false } },
                    y: { ticks: { color: chartText, font: { family: 'Inter', size: 11 }, callback: function(v){return '\u20B9'+v.toLocaleString('en-IN')} }, grid: { color: chartGrid, drawBorder: false }, border: { display: false } }
                }
            }
        });
    }

    // ─── Class Distribution — Doughnut with Center Text ───
    if (charts.classDistribution && charts.classDistribution.length) {
        var doughColors = isDark ? ['#B8404F','#F4F1EA','#60A5FA','#34D399','#C4B5FD','#F472B6','#22D3EE','#67E8F9','#A3E635','#E08A96','#94A3B8','#D8B4FE'] : ['#9E2A3A','#0B0B0C','#1D4ED8','#0F7A4D','#6D28D9','#BE185D','#0891B2','#0E7490','#4D7C0F','#C25A6A','#334155','#7E22CE'];
        var totalStudents = charts.classDistribution.reduce(function(s,d){return s + (Number(d.count) || 0)},0);
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
                ctx.fillStyle = chartTextStrong;
                ctx.fillText(totalStudents, cX, cY - 8);
                ctx.font = '600 11px Inter';
                ctx.fillStyle = chartText;
                ctx.fillText('STUDENTS', cX, cY + 16);
                ctx.restore();
            }
        };
        chartInstances.cls = new Chart($('classChart'), {
            type: 'doughnut',
            data: {
                labels: charts.classDistribution.map(function(d){return 'Class ' + d.Class + ' (' + (Number(d.count) || 0) + ')';}),
                datasets: [{
                    data: charts.classDistribution.map(function(d){return Number(d.count) || 0}),
                    backgroundColor: doughColors,
                    borderWidth: 3,
                    borderColor: chartBorder,
                    hoverBorderColor: chartBorder,
                    hoverOffset: 8,
                    spacing: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '68%',
                animation: { animateRotate: true, duration: 1400, easing: 'easeOutQuart' },
                plugins: {
                    legend: { position: isSmall ? 'bottom' : 'right', labels: { color: chartText, font: { family: 'Inter', weight: '700', size: isSmall ? 10 : 11 }, padding: isSmall ? 10 : 16, usePointStyle: true, pointStyle: 'circle' } },
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
    }).join('') : '<div class="empty-state" style="padding:24px 12px"><i class="fas fa-clipboard-list" aria-hidden="true"></i><p>No upcoming tests</p></div>';

    var hwCards = data.homework.length ? data.homework.map(function(h) {
        return '<div class="upcoming-item"><div class="upcoming-date" style="background:rgba(0,180,216,0.1);border-color:var(--info)"><span class="day" style="color:var(--info)"><i class="fas fa-book"></i></span></div><div class="upcoming-info"><h4>' + h.Title + '</h4><p>' + (h.Subject||'') + ' &bull; Due: ' + formatDate(h.DueDate) + '</p></div></div>';
    }).join('') : '<div class="empty-state" style="padding:24px 12px"><i class="fas fa-book-open" aria-hidden="true"></i><p>No pending homework</p></div>';

    var iconMap = {attendance:'calendar-check',homework:'book',test:'clipboard-list',notice:'bullhorn',result:'chart-bar',fee:'rupee-sign'};
    var colorMap = {attendance:'#0F7A4D',homework:'#0891B2',test:'#9E2A3A',notice:'#6D28D9',result:'#B8404F',fee:'#BE185D'};
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
    '<div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding:20px;background:var(--accent-bg);border:1.5px solid var(--line);border-radius:var(--radius);box-shadow:var(--hard-sm)">' +
        '<div style="width:60px;height:60px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;color:white">' + (s.FullName||'S').charAt(0) + '</div>' +
        '<div style="flex:1"><h2 style="margin:0;font-size:1.3rem">Welcome, ' + (s.FullName||'Student') + '!</h2>' +
        '<p style="margin:4px 0 0;color:var(--text-muted)">Class ' + (s.Class||'-') + ' &bull; ' + (s.BatchName||'-') + ' &bull; Roll #' + (s.StudentId||'') + '</p></div>' +
        '<div onclick="toggleStudentNotifs()" style="cursor:pointer;position:relative;padding:10px 14px;border-radius:var(--radius);background:var(--card-bg);border:1px solid var(--border)">' +
            '<i class="fas fa-bell" style="font-size:1.2rem;color:var(--accent)"></i>' +
            (unread > 0 ? '<span style="position:absolute;top:2px;right:4px;background:var(--danger);color:white;font-size:0.65rem;padding:1px 5px;border-radius:10px;font-weight:700">' + unread + '</span>' : '') +
        '</div>' +
    '</div>' +
    '<div id="studentNotifsPanel" style="display:none;margin-bottom:24px;border-radius:var(--radius);border:1.5px solid var(--line);background:var(--card-bg);overflow:hidden;box-shadow:var(--hard-sm)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);background:var(--accent-bg)">' +
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
    await put('/api/notifications/' + currentUser.id + '/readall', {});
    showToast('All notifications marked as read', 'success');
    loadStudentDashboard();
    loadNotifications();
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
