# BugFlow - Complete User Guide

A step-by-step guide to using the QA Test Case Management System.

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Dashboard Overview](#dashboard-overview)
4. [Managing Projects](#managing-projects)
5. [Working with Test Cases](#working-with-test-cases)
6. [Sharing Projects & Team Collaboration](#sharing-projects--team-collaboration)
7. [Archiving Projects](#archiving-projects)
8. [Roles & Permissions](#roles--permissions)

---

## Getting Started

### Prerequisites
Before using BugFlow, ensure the system is running:
- **Backend**: Running on `http://localhost:3001`
- **Frontend**: Running on `http://localhost:3000`
- **MySQL Database**: Connected with schema applied

### Starting the Application

**Step 1: Start Backend**
```bash
cd backend
npm run dev
```

**Step 2: Start Frontend**
```bash
cd bugflow
npm run dev
```

**Step 3: Open the App**
Navigate to `http://localhost:3000` in your browser.

---

## Authentication

### Creating an Account

1. On the Login page, click **"Create an Account"**
2. Fill out the registration form:
   - **Full Name**: Your name
   - **Email Address**: Your work email
   - **Password**: Strong password (minimum 8 characters)
   - **Role**:
     - Select **QA Analyst** if you will manage projects and test cases
     - Select **Developer** if you will work on assigned test cases
3. Click **Sign Up**
4. You will be redirected to the Login page to sign in with your credentials.

### Logging In
1. Enter your email address and password
2. Click **Sign In**
3. You'll be taken to your Dashboard.

### Forgot Password
- Click **Forgot Password?** on the Login page
- Enter your email address to receive a password reset link
- Follow the instructions in the email to set a new password.

---

## Dashboard Overview

Your Dashboard is the home page of BugFlow. It shows an overview of your work:

### Test Project Summary Table
- Shows all projects you have access to
- Columns include:
  - Project Name
  - Total Test Cases
  - Passed, Failed, To Fix, Open
  - Critical, High Priority
  - Bugs
  - Progress Bar
- Use the search bar to quickly find projects

### Creating a New Project
1. Click the **"NEW PROJECT"** button in the top right
2. Enter:
   - **Project Name**: Name your project
   - **Description** (Optional): Brief description of what the project is about
3. Click **Create**

---

## Managing Projects

### Viewing a Project
1. From the Dashboard, click on the **Project Name** in the summary table
2. You'll see:
   - Project Header (name, description, status)
   - Test Summary Cards (Total, Passed, Failed, To Fix, Open, Critical, High, Bugs)
   - **Test Cases Table** with all cases for the project

### Editing a Project
1. Go to the Project Detail Page
2. Click the **"Edit Project"** button (if you have access)
3. Update the project name/description
4. Click **Save Changes**

### Ending a Project
1. On the Project Detail Page, click **"End Project"**
2. This will archive the project (it will move to the Archive page)

---

## Working with Test Cases

### Creating a New Test Case

1. On the Project Detail Page, click **"NEW TEST CASE"**
2. Fill out the Test Case form:
   - **Test Name**: What you're testing
   - **Steps to Reproduce**: Step-by-step instructions
   - **Expected Result**: What should happen if no bug
   - **Actual Result**: What actually happens
   - **Test Data**: Data used for testing
   - **Severity**: Choose from Low, Medium, High, Critical, or Custom
   - **Priority**: Choose from Low, Medium, High, Urgent, or Custom
   - **Issue Type**: Choose from Bug, Feature, Enhancement, Documentation, or Custom
   - **Status**: Choose from OPEN, TO FIX, FOR QA, PASS, FAILED, CLOSED, or Custom
   - **Assigned To**: Assign to a project member
   - **Root Cause**, **Action Plan**, **Developer Solution**: Fill as needed
   - **Attachments**: Upload screenshots, videos, or other files
3. Click **Create Test Case**

### Viewing a Test Case
1. On the Project's Test Cases Table, click on a row
2. You'll see the full Test Case Detail View with all information and history

### Editing a Test Case
1. From the Test Case Detail View, click **"EDIT TEST CASE"**
2. Update fields as needed
3. To delete existing attachments:
   - Hover over the attachment and click the delete icon
   - Confirm deletion
4. Click **Save Changes**

### Test Case Status Flow
A typical test case lifecycle:
1. **OPEN**: Test case created
2. **TO FIX**: Developer assigned
3. **FOR QA**: Fix is ready for verification
4. **PASS/FAILED**: QA verification complete
5. **CLOSED**: Test case is closed

---

## Sharing Projects & Team Collaboration

### Accessing the Share Page
1. Click **Share Project** from the sidebar
2. Here you can:
   - View projects you own
   - Invite new team members
   - Manage existing member roles

### Inviting a Team Member
1. On the Share Project Page, select a project you own
2. Enter the email address of the person you want to invite
3. Choose a **Role**:
   - **Author**: Full access (manage project, invite members, edit/delete test cases)
   - **Editor**: Can create and edit test cases, cannot archive/delete projects or manage members
   - **Viewer**: Read-only access
4. Click **Send Invitation**
5. The invited person will receive a notification in their BugFlow sidebar

### Managing Member Roles
1. On the Share Project Page, find the project and member
2. Use the dropdown menu to change the member's role
3. Click **Save** to confirm

---

## Archiving Projects

### Accessing Archived Projects
1. Click **Archive** from the sidebar
2. You'll see all projects you've ended

### Restoring an Archived Project
1. On the Archive Page, find the project
2. Click **Resume**
3. The project will be restored to your Dashboard

### Deleting an Archived Project (Permanent)
1. On the Archive Page, click **Delete**
2. Confirm deletion - this action cannot be undone!
   - All test cases, attachments, and project data will be permanently lost

---

## Roles & Permissions

| Action | Author | Editor | Viewer |
|--------|--------|--------|--------|
| Create Project | ✅ | ❌ | ❌ |
| Edit Project | ✅ | ❌ | ❌ |
| Archive/End Project | ✅ | ❌ | ❌ |
| Delete Project | ✅ | ❌ | ❌ |
| Invite Members | ✅ | ❌ | ❌ |
| Manage Member Roles | ✅ | ❌ | ❌ |
| Create Test Case | ✅ | ✅ | ❌ |
| Edit Test Case | ✅ | ✅ | ❌ |
| Delete Test Case | ✅ | ✅ | ❌ |
| View Test Case | ✅ | ✅ | ✅ |
| View Dashboard | ✅ | ✅ | ✅ |

---

## Troubleshooting Tips

### I Can't Log In
- Make sure your password is correct
- Use the "Forgot Password" feature to reset it

### Attachments Aren't Uploading
- Check your internet connection
- Verify file size (Cloudinary has limits, usually 10-100MB depending on plan)
- Check Cloudinary credentials in `backend/.env`

### Table Columns Are Misaligned
- This project uses high-density tables; use horizontal scroll if needed

### Real-time Updates Aren't Working
- Make sure both frontend and backend are running
- Check if Socket.IO is connected in your browser's developer tools (Console tab)

---

## Support

For technical issues:
- Check backend logs at `backend/logs/` (if enabled)
- Review browser console errors (F12 → Console)
- Check your database connection

---

## Pro Tips

1. **Case Numbers**: They are automatically incremented per project (CASE_001, CASE_002, etc.)
2. **Text Fields**: All multi-line fields (Steps, Expected/Actual Results) preserve line breaks
3. **Custom Values**: You can enter custom Severity, Priority, Issue Type, or Status if the presets don't fit your needs
4. **Search**: Use the search bar to filter projects on the Dashboard
5. **Notifications**: Check the sidebar bell for new project invitations

---

That's it! You're ready to use BugFlow for your QA test case management! 🎉
