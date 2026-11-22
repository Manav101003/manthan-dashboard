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
