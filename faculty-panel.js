// Faculty Time-Saving Mode - Standalone (No API Keys Required)
class FacultyPanel {
  constructor() {
    this.draggedRow = null;
    this.courses = this.loadCourses();
    this.students = this.loadStudents();
    this.settings = this.loadSettings();
    this.init();
  }

  init() {
    this.setupDragAndDrop();
    this.setupFacultyShortcuts();
    this.setupAutoSave();
    this.showToast('Faculty Mode Enabled - All Features Active ✓', 'success');
  }

  // Drag & Drop for course reordering
  setupDragAndDrop() {
    document.addEventListener('dragstart', (e) => {
      if (e.target.closest('tr[draggable="true"]')) {
        this.draggedRow = e.target.closest('tr');
        e.target.closest('tr').style.opacity = '0.5';
      }
    });

    document.addEventListener('dragend', (e) => {
      if (this.draggedRow) {
        this.draggedRow.style.opacity = '1';
        this.draggedRow = null;
      }
    });

    document.addEventListener('dragover', (e) => e.preventDefault());

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      const table = e.target.closest('table');
      if (table && this.draggedRow) {
        const tbody = table.querySelector('tbody');
        const allRows = Array.from(tbody.querySelectorAll('tr'));
        const draggedIndex = allRows.indexOf(this.draggedRow);
        const targetIndex = allRows.indexOf(e.target.closest('tr'));
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
          if (draggedIndex < targetIndex) {
            allRows[targetIndex].after(this.draggedRow);
          } else {
            allRows[targetIndex].before(this.draggedRow);
          }
          this.saveCourseOrder();
          this.showToast('Course reordered', 'success');
        }
      }
    });
  }

  // API Key Management - REMOVED (Not needed)
  // setupApikeyPanel() { } - Removed for standalone operation

  // Auto-Save System
  setupAutoSave() {
    setInterval(() => {
      this.saveCourses();
      this.saveStudents();
      this.saveSettings();
    }, 5000);
  }

  // Data Loading & Persistence
  loadCourses() {
    return JSON.parse(localStorage.getItem('faculty_courses') || '[]');
  }

  loadStudents() {
    return JSON.parse(localStorage.getItem('faculty_students') || '[]');
  }

  loadSettings() {
    return JSON.parse(localStorage.getItem('faculty_settings') || '{"theme":"light","autoSave":true,"notifications":true}');
  }

  saveCourses() {
    localStorage.setItem('faculty_courses', JSON.stringify(this.courses));
  }

  saveStudents() {
    localStorage.setItem('faculty_students', JSON.stringify(this.students));
  }

  saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('faculty_settings', JSON.stringify(this.settings));
  }

  // Faculty Shortcuts
  setupFacultyShortcuts() {
    const shortcuts = document.getElementById('facultyShortcuts') || this.createShortcuts();
    
    shortcuts.querySelector('.shortcut-batch-edit')?.addEventListener('click', 
      () => this.openBatchEditModal());
    shortcuts.querySelector('.shortcut-bulk-upload')?.addEventListener('click', 
      () => this.openBulkUploadModal());
    shortcuts.querySelector('.shortcut-export')?.addEventListener('click', 
      () => this.quickExport());
  }

  createShortcuts() {
    const shortcuts = document.createElement('div');
    shortcuts.id = 'facultyShortcuts';
    shortcuts.className = 'faculty-shortcuts';
    shortcuts.innerHTML = `
      <div class="shortcuts-grid">
        <button class="shortcut-card shortcut-batch-edit">
          <span class="icon">✏️</span>
          <span class="label">Batch Edit</span>
          <span class="desc">Edit multiple courses at once</span>
        </button>
        <button class="shortcut-card shortcut-bulk-upload">
          <span class="icon">📤</span>
          <span class="label">Bulk Upload</span>
          <span class="desc">Import marks sheet (Excel/CSV)</span>
        </button>
        <button class="shortcut-card shortcut-export">
          <span class="icon">📥</span>
          <span class="label">Quick Export</span>
          <span class="desc">Export dossier as PDF/Excel</span>
        </button>
        <button class="shortcut-card shortcut-student-search">
          <span class="icon">🔍</span>
          <span class="label">Find Student</span>
          <span class="desc">Quick search by name or ID</span>
        </button>
      </div>
    `;
    document.body.appendChild(shortcuts);
    return shortcuts;
  }

  openBatchEditModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>Batch Edit Courses</h2>
          <button class="modal-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Select Filter</label>
            <select class="form-select" id="batchEditFilter">
              <option>All Courses</option>
              <option>By Semester</option>
              <option>By Status</option>
              <option>By Type</option>
            </select>
          </div>
          <div class="form-group">
            <label>Update Field</label>
            <select class="form-select" id="batchEditField">
              <option>Status</option>
              <option>Grade</option>
              <option>Credits</option>
              <option>Remarks</option>
            </select>
          </div>
          <div class="form-group">
            <label>New Value</label>
            <input class="form-input" type="text" id="batchEditValue" placeholder="Enter new value">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
          <button class="btn btn-primary" onclick="faculty.executeBatchEdit()">Apply Changes</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  executeBatchEdit() {
    const filter = document.getElementById('batchEditFilter').value;
    const field = document.getElementById('batchEditField').value;
    const value = document.getElementById('batchEditValue').value;
    
    if (!value) {
      this.showToast('Please enter a value', 'error');
      return;
    }

    // Get all course rows from table
    const allRows = Array.from(document.querySelectorAll('table tbody tr'));
    let updatedCount = 0;

    allRows.forEach(row => {
      let shouldUpdate = false;

      // Apply filter logic
      if (filter === 'All Courses') {
        shouldUpdate = true;
      } else if (filter === 'By Status' && row.querySelector('[data-status]')) {
        shouldUpdate = true;
      } else if (filter === 'By Semester' && row.querySelector('[data-semester]')) {
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        // Update the specific field
        const fieldCell = row.querySelector(`[data-field="${field}"]`) || 
                         row.querySelector(`[data-${field.toLowerCase()}]`);
        if (fieldCell) {
          fieldCell.textContent = value;
          fieldCell.setAttribute('data-modified', 'true');
          row.style.backgroundColor = '#e8f4f8';
          updatedCount++;
        }
      }
    });

    // Save to localStorage
    this.saveCourses();

    this.showToast(`✓ Updated ${updatedCount} courses: ${field} → ${value}`, 'success');
    document.querySelector('.modal-overlay')?.remove();
  }

  openBulkUploadModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal wide">
        <div class="modal-header">
          <h2>Bulk Upload Marks</h2>
          <button class="modal-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Upload Excel / CSV File</label>
            <input type="file" class="form-input" id="bulkFile" accept=".xlsx,.csv" 
              onchange="faculty.processBulkUpload(event)">
          </div>
          <div id="bulkPreview" style="margin-top:20px;"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
          <button class="btn btn-primary" onclick="faculty.confirmBulkUpload()">Upload & Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  processBulkUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        const preview = document.getElementById('bulkPreview');
        preview.innerHTML = `
          <h4>Preview (first 5 rows)</h4>
          <table class="subject-table" style="font-size:12px;">
            <thead>
              <tr>${Object.keys(json[0]).map(k => `<th>${k}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${json.slice(0, 5).map(row => 
                `<tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>`
              ).join('')}
            </tbody>
          </table>
          <p style="margin-top:10px;color:var(--ink4);font-size:12px;">Total records: ${json.length}</p>
        `;
        
        this.bulkData = json;
      } catch (error) {
        this.showToast('Error reading file: ' + error.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  confirmBulkUpload() {
    if (!this.bulkData) {
      this.showToast('Please select a file first', 'error');
      return;
    }

    // Process bulk data locally
    const processed = this.bulkData.map((record, idx) => ({
      id: Date.now() + idx,
      ...record,
      processed_at: new Date().toISOString(),
      status: 'imported'
    }));

    // Add to courses
    this.courses.push(...processed);
    this.saveCourses();

    // Update table with new records
    this.addCoursesToTable(processed);

    this.showToast(`✓ Imported ${processed.length} courses successfully!`, 'success');
    document.querySelector('.modal-overlay')?.remove();
    this.bulkData = null;
  }

  addCoursesToTable(courses) {
    const table = document.querySelector('table tbody');
    if (!table) return;

    courses.forEach(course => {
      const row = document.createElement('tr');
      row.draggable = true;
      row.innerHTML = `
        <td class="course-code">${course.Course_Code || course.course_code || '—'}</td>
        <td class="course-name">${course.Course_Name || course.course_name || '—'}</td>
        <td class="course-semester">${course.Semester || course.semester || '—'}</td>
        <td class="course-credits">${course.Credits || course.credits || '—'}</td>
        <td class="course-grade">${course.Grade || course.grade || '—'}</td>
        <td class="course-status"><span class="badge badge-completed">${course.Status || course.status || 'PENDING'}</span></td>
        <td><button class="btn-small delete" onclick="faculty.deleteCourse(this)">Delete</button></td>
      `;
      table.appendChild(row);
    });
  }

  deleteCourse(btn) {
    if (confirm('Delete this course?')) {
      btn.closest('tr').remove();
      this.saveCourses();
      this.showToast('Course deleted', 'success');
    }
  }

  quickExport() {
    const format = prompt('Export format:\n1. JSON\n2. CSV\n3. HTML\n\nEnter choice (1/2/3):', '1');
    
    if (format === '1') this.exportJSON();
    else if (format === '2') this.exportCSV();
    else if (format === '3') this.exportHTML();
  }

  exportJSON() {
    const data = {
      timestamp: new Date().toISOString(),
      type: 'Academic Dossier Export',
      student: this.getCurrentStudent(),
      courses: this.getAllCourses(),
      summary: this.getAcademicSummary(),
      totalRecords: this.courses.length
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dossier-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showToast('✓ JSON export downloaded', 'success');
  }

  exportCSV() {
    const courses = this.getAllCourses();
    let csv = 'Course Code,Course Name,Semester,Credits,Grade,Status,Modified\n';
    
    courses.forEach(c => {
      csv += `"${c.code || ''}","${c.name || ''}","${c.semester || ''}","${c.credits || ''}","${c.grade || ''}","${c.status || ''}","${c.modified || 'false'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dossier-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showToast('✓ CSV export downloaded', 'success');
  }

  exportHTML() {
    const student = this.getCurrentStudent();
    const courses = this.getAllCourses();
    const summary = this.getAcademicSummary();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Academic Dossier - ${student.name}</title>
  <style>
    body { font-family: Arial; margin: 20px; background: #f5f5f5; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1, h2 { color: #003366; border-bottom: 2px solid #003366; padding-bottom: 10px; }
    .student-info { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #003366; color: white; }
    tr:nth-child(even) { background: #f2f2f2; }
    .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px; }
    .summary-item { background: #e8f4f8; padding: 10px; border-radius: 5px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Academic Dossier & Equivalence Report</h1>
    
    <div class="student-info">
      <h2>Student Profile</h2>
      <p><strong>Name:</strong> ${student.name}</p>
      <p><strong>Roll No:</strong> ${student.roll}</p>
      <p><strong>Department:</strong> ${student.department}</p>
      <p><strong>Email:</strong> ${student.email || '—'}</p>
    </div>

    <h2>Course Records (${courses.length} Total)</h2>
    <table>
      <thead>
        <tr>
          <th>Course Code</th>
          <th>Course Name</th>
          <th>Semester</th>
          <th>Credits</th>
          <th>Grade</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${courses.map(c => `
          <tr>
            <td>${c.code || '—'}</td>
            <td>${c.name || '—'}</td>
            <td>${c.semester || '—'}</td>
            <td>${c.credits || '—'}</td>
            <td>${c.grade || '—'}</td>
            <td>${c.status || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-item">
        <strong>CGPA:</strong> ${summary.cgpa}
      </div>
      <div class="summary-item">
        <strong>Current SGPA:</strong> ${summary.sgpa}
      </div>
      <div class="summary-item">
        <strong>Total Credits:</strong> ${summary.totalCredits || '—'}
      </div>
      <div class="summary-item">
        <strong>Backlogs:</strong> ${summary.backlogs || '0'}
      </div>
    </div>

    <div class="footer">
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <p>UniTrack Academic Management System v2.0</p>
    </div>
  </div>
</body>
</html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dossier-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showToast('✓ HTML export downloaded', 'success');
  }

  saveCourseOrder() {
    // Save reordered courses to localStorage
    const courses = Array.from(document.querySelectorAll('table tbody tr')).map((row, i) => ({
      order: i,
      courseCode: row.querySelector('.course-code')?.textContent,
      courseName: row.querySelector('.course-name')?.textContent
    }));
    localStorage.setItem('course_order', JSON.stringify(courses));
    this.saveCourses();
  }

  getCurrentStudent() {
    return {
      name: document.getElementById('studentNameDisplay')?.textContent || 'Student',
      roll: document.getElementById('studentRollDisplay')?.textContent || 'N/A',
      email: document.getElementById('studentEmailDisplay')?.textContent || 'student@university.edu',
      department: document.getElementById('studentDeptDisplay')?.textContent || 'CSE'
    };
  }

  getAllCourses() {
    const courses = [];
    document.querySelectorAll('table tbody tr').forEach(row => {
      courses.push({
        code: row.querySelector('.course-code')?.textContent || '',
        name: row.querySelector('.course-name')?.textContent || '',
        semester: row.querySelector('[data-semester]')?.textContent || row.querySelector('.course-semester')?.textContent || '',
        credits: row.querySelector('[data-credits]')?.textContent || row.querySelector('.course-credits')?.textContent || '',
        grade: row.querySelector('[data-grade]')?.textContent || row.querySelector('.course-grade')?.textContent || '',
        status: row.querySelector('[data-status]')?.textContent || row.querySelector('.course-status')?.textContent || '',
        modified: row.getAttribute('data-modified') === 'true'
      });
    });
    return courses.length > 0 ? courses : this.courses;
  }

  getAcademicSummary() {
    return {
      cgpa: document.getElementById('dashCGPA')?.textContent || '8.5',
      sgpa: document.getElementById('dashSGPA')?.textContent || '8.3',
      backlogs: document.getElementById('dashBacklogCount')?.textContent || '0',
      completionPercent: document.getElementById('progressPct')?.textContent || '75%',
      totalCredits: 'Calculated',
      lastUpdated: new Date().toISOString()
    };
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    const container = document.querySelector('.toast-container') || 
      (() => {
        const c = document.createElement('div');
        c.className = 'toast-container';
        document.body.appendChild(c);
        return c;
      })();
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

// Initialize Faculty Panel
let faculty;
document.addEventListener('DOMContentLoaded', () => {
  faculty = new FacultyPanel();
});
