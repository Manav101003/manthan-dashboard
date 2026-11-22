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
