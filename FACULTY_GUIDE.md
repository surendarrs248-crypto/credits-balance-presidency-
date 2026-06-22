# UniTrack Faculty Time-Saving Mode Guide

## Overview
UniTrack now includes powerful faculty time-saving features that streamline course management, student tracking, and academic dossier generation. This guide covers all new features.

---

## 🎯 Key Features

### 1. **Drag & Drop Course Reordering** 
Move courses between semesters or reorder within a semester by simply dragging and dropping.

**How to Use:**
- Click and hold any course row in the table
- Drag to the desired position
- Release to drop
- Changes are automatically saved to browser storage

**Example:**
```
Original: Sem 1 → Course A, Course B, Course C
After Drag: Sem 1 → Course B, Course C, Course A
```

---

### 2. **API Key Management** 🔑

Securely manage integration keys for faculty operations and external integrations.

**Features:**
- Generate new API keys with custom names
- View key creation timestamps
- Delete unused keys
- Keys are stored in `localStorage` for persistence

**Access:**
- Click the **🔑 API Keys Management** button in the Faculty Panel
- Click **+ Add API Key** to create a new key
- Enter a descriptive name (e.g., "Marks Upload Integration")

**API Key Structure:**
```
pk_[24-char-random-string]
Example: pk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Backend Endpoints:**
```bash
# Get all API keys
GET /api/faculty/apikeys

# Create new API key
POST /api/faculty/apikeys
{
  "name": "My Integration Key"
}

# Delete API key
DELETE /api/faculty/apikeys/{keyId}
```

---

### 3. **Batch Edit Courses** ✏️

Edit multiple courses at once instead of updating one-by-one.

**Features:**
- Filter courses by:
  - All courses
  - Semester
  - Status (Completed, Pending, Failed)
  - Course type (Theory, Lab, Project)
- Update fields:
  - Status
  - Grade
  - Credits
  - Remarks

**Usage:**
1. Click **Batch Edit** in Faculty Shortcuts
2. Select your filter criteria
3. Choose the field to update
4. Enter the new value
5. Click **Apply Changes**

**Example:**
```
Filter: All courses with FAIL status
Field: Status
New Value: PENDING_RETAKE
Result: All failed courses marked as pending retake
```

---

### 4. **Bulk Upload Marks Sheet** 📤

Import entire mark sheets from Excel/CSV files in one operation.

**Supported Formats:**
- Excel (.xlsx)
- CSV (.csv)

**Required Columns:**
| Column | Type | Example |
|--------|------|---------|
| Course_Code | Text | CSE2007 |
| Course_Name | Text | Data Structures |
| Semester | Number | 3 |
| Credits | Number | 3 |
| Grade | Text | B+ |
| Status | Text | COMPLETED |

**Usage:**
1. Click **Bulk Upload** in Faculty Shortcuts
2. Select an Excel or CSV file
3. Review the preview (first 5 rows shown)
4. Click **Upload & Save**
5. System confirms import with record count

**API Endpoint:**
```bash
POST /api/faculty/bulk-upload
{
  "records": [
    {
      "course_code": "CSE2007",
      "course_name": "Data Structures",
      "semester": 3,
      "credits": 3,
      "grade": "A",
      "status": "COMPLETED"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "imported": 5,
  "summary": {
    "total": 5,
    "successful": 5,
    "failed": 0
  }
}
```

---

### 5. **Quick Export** 📥

Export academic dossiers in multiple formats.

**Supported Formats:**
1. **PDF** - Professional document format
2. **Excel** - Spreadsheet with multiple sheets
3. **JSON** - Raw data export

**Includes:**
- Student profile information
- All courses and grades
- Semester-wise breakdown
- GPA summary (CGPA, SGPA)
- Backlog tracking
- Course equivalence mapping
- Academic requirements status

**Usage:**
1. Click **Quick Export** in Faculty Shortcuts
2. Select desired format (PDF/Excel/JSON)
3. File downloads automatically

**Export Structure (JSON):**
```json
{
  "timestamp": "2026-06-22T10:30:00Z",
  "student": {
    "name": "Student Name",
    "roll": "20211CSE0001",
    "email": "student@university.edu",
    "department": "CSE",
    "batch": "2021-2025"
  },
  "courses": [...],
  "summary": {
    "cgpa": 8.5,
    "sgpa": 8.3,
    "backlogs": 0,
    "completionPercent": "85%"
  }
}
```

---

### 6. **Student Quick Search** 🔍

Find students by name, roll number, or email instantly.

**How to Search:**
1. Click **Find Student** in Faculty Shortcuts
2. Enter search query
3. Results show:
   - Student name
   - Roll number
   - Email
   - Department
   - Batch
   - Current CGPA

**Search API:**
```bash
POST /api/faculty/search-student
{
  "query": "2021CSE"
}
```

---

## 📊 Toast Notifications

Real-time feedback for all faculty operations:

| Type | Color | Example |
|------|-------|---------|
| ✅ Success | Green | "Course reordered successfully" |
| ❌ Error | Red | "Please enter a value" |
| ℹ️ Info | Blue | "PDF export initiated..." |

Notifications appear at bottom-right for 3 seconds.

---

## 🔐 Data Storage

### Browser Storage (localStorage)
- **API Keys**: `faculty_apikeys` (JSON array)
- **Course Order**: `course_order` (JSON array)
- **Faculty Settings**: `faculty_settings` (JSON object)

### Server Storage
- API endpoints accept/return JSON
- Supports integration with backend database
- Stateless design for scalability

---

## 🚀 API Quick Reference

### Faculty Endpoints

```bash
# Get all API keys
GET /api/faculty/apikeys

# Create API key
POST /api/faculty/apikeys
Content-Type: application/json
{
  "name": "Key Name"
}

# Bulk upload marks
POST /api/faculty/bulk-upload
{
  "records": [...]
}

# Batch edit courses
POST /api/faculty/batch-edit
{
  "filter": "semester",
  "field": "status",
  "value": "COMPLETED"
}

# Export academic data
POST /api/faculty/export
{
  "format": "json|pdf|excel",
  "data": {...}
}

# Search students
POST /api/faculty/search-student
{
  "query": "student name or ID"
}

# Health check (includes mode)
GET /api/health
```

---

## 📋 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Shift + E` | Quick Export |
| `Ctrl + Shift + B` | Batch Edit |
| `Ctrl + Shift + U` | Bulk Upload |
| `Ctrl + Shift + F` | Find Student |
| `Esc` | Close any modal |

---

## 💡 Tips for Maximum Efficiency

1. **Bulk Operations**: Use batch edit for semester-wide changes instead of editing individually
2. **Shortcuts**: Pin Faculty Shortcuts panel for quick access
3. **Export Regularly**: Generate dossiers weekly for backups
4. **API Keys**: Create separate keys for different integrations (marks system, analytics, etc.)
5. **Search**: Use partial roll numbers for faster student lookup

---

## 🛠️ Troubleshooting

### Course Reordering Not Saving
- Ensure browser allows localStorage
- Check browser console for errors
- Clear cache and reload page

### API Key Not Generated
- Verify browser is online
- Check browser storage limit
- Try generating with shorter name

### Bulk Upload Failed
- Verify Excel/CSV has required columns
- Ensure no empty rows before data
- Use exact column names as specified

### Export Not Downloading
- Check browser download settings
- Disable popup blockers
- Try different format (JSON works best)

---

## 📞 Support

For issues or feature requests:
1. Check browser console for error messages
2. Review this guide's troubleshooting section
3. Contact IT support with:
   - Browser and OS version
   - Feature name
   - Error message (if any)
   - Steps to reproduce

---

## Version Info
- **UniTrack Version**: 2.0
- **Faculty Mode**: Enabled
- **API Version**: v1
- **Last Updated**: 2026-06-22

---

**Happy scheduling!** 🎓
