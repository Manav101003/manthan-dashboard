// ═══ Mathan Institute - Core App ═══
const API = '';
let currentUser = null;
let currentPage = 'dashboard';
let chartInstances = {};

// ─── CUSTOM CURSOR ───
(function(){
  if(window.matchMedia('(max-width:768px)').matches || 'ontouchstart' in window) return;
  var dot = document.createElement('div'); dot.className='cursor-dot';
  var ring = document.createElement('div'); ring.className='cursor-ring';
  document.body.appendChild(dot); document.body.appendChild(ring);
  var mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px';});
  function animateRing(){rx+=(mx-rx)*0.15;ry+=(my-ry)*0.15;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(animateRing);}
  animateRing();
  document.addEventListener('mousedown',function(){dot.classList.add('clicking');ring.classList.add('clicking');});
  document.addEventListener('mouseup',function(){dot.classList.remove('clicking');ring.classList.remove('clicking');});
  document.addEventListener('mouseover',function(e){
    var t=e.target;
    if(t.matches('a,button,.btn,.nav-item,.stat-card,.action-btn,.att-btn,.role-btn,.quick-action,.upcoming-item,.notification-bell,.sidebar-toggle,.logout-btn,.filter-select,select,label[for]')||t.closest('a,button,.btn,.nav-item,.stat-card,.action-btn,.att-btn,.role-btn,.quick-action')){
      dot.classList.add('hover');ring.classList.add('hover');
    }
  });
  document.addEventListener('mouseout',function(e){
    var t=e.target;
    if(t.matches('a,button,.btn,.nav-item,.stat-card,.action-btn,.att-btn,.role-btn,.quick-action,.upcoming-item,.notification-bell,.sidebar-toggle,.logout-btn,.filter-select,select,label[for]')||t.closest('a,button,.btn,.nav-item,.stat-card,.action-btn,.att-btn,.role-btn,.quick-action')){
      dot.classList.remove('hover');ring.classList.remove('hover');
    }
  });
  // Button ripple
  document.addEventListener('click',function(e){
    var btn=e.target.closest('.btn,.btn-primary,.login-btn');
    if(!btn) return;
    var r=document.createElement('span');r.className='btn-ripple';
    var rect=btn.getBoundingClientRect();
    var sz=Math.max(rect.width,rect.height)*2;
    r.style.width=sz+'px';r.style.height=sz+'px';
    r.style.left=(e.clientX-rect.left-sz/2)+'px';
    r.style.top=(e.clientY-rect.top-sz/2)+'px';
    btn.appendChild(r);
    setTimeout(function(){r.remove();},700);
  });
})();

// ─── UTILITY ───
const $ = id => document.getElementById(id);
const api = async (url, opts) => { try { const r = await fetch(API + url, { headers: { 'Content-Type': 'application/json' }, ...opts }); return r.json(); } catch (e) { return { error: e.message }; } };
const post = (url, data) => api(url, { method: 'POST', body: JSON.stringify(data) });
const put = (url, data) => api(url, { method: 'PUT', body: JSON.stringify(data) });
const del = url => api(url, { method: 'DELETE' });

function toast(msg, type) {
    type = type || 'success';
    var t = document.createElement('div');
    t.className = 'toast toast-' + type;
    var icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    t.innerHTML = '<i class="fas fa-' + icon + '"></i> ' + msg;
    $('toastContainer').appendChild(t);
    setTimeout(function() { t.remove(); }, 3500);
}
function showToast(msg, type) { toast(msg, type); }

function closeModal() { $('modal').classList.add('hidden'); }
function openModal(html) { $('modalContent').innerHTML = html; $('modal').classList.remove('hidden'); }

function formatDate(d) { if (!d) return '-'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function formatCurrency(n) { return '\u20B9' + Number(n || 0).toLocaleString('en-IN'); }

// ─── INIT ───
document.addEventListener('DOMContentLoaded', function() {
    $('currentDate').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Restore session from localStorage
    var saved = localStorage.getItem('manthan_user');
    if (saved) {
        try { currentUser = JSON.parse(saved); $('loginScreen').classList.add('hidden'); $('mainApp').classList.remove('hidden'); initApp(); } catch(e) { localStorage.removeItem('manthan_user'); }
    }

    $('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        var r = await post('/api/login', { username: $('loginUsername').value, password: $('loginPassword').value, role: $('loginRole').value });
        if (r.success) { currentUser = r.user; localStorage.setItem('manthan_user', JSON.stringify(r.user)); $('loginScreen').classList.add('hidden'); $('mainApp').classList.remove('hidden'); initApp(); }
        else $('loginError').textContent = r.message || 'Login failed';
    });

    document.querySelectorAll('.role-btn').forEach(function(b) {
        b.addEventListener('click', function() {
            document.querySelectorAll('.role-btn').forEach(function(x) { x.classList.remove('active'); });
            b.classList.add('active');
            $('loginRole').value = b.dataset.role;
        });
    });

    $('sidebarToggle').addEventListener('click', function() { $('sidebar').classList.toggle('collapsed'); });
    $('mobileMenuBtn').addEventListener('click', function() { $('sidebar').classList.toggle('mobile-open'); });
    $('logoutBtn').addEventListener('click', function() { currentUser = null; localStorage.removeItem('manthan_user'); if (socket) socket.disconnect(); $('mainApp').classList.add('hidden'); $('loginScreen').classList.remove('hidden'); });
    $('notificationBell').addEventListener('click', function() { $('notifPanel').classList.toggle('hidden'); });
});

function initApp() {
    $('userName').textContent = currentUser.username;
    $('userRole').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    buildSidebar();
    navigate('dashboard');
    loadReminders();
    initSocket();
}

// ─── REAL-TIME (Socket.IO) ───
var socket = null;
function initSocket() {
    if (socket) socket.disconnect();
    socket = io();
    socket.emit('register', { role: currentUser.role, id: currentUser.id });

    socket.on('attendance_updated', function() { if (currentPage === 'attendance' || currentPage === 'dashboard') navigate(currentPage); });
    socket.on('homework_updated', function() { if (currentPage === 'homework' || currentPage === 'dashboard') navigate(currentPage); });
    socket.on('test_updated', function() { if (currentPage === 'tests' || currentPage === 'dashboard') navigate(currentPage); });
    socket.on('results_updated', function() { if (currentPage === 'results' || currentPage === 'dashboard') navigate(currentPage); });
    socket.on('notice_updated', function() { if (currentPage === 'notices' || currentPage === 'dashboard') navigate(currentPage); });
    socket.on('fee_updated', function() { if (currentPage === 'fees' || currentPage === 'dashboard') navigate(currentPage); });

    socket.on('notification', function(data) {
        if (currentUser.role === 'student') {
            toast('New update! Check your notifications.', 'info');
            if (currentPage === 'dashboard') navigate('dashboard');
        }
    });
}

// ─── SIDEBAR ───
function buildSidebar() {
    var adminNav = [
        { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
        { id: 'students', icon: 'fa-user-graduate', label: 'Students' },
        { id: 'teachers', icon: 'fa-chalkboard-teacher', label: 'Teachers' },
        { id: 'batches', icon: 'fa-layer-group', label: 'Batches' },
        { id: 'attendance', icon: 'fa-calendar-check', label: 'Attendance' },
        { id: 'fees', icon: 'fa-rupee-sign', label: 'Fees' },
        { id: 'homework', icon: 'fa-book-open', label: 'Homework' },
        { id: 'tests', icon: 'fa-clipboard-list', label: 'Tests' },
        { id: 'results', icon: 'fa-chart-bar', label: 'Results' },
        { id: 'notices', icon: 'fa-bullhorn', label: 'Notices' },
        { id: 'timetable', icon: 'fa-clock', label: 'Timetable' },
        { id: 'reports', icon: 'fa-file-alt', label: 'Reports' },
        { id: 'settings', icon: 'fa-cog', label: 'Settings' }
    ];
    var teacherNav = [
        { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
        { id: 'attendance', icon: 'fa-calendar-check', label: 'Mark Attendance' },
        { id: 'homework', icon: 'fa-book-open', label: 'Homework' },
        { id: 'tests', icon: 'fa-clipboard-list', label: 'Tests' },
        { id: 'results', icon: 'fa-chart-bar', label: 'Results' },
        { id: 'notices', icon: 'fa-bullhorn', label: 'Notices' },
        { id: 'batches', icon: 'fa-layer-group', label: 'My Batches' }
    ];
    var studentNav = [
        { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
        { id: 'attendance', icon: 'fa-calendar-check', label: 'My Attendance' },
        { id: 'homework', icon: 'fa-book-open', label: 'Homework' },
        { id: 'tests', icon: 'fa-clipboard-list', label: 'Tests' },
        { id: 'results', icon: 'fa-chart-bar', label: 'My Results' },
        { id: 'fees', icon: 'fa-rupee-sign', label: 'Fee Status' },
        { id: 'notices', icon: 'fa-bullhorn', label: 'Notices' },
        { id: 'timetable', icon: 'fa-clock', label: 'Timetable' }
    ];

    var nav = currentUser.role === 'admin' ? adminNav : currentUser.role === 'teacher' ? teacherNav : studentNav;
    $('sidebarNav').innerHTML = nav.map(function(n) { return '<div class="nav-item ' + (n.id === 'dashboard' ? 'active' : '') + '" onclick="navigate(\'' + n.id + '\')" data-page="' + n.id + '"><i class="fas ' + n.icon + '"></i><span>' + n.label + '</span></div>'; }).join('');
}

function navigate(page) {
    currentPage = page;
    $('pageTitle').textContent = page.charAt(0).toUpperCase() + page.slice(1);
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.toggle('active', n.dataset.page === page); });
    $('sidebar').classList.remove('mobile-open');

    var loaders = { dashboard: loadDashboard, students: loadStudents, teachers: loadTeachers, batches: loadBatches, attendance: loadAttendance, fees: loadFees, homework: loadHomework, tests: loadTests, results: loadResults, notices: loadNotices, timetable: loadTimetable, reports: loadReports, settings: loadSettings };
    if (loaders[page]) loaders[page]();
}

async function loadReminders() {
    var data = await api('/api/reminders');
    if (Array.isArray(data)) {
        $('notifBadge').textContent = data.length;
        $('notifList').innerHTML = data.length ? data.map(function(r) { return '<div class="notif-item ' + r.Type + '" onclick="markRead(' + r.ReminderId + ')"><h4>' + r.Title + '</h4><p>' + (r.Description || '') + '</p><p>' + formatDate(r.TargetDate) + '</p></div>'; }).join('') : '<div class="empty-state"><p>No notifications</p></div>';
    }
}

async function markRead(id) { await put('/api/reminders/' + id + '/read'); loadReminders(); }


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


// ═══ Students Page ═══
async function loadStudents() {
    var students = await api('/api/students');
    var list = Array.isArray(students) ? students : [];

    var rows = list.map(function(s, i) {
        var actionBtns = '<button class="action-btn" title="View" onclick="viewStudent(' + s.StudentId + ')"><i class="fas fa-eye"></i></button>';
        if (currentUser.role === 'admin') {
            actionBtns += '<button class="action-btn" title="Edit" onclick="editStudentById(' + s.StudentId + ')"><i class="fas fa-edit"></i></button>';
            actionBtns += '<button class="action-btn delete" title="Delete" onclick="deleteStudent(' + s.StudentId + ')"><i class="fas fa-trash"></i></button>';
        }
        return '<tr data-class="' + (s.Class||'') + '" data-status="' + (s.Status||'') + '"><td>' + (i+1) + '</td><td><strong>' + s.FullName + '</strong><br><small style="color:var(--text-muted)">' + (s.FatherName||'') + '</small></td><td>' + (s.Class||'-') + '</td><td>' + (s.BatchName||'-') + '</td><td>' + (s.StudentPhone||'-') + '</td><td>' + (s.ParentPhone||'-') + '</td><td><span class="status-badge status-' + (s.Status||'').toLowerCase() + '">' + (s.Status||'-') + '</span></td><td><div class="action-btns">' + actionBtns + '</div></td></tr>';
    }).join('');

    var classOpts = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th'].map(function(c) { return '<option>' + c + '</option>'; }).join('');
    var addBtn = currentUser.role === 'admin' ? '<button class="btn btn-primary" onclick="showStudentForm()"><i class="fas fa-plus"></i> Add Student</button>' : '';

    $('contentArea').innerHTML = '<div class="section-header"><div class="section-title"><i class="fas fa-user-graduate"></i> Students Management</div><div class="section-actions">' + addBtn + '<button class="btn btn-outline" onclick="exportData(\'students\')"><i class="fas fa-download"></i> Export</button></div></div>' +
        '<div class="data-table-container"><div class="table-toolbar"><div class="table-search"><i class="fas fa-search"></i><input type="text" placeholder="Search students..." oninput="filterTable(this.value,\'studentsTable\')"></div><div class="table-filters"><select class="filter-select" onchange="filterByClass(this.value)"><option value="">All Classes</option>' + classOpts + '</select><select class="filter-select" onchange="filterByStatus(this.value)"><option value="">All Status</option><option>Active</option><option>Inactive</option></select></div></div>' +
        '<div style="overflow-x:auto"><table id="studentsTable"><thead><tr><th>#</th><th>Name</th><th>Class</th><th>Batch</th><th>Phone</th><th>Parent Phone</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (list.length === 0 ? '<div class="empty-state"><i class="fas fa-user-graduate"></i><h3>No students found</h3></div>' : '') + '</div>';
}

function showStudentForm(s) {
    s = s || null;
    var classOpts = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th'].map(function(c) { return '<option ' + (s && s.Class===c ? 'selected' : '') + '>' + c + '</option>'; }).join('');
    var currentClass = s ? s.Class : '1st';

    openModal('<div class="modal-header"><h2>' + (s ? 'Edit' : 'Add') + ' Student</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<form class="modal-form" onsubmit="saveStudent(event,' + (s ? s.StudentId : 'null') + ')">' +
        '<div class="form-row"><div class="form-group"><label>Full Name *</label><input id="sf_name" value="' + (s ? s.FullName||'' : '') + '" required></div><div class="form-group"><label>Class *</label><select id="sf_class" onchange="updateSubjectOptions()" required>' + classOpts + '</select></div></div>' +
        '<div class="form-group"><label>Subjects *</label><div id="sf_subjects_container"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Father\'s Name</label><input id="sf_father" value="' + (s ? s.FatherName||'' : '') + '"></div><div class="form-group"><label>Mother\'s Name</label><input id="sf_mother" value="' + (s ? s.MotherName||'' : '') + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Student Phone</label><input id="sf_phone" value="' + (s ? s.StudentPhone||'' : '') + '"></div><div class="form-group"><label>Parent Phone</label><input id="sf_pphone" value="' + (s ? s.ParentPhone||'' : '') + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Date of Birth</label><input type="date" id="sf_dob" value="' + (s && s.DateOfBirth ? s.DateOfBirth.split('T')[0] : '') + '"></div><div class="form-group"><label>Gender</label><select id="sf_gender"><option ' + (s && s.Gender==='Male'?'selected':'') + '>Male</option><option ' + (s && s.Gender==='Female'?'selected':'') + '>Female</option><option ' + (s && s.Gender==='Other'?'selected':'') + '>Other</option></select></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Username *</label><input id="sf_user" value="' + (s ? s.Username||'' : '') + '" required></div><div class="form-group"><label>Address</label><input id="sf_addr" value="' + (s ? s.Address||'' : '') + '"></div></div>' +
        (s ? '' : '<div class="form-group"><label>Password</label><input id="sf_pass" value="student123"></div>') +
        '<div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">' + (s ? 'Update' : 'Add') + ' Student</button></div></form>');

    // Store existing batch IDs if editing
    if (s && s._batchIds) {
        window._editBatchIds = s._batchIds;
    } else {
        window._editBatchIds = null;
    }
    updateSubjectOptions();
}

function updateSubjectOptions() {
    var cls = document.getElementById('sf_class').value;
    var container = document.getElementById('sf_subjects_container');
    if (!container) return;
    var classNum = parseInt(cls);

    if (classNum <= 5 || ['1st','2nd','3rd','4th','5th'].indexOf(cls) >= 0) {
        container.innerHTML = '<div style="padding:10px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius)">' +
            '<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" class="subj-check" value="All Subjects" checked disabled><span style="font-weight:600">All Subjects</span><span style="color:var(--text-muted);font-size:.8rem">(Maths, Science, English, Hindi, SST)</span></label></div>';
    } else if (['6th','7th','8th','9th','10th'].indexOf(cls) >= 0) {
        container.innerHTML = '<div style="padding:10px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius)">' +
            '<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" class="subj-check" value="Maths + Science" checked disabled><span style="font-weight:600">Maths + Science</span><span style="color:var(--text-muted);font-size:.8rem">(Combined batch)</span></label></div>';
    } else {
        var subjects = ['Mathematics', 'Science'];
        var html = '<div style="display:flex;gap:16px;flex-wrap:wrap">';
        subjects.forEach(function(subj) {
            html += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 16px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius)">' +
                '<input type="checkbox" class="subj-check" value="' + subj + '" checked>' +
                '<span style="font-weight:600">' + subj + '</span></label>';
        });
        html += '</div>';
        container.innerHTML = html;
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

    var data = { FullName: $('sf_name').value, Class: cls, FatherName: $('sf_father').value, MotherName: $('sf_mother').value, StudentPhone: $('sf_phone').value, ParentPhone: $('sf_pphone').value, DateOfBirth: $('sf_dob').value, Gender: $('sf_gender').value, Username: $('sf_user').value, Address: $('sf_addr').value, Subjects: selectedSubjects };
    if (!id && $('sf_pass')) data.Password = $('sf_pass').value || 'student123';

    var r = id ? await put('/api/students/' + id, data) : await post('/api/students', data);
    if (r.success) { toast(id ? 'Student updated' : 'Student added'); closeModal(); loadStudents(); }
    else toast(r.error || 'Error', 'error');
}

async function editStudentById(id) {
    var s = await api('/api/students/' + id);
    // Get student's current batches
    var allBatches = await api('/api/batches');
    var bl = Array.isArray(allBatches) ? allBatches : [];
    // Find which batches this student is in via student_batches
    s._batchIds = [];
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
    '<p><strong>Batch:</strong> ' + (s.BatchName||'-') + ' | <strong>Fee:</strong> ' + formatCurrency(s.MonthlyFee) + '/month</p>' +
    '<p><strong>DOB:</strong> ' + formatDate(s.DateOfBirth) + ' | <strong>Admission:</strong> ' + formatDate(s.AdmissionDate) + '</p>' +
    '<p><strong>Address:</strong> ' + (s.Address||'-') + '</p></div>');
}

function filterTable(query, tableId) {
    var rows = document.querySelectorAll('#' + tableId + ' tbody tr');
    rows.forEach(function(r) { r.style.display = r.textContent.toLowerCase().indexOf(query.toLowerCase()) >= 0 ? '' : 'none'; });
}
function filterByClass(cls) { document.querySelectorAll('#studentsTable tbody tr').forEach(function(r) { r.style.display = !cls || r.dataset.class === cls ? '' : 'none'; }); }
function filterByStatus(st) { document.querySelectorAll('#studentsTable tbody tr').forEach(function(r) { r.style.display = !st || r.dataset.status === st ? '' : 'none'; }); }


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


// ═══ Homework Page ═══
async function loadHomework() {
    var hw = await api("/api/homework");
    var list = Array.isArray(hw) ? hw : [];
    var active = list.filter(function(h) { return new Date(h.DueDate) >= new Date(); });
    var rows = list.map(function(h) {
        var due = new Date(h.DueDate);
        var overdue = due < new Date();
        var desc = (h.Description || "").substring(0, 50);
        var actions = currentUser.role !== "student" ? "<td><button class=\"action-btn delete\" onclick=\"deleteHomework(" + h.HomeworkId + ")\"><i class=\"fas fa-trash\"></i></button></td>" : "";
        return "<tr><td><strong>" + h.Title + "</strong><br><small style=\"color:var(--text-muted)\">" + desc + "</small></td><td>" + (h.BatchName || "-") + "</td><td>" + (h.Subject || "-") + "</td><td>" + (h.TeacherName || "-") + "</td><td>" + formatDate(h.DueDate) + "</td><td><span class=\"status-badge " + (overdue ? "status-absent" : "status-active") + "\">" + (overdue ? "Expired" : "Active") + "</span></td>" + actions + "</tr>";
    }).join("");
    var actionsHeader = currentUser.role !== "student" ? "<th>Actions</th>" : "";
    var addBtn = currentUser.role !== "student" ? "<button class=\"btn btn-primary\" onclick=\"showHomeworkForm()\"><i class=\"fas fa-plus\"></i> Add Homework</button>" : "";
    $("contentArea").innerHTML = "<div class=\"section-header\"><div class=\"section-title\"><i class=\"fas fa-book-open\"></i> Homework</div><div class=\"section-actions\">" + addBtn + "</div></div><div class=\"stats-grid\" style=\"margin-bottom:20px\"><div class=\"stat-card\"><div class=\"stat-card-header\"><div class=\"stat-card-icon\"><i class=\"fas fa-book\"></i></div><span class=\"stat-card-label\">Total</span></div><div class=\"stat-card-value\">" + list.length + "</div></div><div class=\"stat-card\"><div class=\"stat-card-header\"><div class=\"stat-card-icon\"><i class=\"fas fa-clock\"></i></div><span class=\"stat-card-label\">Active</span></div><div class=\"stat-card-value\">" + active.length + "</div></div></div><div class=\"data-table-container\"><table><thead><tr><th>Title</th><th>Batch</th><th>Subject</th><th>Teacher</th><th>Due Date</th><th>Status</th>" + actionsHeader + "</tr></thead><tbody>" + rows + "</tbody></table></div>";
}

function showHomeworkForm() {
    Promise.all([api("/api/batches"), api("/api/teachers")]).then(function(res) {
        var bl = Array.isArray(res[0]) ? res[0] : [];
        var tl = Array.isArray(res[1]) ? res[1] : [];
        var batchOpts = bl.map(function(b) { return "<option value=\"" + b.BatchId + "\">" + b.BatchName + "</option>"; }).join("");
        var teacherOpts = tl.map(function(t) { return "<option value=\"" + t.TeacherId + "\">" + t.Name + "</option>"; }).join("");
        openModal("<div class=\"modal-header\"><h2>Add Homework</h2><button class=\"modal-close\" onclick=\"closeModal()\"><i class=\"fas fa-times\"></i></button></div><form class=\"modal-form\" onsubmit=\"saveHomework(event)\"><div class=\"form-group\"><label>Title *</label><input id=\"hw_title\" required></div><div class=\"form-row\"><div class=\"form-group\"><label>Batch *</label><select id=\"hw_batch\">" + batchOpts + "</select></div><div class=\"form-group\"><label>Subject</label><input id=\"hw_subj\"></div></div><div class=\"form-row\"><div class=\"form-group\"><label>Teacher</label><select id=\"hw_teacher\">" + teacherOpts + "</select></div><div class=\"form-group\"><label>Due Date *</label><input type=\"date\" id=\"hw_due\" required></div></div><div class=\"form-group\"><label>Description</label><textarea id=\"hw_desc\" rows=\"3\"></textarea></div><div class=\"modal-actions\"><button type=\"button\" class=\"btn btn-outline\" onclick=\"closeModal()\">Cancel</button><button type=\"submit\" class=\"btn btn-primary\">Add</button></div></form>");
    });
}

async function saveHomework(e) {
    e.preventDefault();
    var r = await post("/api/homework", { BatchId: $("hw_batch").value, TeacherId: $("hw_teacher").value, Title: $("hw_title").value, Description: $("hw_desc").value, Subject: $("hw_subj").value, DueDate: $("hw_due").value });
    if (r.success) { toast("Homework added"); closeModal(); loadHomework(); } else toast("Error", "error");
}
async function deleteHomework(id) { if (confirm("Delete this homework?")) { var r = await del("/api/homework/" + id); if (r.success) { toast("Deleted"); loadHomework(); } else { toast(r.error || "Delete failed", "error"); } } }

// ═══ Tests Page ═══
async function loadTests() {
    var tests = await api("/api/tests");
    var list = Array.isArray(tests) ? tests : [];
    var upcoming = list.filter(function(t) { return t.Status === "Upcoming"; });
    var completed = list.filter(function(t) { return t.Status === "Completed"; });
    var addBtn = currentUser.role !== "student" ? "<button class=\"btn btn-primary\" onclick=\"showTestForm()\"><i class=\"fas fa-plus\"></i> Schedule Test</button>" : "";

    var upcomingCards = "";
    if (upcoming.length) {
        var items = upcoming.map(function(t) {
            var d = new Date(t.TestDate);
            var day = d.getDate();
            var mon = d.toLocaleString("en", { month: "short" });
            var delBtn = currentUser.role !== "student" ? "<button class=\"action-btn delete\" onclick=\"deleteTest(" + t.TestId + ")\"><i class=\"fas fa-trash\"></i></button>" : "";
            var fileIcon = t.FilePath ? "<span style=\"display:inline-flex;align-items:center;gap:4px;background:var(--accent);color:#fff;padding:2px 8px;border-radius:12px;font-size:.7rem;margin-left:6px;cursor:pointer\" onclick=\"viewTestFile('" + t.FilePath + "','" + t.TestName.replace(/'/g, '') + "')\" title=\"View attachment\"><i class=\"fas fa-paperclip\"></i> File</span>" : "";
            return "<div class=\"upcoming-item\"><div class=\"upcoming-date\"><span class=\"day\">" + day + "</span><span class=\"month\">" + mon + "</span></div><div class=\"upcoming-info\"><h4>" + t.TestName + fileIcon + "</h4><p>" + (t.Subject || "") + " &bull; " + (t.BatchName || "") + " &bull; Max: " + t.MaximumMarks + " &bull; " + (t.Duration || "") + "</p></div>" + delBtn + "</div>";
        }).join("");
        upcomingCards = "<h3 style=\"margin-bottom:12px\"><i class=\"fas fa-clock\" style=\"color:var(--accent)\"></i> Upcoming Tests</h3><div class=\"upcoming-list\" style=\"margin-bottom:24px\">" + items + "</div>";
    }

    var tableRows = list.map(function(t) {
        var statusClass = t.Status === "Upcoming" ? "partial" : t.Status === "Completed" ? "active" : "absent";
        var fileCell = "";
        if (t.FilePath) {
            var ext = t.FilePath.split('.').pop().toLowerCase();
            var icon = ext === 'pdf' ? 'fa-file-pdf' : (ext === 'doc' || ext === 'docx') ? 'fa-file-word' : 'fa-file-image';
            var iconColor = ext === 'pdf' ? '#e74c3c' : (ext === 'doc' || ext === 'docx') ? '#2b5797' : '#27ae60';
            fileCell = "<button class=\"action-btn\" style=\"background:" + iconColor + "22;color:" + iconColor + "\" onclick=\"viewTestFile('" + t.FilePath + "','" + t.TestName.replace(/'/g, '') + "')\" title=\"View file\"><i class=\"fas " + icon + "\"></i></button>";
        } else {
            fileCell = "<span style=\"color:var(--text-muted);font-size:.8rem\">—</span>";
        }
        return "<tr><td><strong>" + t.TestName + "</strong></td><td>" + (t.BatchName || "-") + "</td><td>" + (t.Subject || "-") + "</td><td>" + formatDate(t.TestDate) + "</td><td>" + t.MaximumMarks + "</td><td>" + fileCell + "</td><td><span class=\"status-badge status-" + statusClass + "\">" + t.Status + "</span></td></tr>";
    }).join("");

    $("contentArea").innerHTML = "<div class=\"section-header\"><div class=\"section-title\"><i class=\"fas fa-clipboard-list\"></i> Tests</div><div class=\"section-actions\">" + addBtn + "</div></div><div class=\"stats-grid\" style=\"margin-bottom:20px\"><div class=\"stat-card\"><div class=\"stat-card-header\"><div class=\"stat-card-icon\"><i class=\"fas fa-calendar\"></i></div><span class=\"stat-card-label\">Upcoming</span></div><div class=\"stat-card-value\">" + upcoming.length + "</div></div><div class=\"stat-card\"><div class=\"stat-card-header\"><div class=\"stat-card-icon\"><i class=\"fas fa-check\"></i></div><span class=\"stat-card-label\">Completed</span></div><div class=\"stat-card-value\">" + completed.length + "</div></div></div>" + upcomingCards + "<div class=\"data-table-container\"><table><thead><tr><th>Test</th><th>Batch</th><th>Subject</th><th>Date</th><th>Max Marks</th><th>File</th><th>Status</th></tr></thead><tbody>" + tableRows + "</tbody></table></div>";
}

function showTestForm() {
    api("/api/batches").then(function(batches) {
        var bl = Array.isArray(batches) ? batches : [];
        var opts = bl.map(function(b) { return "<option value=\"" + b.BatchId + "\">" + b.BatchName + "</option>"; }).join("");
        openModal("<div class=\"modal-header\"><h2>Schedule Test</h2><button class=\"modal-close\" onclick=\"closeModal()\"><i class=\"fas fa-times\"></i></button></div>" +
            "<form class=\"modal-form\" id=\"testForm\" onsubmit=\"saveTest(event)\">" +
            "<div class=\"form-group\"><label>Test Name *</label><input id=\"tt_name\" required></div>" +
            "<div class=\"form-row\"><div class=\"form-group\"><label>Batch *</label><select id=\"tt_batch\">" + opts + "</select></div><div class=\"form-group\"><label>Subject</label><input id=\"tt_subj\"></div></div>" +
            "<div class=\"form-row\"><div class=\"form-group\"><label>Date *</label><input type=\"date\" id=\"tt_date\" required></div><div class=\"form-group\"><label>Time</label><input type=\"time\" id=\"tt_time\"></div></div>" +
            "<div class=\"form-row\"><div class=\"form-group\"><label>Max Marks</label><input type=\"number\" id=\"tt_marks\" value=\"100\"></div><div class=\"form-group\"><label>Duration</label><input id=\"tt_dur\" placeholder=\"e.g. 2 hours\"></div></div>" +
            "<div class=\"form-group\"><label><i class=\"fas fa-paperclip\" style=\"color:var(--accent)\"></i> Attach Question Paper (optional)</label>" +
            "<div style=\"position:relative\">" +
            "<input type=\"file\" id=\"tt_file\" accept=\".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp\" onchange=\"previewTestFile(this)\" style=\"display:none\">" +
            "<div id=\"tt_file_dropzone\" onclick=\"document.getElementById('tt_file').click()\" style=\"border:2px dashed var(--border);border-radius:var(--radius);padding:20px;text-align:center;cursor:pointer;transition:.3s;background:var(--bg-secondary)\">" +
            "<i class=\"fas fa-cloud-upload-alt\" style=\"font-size:1.5rem;color:var(--accent);margin-bottom:8px;display:block\"></i>" +
            "<p style=\"margin:0;font-size:.85rem;color:var(--text-secondary)\">Click to upload or drag a file here</p>" +
            "<p style=\"margin:4px 0 0;font-size:.75rem;color:var(--text-muted)\">PDF, Word, Images • Max 20MB</p>" +
            "</div>" +
            "<div id=\"tt_file_preview\" style=\"display:none;margin-top:8px;padding:10px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);display:none;align-items:center;gap:10px\"></div>" +
            "</div></div>" +
            "<div class=\"modal-actions\"><button type=\"button\" class=\"btn btn-outline\" onclick=\"closeModal()\">Cancel</button><button type=\"submit\" class=\"btn btn-primary\"><i class=\"fas fa-calendar-plus\"></i> Schedule</button></div></form>");

        // Add drag-and-drop support
        var dropzone = document.getElementById('tt_file_dropzone');
        if (dropzone) {
            dropzone.addEventListener('dragover', function(e) { e.preventDefault(); dropzone.style.borderColor = 'var(--accent)'; dropzone.style.background = 'var(--accent)11'; });
            dropzone.addEventListener('dragleave', function(e) { e.preventDefault(); dropzone.style.borderColor = 'var(--border)'; dropzone.style.background = 'var(--bg-secondary)'; });
            dropzone.addEventListener('drop', function(e) { e.preventDefault(); dropzone.style.borderColor = 'var(--border)'; dropzone.style.background = 'var(--bg-secondary)'; if (e.dataTransfer.files.length) { document.getElementById('tt_file').files = e.dataTransfer.files; previewTestFile(document.getElementById('tt_file')); } });
        }
    });
}

function previewTestFile(input) {
    var preview = document.getElementById('tt_file_preview');
    if (!preview) return;
    if (input.files && input.files[0]) {
        var file = input.files[0];
        var ext = file.name.split('.').pop().toLowerCase();
        var icon = ext === 'pdf' ? 'fa-file-pdf' : (ext === 'doc' || ext === 'docx') ? 'fa-file-word' : 'fa-file-image';
        var iconColor = ext === 'pdf' ? '#e74c3c' : (ext === 'doc' || ext === 'docx') ? '#2b5797' : '#27ae60';
        var sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        preview.style.display = 'flex';
        preview.innerHTML = '<i class="fas ' + icon + '" style="font-size:1.3rem;color:' + iconColor + '"></i>' +
            '<div style="flex:1"><strong style="font-size:.85rem">' + file.name + '</strong><br><span style="color:var(--text-muted);font-size:.75rem">' + sizeMB + ' MB</span></div>' +
            '<button type="button" onclick="clearTestFile()" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:1rem" title="Remove"><i class="fas fa-times-circle"></i></button>';
        document.getElementById('tt_file_dropzone').style.display = 'none';
    }
}

function clearTestFile() {
    document.getElementById('tt_file').value = '';
    document.getElementById('tt_file_preview').style.display = 'none';
    document.getElementById('tt_file_dropzone').style.display = 'block';
}

function viewTestFile(filePath, testName) {
    var ext = filePath.split('.').pop().toLowerCase();
    if (['png','jpg','jpeg','gif','webp','bmp'].indexOf(ext) >= 0) {
        // Image preview in modal
        openModal('<div class="modal-header"><h2><i class="fas fa-image"></i> ' + testName + '</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
            '<div style="text-align:center;padding:16px"><img src="' + filePath + '" style="max-width:100%;max-height:70vh;border-radius:var(--radius);box-shadow:var(--shadow)" alt="Test Paper"></div>' +
            '<div style="text-align:center;margin-top:12px"><a href="' + filePath + '" download class="btn btn-primary"><i class="fas fa-download"></i> Download</a></div>');
    } else {
        // PDF / Word — open in new tab or download
        window.open(filePath, '_blank');
    }
}

async function saveTest(e) {
    e.preventDefault();
    var formData = new FormData();
    formData.append('TestName', $('tt_name').value);
    formData.append('BatchId', $('tt_batch').value);
    formData.append('Subject', $('tt_subj').value);
    formData.append('TestDate', $('tt_date').value);
    formData.append('TestTime', $('tt_time').value);
    formData.append('MaximumMarks', $('tt_marks').value);
    formData.append('Duration', $('tt_dur').value);
    var fileInput = document.getElementById('tt_file');
    if (fileInput && fileInput.files[0]) {
        formData.append('testFile', fileInput.files[0]);
    }
    try {
        var resp = await fetch('/api/tests', { method: 'POST', body: formData });
        var r = await resp.json();
        if (r.success) { toast('Test scheduled'); closeModal(); loadTests(); }
        else toast(r.error || 'Error', 'error');
    } catch(err) { toast('Upload failed: ' + err.message, 'error'); }
}
async function deleteTest(id) { if (confirm("Delete this test?")) { var r = await del("/api/tests/" + id); if (r.success) { toast("Deleted"); loadTests(); } else { toast(r.error || "Delete failed", "error"); } } }

// ═══ Results Page - Class-wise Sectioned with Test Names ═══
async function loadResults() {
    var results = await api("/api/results");
    var list = Array.isArray(results) ? results : [];
    var addBtn = currentUser.role !== "student" ? "<button class=\"btn btn-primary\" onclick=\"showResultForm()\"><i class=\"fas fa-plus\"></i> Add Result</button>" : "";

    // Group by class
    var classSections = {};
    var classOrder = ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th"];
    list.forEach(function(r) {
        var cls = r.Class || "Unknown";
        if (!classSections[cls]) classSections[cls] = {};
        var testKey = r.TestId + "_" + r.TestName;
        if (!classSections[cls][testKey]) {
            classSections[cls][testKey] = {
                testName: r.TestName,
                subject: r.Subject || "-",
                maxMarks: r.MaximumMarks,
                testDate: r.TestDate,
                batchName: r.BatchName || "-",
                students: []
            };
        }
        classSections[cls][testKey].students.push(r);
    });

    // Overall stats
    var totalResults = list.length;
    var avgPct = totalResults > 0 ? Math.round(list.reduce(function(sum, r) { return sum + (r.MarksObtained / r.MaximumMarks * 100); }, 0) / totalResults) : 0;
    var topGraders = list.filter(function(r) { return r.Grade === "A+" || r.Grade === "A"; }).length;

    // Build sectioned HTML
    var sectionsHTML = "";
    classOrder.forEach(function(cls) {
        if (!classSections[cls]) return;
        var tests = classSections[cls];
        var testKeys = Object.keys(tests);

        sectionsHTML += "<div style=\"margin-bottom:28px\">";
        sectionsHTML += "<div style=\"display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:12px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);border-left:4px solid var(--accent)\">";
        sectionsHTML += "<i class=\"fas fa-graduation-cap\" style=\"color:var(--accent);font-size:1.3rem\"></i>";
        sectionsHTML += "<div><h3 style=\"margin:0;font-size:1.1rem\">Class " + cls + "</h3>";
        sectionsHTML += "<small style=\"color:var(--text-muted)\">" + testKeys.length + " test(s)</small></div></div>";

        testKeys.forEach(function(key) {
            var test = tests[key];
            // Sort students by marks descending (toppers first)
            test.students.sort(function(a, b) { return b.MarksObtained - a.MarksObtained; });

            sectionsHTML += "<div class=\"data-table-container\" style=\"margin-bottom:16px\">";
            // Test header bar
            sectionsHTML += "<div style=\"padding:14px 16px;background:var(--bg-secondary);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px\">";
            sectionsHTML += "<div style=\"display:flex;align-items:center;gap:10px\">";
            sectionsHTML += "<i class=\"fas fa-file-alt\" style=\"color:var(--info);font-size:1rem\"></i>";
            sectionsHTML += "<div><strong style=\"font-size:.95rem\">" + test.testName + "</strong>";
            sectionsHTML += "<span style=\"color:var(--text-muted);font-size:.8rem;margin-left:8px\">" + test.subject + "</span></div></div>";
            sectionsHTML += "<div style=\"display:flex;gap:16px;align-items:center;flex-wrap:wrap\">";
            sectionsHTML += "<span style=\"font-size:.8rem;color:var(--text-muted)\"><i class=\"fas fa-layer-group\"></i> " + test.batchName + "</span>";
            sectionsHTML += "<span style=\"font-size:.8rem;color:var(--text-muted)\"><i class=\"fas fa-calendar\"></i> " + formatDate(test.testDate) + "</span>";
            sectionsHTML += "<span class=\"status-badge status-active\">Max: " + test.maxMarks + "</span>";
            if (currentUser.role === 'admin') {
                sectionsHTML += "<button class=\"action-btn delete\" title=\"Delete all results for this test\" onclick=\"deleteTestResults(" + test.testId + ",'" + test.testName.replace(/'/g,"") + "')\" style=\"margin-left:8px\"><i class=\"fas fa-trash\"></i> Clear All</button>";
            }
            sectionsHTML += "</div></div>";

            // Student results table
            var delHeader = currentUser.role === 'admin' ? "<th style=\"width:50px\">Action</th>" : "";
            sectionsHTML += "<table><thead><tr><th style=\"width:40px\">#</th><th>Student</th><th>Marks</th><th>Percentage</th><th>Grade</th><th>Remarks</th>" + delHeader + "</tr></thead><tbody>";

            test.students.forEach(function(r, idx) {
                var pct = Math.round(r.MarksObtained / r.MaximumMarks * 100);
                var color = pct >= 75 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--danger)";
                var gradeColor = r.Grade === "A+" ? "var(--success)" : r.Grade === "A" ? "#00c9a7" : r.Grade === "B+" ? "#00b4d8" : r.Grade === "B" ? "var(--info)" : r.Grade === "C" ? "var(--warning)" : "var(--danger)";
                var rankIcon = idx === 0 ? " <i class=\"fas fa-trophy\" style=\"color:#ffc107;font-size:.7rem\"></i>" : "";

                sectionsHTML += "<tr>";
                sectionsHTML += "<td style=\"font-weight:600;color:var(--text-muted)\">" + (idx + 1) + "</td>";
                sectionsHTML += "<td><strong>" + r.FullName + "</strong>" + rankIcon + "</td>";
                sectionsHTML += "<td><span style=\"font-weight:700\">" + r.MarksObtained + "</span><span style=\"color:var(--text-muted)\">/" + r.MaximumMarks + "</span></td>";
                sectionsHTML += "<td><div style=\"display:flex;align-items:center;gap:8px\"><div style=\"flex:1;max-width:80px;height:6px;background:var(--border);border-radius:3px;overflow:hidden\"><div style=\"width:" + pct + "%;height:100%;background:" + color + ";border-radius:3px\"></div></div><span style=\"color:" + color + ";font-weight:700;font-size:.9rem\">" + pct + "%</span></div></td>";
                sectionsHTML += "<td><span style=\"background:" + gradeColor + "22;color:" + gradeColor + ";padding:3px 10px;border-radius:12px;font-weight:700;font-size:.8rem\">" + (r.Grade || "-") + "</span></td>";
                sectionsHTML += "<td style=\"color:var(--text-muted);font-size:.85rem\">" + (r.Remarks || "-") + "</td>";
                if (currentUser.role === 'admin') {
                    sectionsHTML += "<td><button class=\"action-btn delete\" title=\"Delete this result\" onclick=\"deleteResult(" + r.ResultId + ")\"><i class=\"fas fa-trash\"></i></button></td>";
                }
                sectionsHTML += "</tr>";
            });

            sectionsHTML += "</tbody></table></div>";
        });

        sectionsHTML += "</div>";
    });

    if (!sectionsHTML) {
        sectionsHTML = "<div class=\"empty-state\"><i class=\"fas fa-chart-bar\"></i><h3>No results found</h3><p>Add results after completing tests</p></div>";
    }

    $("contentArea").innerHTML = "<div class=\"section-header\"><div class=\"section-title\"><i class=\"fas fa-chart-bar\"></i> Results - Class wise</div><div class=\"section-actions\">" + addBtn + "</div></div>" +
        "<div class=\"stats-grid\" style=\"margin-bottom:24px\">" +
        "<div class=\"stat-card\"><div class=\"stat-card-header\"><div class=\"stat-card-icon\"><i class=\"fas fa-poll\"></i></div><span class=\"stat-card-label\">Total Results</span></div><div class=\"stat-card-value\">" + totalResults + "</div></div>" +
        "<div class=\"stat-card\"><div class=\"stat-card-header\"><div class=\"stat-card-icon\"><i class=\"fas fa-percentage\"></i></div><span class=\"stat-card-label\">Avg Percentage</span></div><div class=\"stat-card-value\">" + avgPct + "%</div></div>" +
        "<div class=\"stat-card\"><div class=\"stat-card-header\"><div class=\"stat-card-icon\"><i class=\"fas fa-trophy\"></i></div><span class=\"stat-card-label\">A+ / A Grades</span></div><div class=\"stat-card-value\">" + topGraders + "</div></div>" +
        "</div>" + sectionsHTML;
}

function showResultForm() {
    api("/api/tests").then(function(tests) {
        var tl = Array.isArray(tests) ? tests : [];
        var tOpts = tl.map(function(t) { return '<option value="' + t.TestId + '" data-batch="' + t.BatchId + '" data-max="' + t.MaximumMarks + '">' + t.TestName + ' - ' + (t.Subject||'') + ' (' + (t.BatchName||t.Class||'') + ', Max:' + t.MaximumMarks + ')</option>'; }).join("");
        openModal('<div class="modal-header"><h2><i class="fas fa-edit"></i> Upload Marks</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
            '<div class="modal-form" style="max-height:70vh;overflow-y:auto">' +
            '<div class="form-group"><label>Select Test *</label><select id="bulk_test" onchange="loadBulkStudents()">' +
            '<option value="">-- Choose a test --</option>' + tOpts + '</select></div>' +
            '<div id="bulkStudentsList"></div>' +
            '<div id="bulkActions" style="display:none;margin-top:16px"><div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="button" class="btn btn-primary" onclick="saveBulkResults()"><i class="fas fa-save"></i> Save All Marks</button></div></div>' +
            '</div>');
    });
}

async function loadBulkStudents() {
    var sel = document.getElementById("bulk_test");
    if (!sel || !sel.value) { document.getElementById("bulkStudentsList").innerHTML = ""; document.getElementById("bulkActions").style.display = "none"; return; }
    var opt = sel.options[sel.selectedIndex];
    var batchId = opt.getAttribute("data-batch");
    var maxMarks = opt.getAttribute("data-max");

    var students = await api("/api/students/batch/" + batchId);
    var existingResults = await api("/api/results");
    var testId = sel.value;

    // Build lookup of existing results for this test
    var existing = {};
    if (Array.isArray(existingResults)) {
        existingResults.forEach(function(r) {
            if (String(r.TestId) === String(testId)) existing[r.StudentId] = r;
        });
    }

    if (!Array.isArray(students) || !students.length) {
        document.getElementById("bulkStudentsList").innerHTML = '<div class="empty-state" style="padding:16px"><i class="fas fa-users"></i><p>No students found in this batch</p></div>';
        document.getElementById("bulkActions").style.display = "none";
        return;
    }

    var html = '<div style="padding:10px 0;font-size:0.85rem;color:var(--text-muted)">' + students.length + ' students &bull; Max marks: ' + maxMarks + '</div>';
    html += '<table><thead><tr><th style="width:40px">#</th><th>Student Name</th><th>Class</th><th style="width:100px">Marks /' + maxMarks + '</th><th style="width:120px">Remarks</th></tr></thead><tbody>';

    students.forEach(function(s, i) {
        var ex = existing[s.StudentId];
        var val = ex ? ex.MarksObtained : "";
        var rem = ex ? (ex.Remarks || "") : "";
        html += '<tr><td>' + (i+1) + '</td><td><strong>' + s.FullName + '</strong></td><td>' + (s.Class||'-') + '</td>';
        html += '<td><input type="number" min="0" max="' + maxMarks + '" class="bulk-mark-input" data-sid="' + s.StudentId + '" value="' + val + '" style="width:80px;padding:6px 8px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:0.9rem"></td>';
        html += '<td><input type="text" class="bulk-remark-input" data-sid="' + s.StudentId + '" value="' + rem + '" placeholder="optional" style="width:100px;padding:6px 8px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:0.85rem"></td></tr>';
    });

    html += '</tbody></table>';
    document.getElementById("bulkStudentsList").innerHTML = html;
    document.getElementById("bulkActions").style.display = "block";
}

async function saveBulkResults() {
    var testId = document.getElementById("bulk_test").value;
    if (!testId) { toast("Select a test first", "error"); return; }

    var markInputs = document.querySelectorAll(".bulk-mark-input");
    var remarkInputs = document.querySelectorAll(".bulk-remark-input");
    var entries = [];

    markInputs.forEach(function(inp) {
        var sid = inp.getAttribute("data-sid");
        var marks = inp.value;
        var remarkInp = document.querySelector('.bulk-remark-input[data-sid="' + sid + '"]');
        var remarks = remarkInp ? remarkInp.value : "";
        entries.push({ StudentId: sid, MarksObtained: marks, Remarks: remarks });
    });

    var filled = entries.filter(function(e) { return e.MarksObtained !== "" && e.MarksObtained !== null; });
    if (!filled.length) { toast("Enter marks for at least one student", "error"); return; }

    var r = await post("/api/results/bulk", { TestId: testId, results: entries });
    if (r.success) { toast(r.saved + " results saved successfully!"); closeModal(); loadResults(); }
    else toast("Error saving results", "error");
}

async function saveResult(e) {
    e.preventDefault();
    var r = await post("/api/results", { StudentId: $("rs_student").value, TestId: $("rs_test").value, MarksObtained: $("rs_marks").value, Remarks: $("rs_remarks").value });
    if (r.success) { toast("Result added"); closeModal(); loadResults(); } else toast("Error", "error");
}

async function deleteResult(resultId) {
    if (!confirm("Delete this result? You can re-enter it later.")) return;
    var r = await del("/api/results/" + resultId);
    if (r.success) { toast("Result deleted"); loadResults(); } else toast("Error deleting", "error");
}

async function deleteTestResults(testId, testName) {
    if (!confirm("Delete ALL results for '" + testName + "'? This will remove marks for every student in this test.")) return;
    var r = await del("/api/results/test/" + testId);
    if (r.success) { toast(r.deleted + " results deleted for " + testName); loadResults(); } else toast("Error deleting", "error");
}


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
        <div class="form-row"><div class="form-group"><label>Audience</label><select id="nc_aud"><option>All</option><option>Students</option><option>Teachers</option></select></div><div class="form-group"><label>Priority</label><select id="nc_pri"><option>Normal</option><option>Important</option><option>Urgent</option></select></div></div>
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
        <div class="data-table-container"><table id="timetableTable"><thead><tr><th>Day</th><th>Batch</th><th>Subject</th><th>Time</th><th>Teacher</th><th>Room</th></tr></thead>
        <tbody>${list.map(t=>`<tr data-batch="${t.BatchId}"><td><strong>${t.Day}</strong></td><td>${t.BatchName||'-'}</td><td>${t.Subject||'-'}</td><td>${t.StartTime?.substring(0,5)} - ${t.EndTime?.substring(0,5)}</td><td>${t.TeacherName||'-'}</td><td>${t.Room||'-'}</td></tr>`).join('')}</tbody></table></div>`;
}

function filterTimetable(batchId) {
    document.querySelectorAll('#timetableTable tbody tr').forEach(r => { r.style.display = !batchId || r.dataset.batch == batchId ? '' : 'none'; });
}

function showTimetableForm() {
    Promise.all([api('/api/batches'),api('/api/teachers')]).then(([batches,teachers])=>{
        const bl=Array.isArray(batches)?batches:[];const tl=Array.isArray(teachers)?teachers:[];
        openModal(`<div class="modal-header"><h2>Add Timetable Entry</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
        <form class="modal-form" onsubmit="saveTimetable(event)">
            <div class="form-row"><div class="form-group"><label>Batch *</label><select id="tte_batch">${bl.map(b=>`<option value="${b.BatchId}">${b.BatchName}</option>`).join('')}</select></div>
            <div class="form-group"><label>Day *</label><select id="tte_day">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=>`<option>${d}</option>`).join('')}</select></div></div>
            <div class="form-row"><div class="form-group"><label>Subject</label><input id="tte_subj"></div><div class="form-group"><label>Room</label><input id="tte_room"></div></div>
            <div class="form-row"><div class="form-group"><label>Start Time *</label><input type="time" id="tte_start" required></div><div class="form-group"><label>End Time *</label><input type="time" id="tte_end" required></div></div>
            <div class="form-group"><label>Teacher</label><select id="tte_teacher"><option value="">Select</option>${tl.map(t=>`<option value="${t.TeacherId}">${t.Name}</option>`).join('')}</select></div>
            <div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Add</button></div>
        </form>`);
    });
}

async function saveTimetable(e){e.preventDefault();const r=await post('/api/timetable',{BatchId:$('tte_batch').value,Day:$('tte_day').value,Subject:$('tte_subj').value,StartTime:$('tte_start').value,EndTime:$('tte_end').value,TeacherId:$('tte_teacher').value||null,Room:$('tte_room').value});if(r.success){toast('Entry added');closeModal();loadTimetable();}else toast('Error','error');}

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
        const data = await api('/api/attendance?date='+new Date().toISOString().split('T')[0]);
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
        html = `<h3>Batch Performance</h3><table><thead><tr><th>Batch</th><th>Class</th><th>Students</th><th>Teacher</th><th>Fee/Month</th></tr></thead><tbody>${list.map(b=>`<tr><td>${b.BatchName}</td><td>${b.Class}</td><td>${b.StudentCount||0}</td><td>${b.TeacherName||'-'}</td><td>${formatCurrency(b.MonthlyFee)}</td></tr>`).join('')}</tbody></table>`;
    }
    $('reportOutput').innerHTML = `<div class="data-table-container" style="padding:20px">${html}<div style="margin-top:16px"><button class="btn btn-outline" onclick="window.print()"><i class="fas fa-print"></i> Print</button></div></div>`;
}

// ═══ Settings Page ═══
async function loadSettings() {
    const settings = await api('/api/settings');
    $('contentArea').innerHTML = `
        <div class="section-header"><div class="section-title"><i class="fas fa-cog"></i> Institute Settings</div></div>
        <div class="data-table-container" style="padding:24px">
            <div class="modal-form">
                <div class="form-group"><label>Institute Name</label><input value="${settings.instituteName||''}" readonly></div>
                <div class="form-row"><div class="form-group"><label>Phone</label><input value="${settings.phone||''}"></div><div class="form-group"><label>Email</label><input value="${settings.email||''}"></div></div>
                <div class="form-group"><label>Address</label><input value="${settings.address||''}"></div>
                <div class="form-group"><label>Classes Offered</label><input value="${(settings.classes||[]).join(', ')}" readonly></div>
            </div>
            <hr style="border-color:var(--border);margin:24px 0">
            <h3 style="margin-bottom:16px"><i class="fas fa-database" style="color:var(--accent)"></i> Database</h3>
            <div class="section-actions"><button class="btn btn-success"><i class="fas fa-download"></i> Backup Database</button><button class="btn btn-warning"><i class="fas fa-upload"></i> Restore Database</button></div>
        </div>`;
}

// ═══ Data Export ═══
function exportData(type) { toast('Export feature - use Print button in Reports section', 'info'); }
