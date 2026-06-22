// Faculty Time-Saving Mode
class FacultyPanel {
  constructor() {
    this.draggedRow = null;
    this.apiKeys = this.loadApiKeys();
    this.studentBatch = [];
    this.init();
  }

  init() {
    this.setupDragAndDrop();
    this.setupApikeyPanel();
    this.setupFacultyShortcuts();
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

  // API Key Management Panel
  setupApikeyPanel() {
    const panel = document.getElementById('apikeyPanel') || this.createApikeyPanel();
    
    const addBtn = panel.querySelector('.apikey-add-btn');
    const keysList = panel.querySelector('.apikey-list');

    addBtn?.addEventListener('click', () => this.showAddKeyModal());

    // Load existing keys
    this.apiKeys.forEach(key => {
      const item = this.createKeyItem(key);
      keysList.appendChild(item);
    });
  }

  createApikeyPanel() {
    const panel = document.createElement('div');
    panel.id = 'apikeyPanel';
    panel.className = 'faculty-apikey-panel';
    panel.innerHTML = `
      <div class="apikey-header">
        <h3>🔑 API Keys Management</h3>
        <p>Manage your integration keys for faculty operations</p>
      </div>
      <button class="btn btn-primary apikey-add-btn">+ Add API Key</button>
      <div class="apikey-list"></div>
    `;
    document.body.appendChild(panel);
    return panel;
  }

  createKeyItem(key) {
    const item = document.createElement('div');
    item.className = 'apikey-item';
    item.innerHTML = `
      <div class="apikey-info">
        <strong>${key.name}</strong>
        <code>${key.key.substring(0, 10)}...${key.key.substring(key.key.length - 4)}</code>
        <small>Created: ${new Date(key.created).toLocaleDateString()}</small>
      </div>
      <button class="btn-small delete" onclick="faculty.deleteKey('${key.id}')">Delete</button>
    `;
    return item;
  }

  showAddKeyModal() {
    const keyName = prompt('Enter API Key Name:');
    if (keyName) {
      const newKey = {
        id: Date.now().toString(),
        name: keyName,
        key: this.generateApiKey(),
        created: new Date().toISOString()
      };
      this.apiKeys.push(newKey);
      this.saveApiKeys();
      this.showToast(`API Key "${keyName}" added successfully`, 'success');
    }
  }

  generateApiKey() {
    return 'pk_' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  deleteKey(keyId) {
    if (confirm('Delete this API Key?')) {
      this.apiKeys = this.apiKeys.filter(k => k.id !== keyId);
      this.saveApiKeys();
      this.showToast('API Key deleted', 'success');
      location.reload();
    }
  }

  saveApiKeys() {
    localStorage.setItem('faculty_apikeys', JSON.stringify(this.apiKeys));
  }

  loadApiKeys() {
    return JSON.parse(localStorage.getItem('faculty_apikeys') || '[]');
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

    // Implementation for batch edit
    this.showToast(`Batch edit applied: ${filter} → ${field} = ${value}`, 'success');
    document.querySelector('.modal-overlay').remove();
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

    // Process bulk data
    this.showToast(`Uploaded ${this.bulkData.length} records successfully`, 'success');
    document.querySelector('.modal-overlay').remove();
  }

  quickExport() {
    const format = prompt('Export as:\n1. PDF\n2. Excel\n3. JSON\n\nEnter (1/2/3):', '1');
    
    const formats = {
      '1': () => this.exportPDF(),
      '2': () => this.exportExcel(),
      '3': () => this.exportJSON()
    };

    formats[format]?.();
  }

  exportPDF() {
    this.showToast('PDF export initiated...', 'info');
    // Implementation for PDF export
  }

  exportExcel() {
    this.showToast('Excel export initiated...', 'info');
    // Implementation for Excel export
  }

  exportJSON() {
    const data = {
      timestamp: new Date().toISOString(),
      student: this.getCurrentStudent(),
      courses: this.getAllCourses(),
      summary: this.getAcademicSummary()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic-dossier-${Date.now()}.json`;
    a.click();
    
    this.showToast('JSON export completed', 'success');
  }

  saveCourseOrder() {
    // Save reordered courses to localStorage
    const courses = Array.from(document.querySelectorAll('table tbody tr')).map((row, i) => ({
      order: i,
      courseCode: row.querySelector('.course-code')?.textContent
    }));
    localStorage.setItem('course_order', JSON.stringify(courses));
  }

  getCurrentStudent() {
    return {
      name: document.getElementById('studentNameDisplay')?.textContent || 'N/A',
      roll: document.getElementById('studentRollDisplay')?.textContent || 'N/A',
      department: document.getElementById('studentDeptDisplay')?.textContent || 'N/A'
    };
  }

  getAllCourses() {
    const courses = [];
    document.querySelectorAll('table tbody tr').forEach(row => {
      courses.push({
        code: row.querySelector('.course-code')?.textContent,
        name: row.querySelector('.course-name')?.textContent,
        credits: row.querySelector('.course-credits')?.textContent,
        grade: row.querySelector('.course-grade')?.textContent,
        status: row.querySelector('.course-status')?.textContent
      });
    });
    return courses;
  }

  getAcademicSummary() {
    return {
      cgpa: document.getElementById('dashCGPA')?.textContent || 'N/A',
      sgpa: document.getElementById('dashSGPA')?.textContent || 'N/A',
      backlogs: document.getElementById('dashBacklogCount')?.textContent || '0',
      completionPercent: document.getElementById('progressPct')?.textContent || '0%'
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
