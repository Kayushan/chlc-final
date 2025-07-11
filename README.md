# EduSync Platform

EduSync is a modern, full-featured school management platform for Charis Hope Learning Centre, designed to streamline administration, communication, and daily operations for all staff roles. Built with React, TypeScript, Supabase, and Tailwind CSS, EduSync is optimized for both desktop and mobile browsers.

## Features

### 1. Responsive Dashboards for All Roles
- **Creator Dashboard**: Full system access, user management, AI configuration, maintenance mode, diagnostics, and data export.
- **Admin Dashboard**: Manage weekly schedules, class assignments, and academic planning.
- **Head Dashboard**: Monitor teacher performance, resolve issues, and oversee daily operations.
- **Teacher Dashboard**: View schedules, announcements, and submit feedback.
- **Staff Login & Creator Login**: Secure authentication for all staff roles.

### 2. Announcements System
- **Announcement Feed**: View all school-wide announcements.
- **Announcement Creation**: Authorized users (creator, admin, head) can post new announcements.

### 3. User Management
- **Add/Edit/Delete Users**: Creators can manage all users, assign roles, and reset passwords.
- **Role-based Access**: Features and panels are shown/hidden based on user role.

### 4. AI Assistant Integration
- **AI Assistant**: Enable/disable AI assistant for different roles, configure API keys and models.
- **Role Access Control**: Fine-grained control over which roles can use AI features.

### 5. Maintenance Mode
- **Global Toggle**: Instantly enable/disable site access for non-creator users.
- **Status Display**: Clear UI indication of maintenance status.

### 6. Feedback System
- **Feedback Panel**: View and refresh feedback submitted by users.
- **Feedback Table/List**: See who submitted feedback, the message, and the date.

### 7. Data Export (Placeholders)
- **Export Users, Schedules, Reports**: Buttons for future CSV export functionality.

### 8. Diagnostics & System Status
- **Diagnostic Panel**: Access system diagnostics for troubleshooting.
- **System Status**: View database status, user count, and platform version.

### 9. Dynamic Greeting
- **Time-based Welcome**: Personalized greeting ("Good morning/afternoon/evening, [Name]") based on device time for all dashboards.

### 10. Mobile Optimization
- **Responsive Layouts**: All pages and tables adapt to mobile screens.
- **Touch-friendly Controls**: Buttons, forms, and tables are easy to use on touch devices.

---

## How Key Functions Work

### getGreeting(name)
Returns a greeting string based on the user's device time and name. Used in all dashboards for a personalized welcome.

### loadCreatorData()
Fetches users, AI settings, maintenance status, and feedbacks from Supabase. Updates state for the Creator Dashboard.

### handleSubmitUser(e)
Handles user creation and editing. Hashes passwords, updates/inserts user records, and refreshes the user list.

### handleDeleteUser(id, name)
Deletes a user after confirmation. Refreshes the user list on success.

### handleUpdateAISettings(e)
Saves AI assistant settings (API keys, model, role access) to Supabase. Handles both create and update logic.

### handleAddApiKey() / handleRemoveApiKey(index)
Adds or removes API keys from the AI configuration form.

### handleToggleMaintenance()
Toggles global maintenance mode. Updates the system_flags table and UI state.

### Feedback Management
- Feedbacks are loaded from Supabase and displayed in tables/lists.
- Refresh buttons re-fetch the latest feedbacks.

### Announcement Management
- AnnouncementFeed displays all announcements.
- AnnouncementCreateModal allows authorized users to post new announcements.

### Diagnostics
- DiagnosticPanel provides system diagnostics and troubleshooting tools.

---

## Getting Started

1. **Install dependencies:**
   ```
   npm install
   ```
2. **Configure Supabase:**
   - Set up your Supabase project and update credentials in `src/lib/supabase.ts`.
3. **Run the development server:**
   ```
   npm run dev
   ```
4. **Build for production:**
   ```
   npm run build
   ```
5. **Deploy:**
   - Supports Netlify and other static hosts. See `netlify.toml` for configuration.

---

## Project Structure
- `src/pages/` — Main user-facing pages (dashboards, login, etc.)
- `src/components/` — Shared UI components (AnnouncementFeed, Layout, etc.)
- `src/lib/` — Utility functions and Supabase client
- `public/` — Static assets
- `supabase/` — Database migrations

---

## Technologies Used
- React + TypeScript
- Supabase (Postgres, Auth)
- Tailwind CSS
- Vite
- Netlify (optional)

---


---

## Upcoming Features

### 📆 Academic & Scheduling Features
1. **Timetable Builder**
   - Allow Admin/Head to assign teachers to subjects and time slots with drag-and-drop interface.
   - Automatic conflict detection (same teacher double-booked, overlapping class times).
   - Exportable to PDF/CSV.

2. **Attendance Tracking**
   - Teachers can mark attendance per class/session.
   - Admin/Head can view reports by student/class/date.
   - Option to flag students with frequent absences.

### 📝 Student & Class Management
3. **Student Records Module**
   - Profiles for each student: personal info, academic history, behavior notes, and guardian contact.
   - Ability to add notes or flags.

4. **Class Roster & Subject Grouping**
   - Assign students to classes and subjects.
   - Teachers view class list and basic student info.

### 🧾 Communication & Notifications
5. **Internal Messaging System**
   - Private messages between teachers, admins, and heads.
   - Optional email notification on new message.

6. **Push Notifications**
   - Send instant updates for announcements, leave approvals, or emergencies.
   - Use Supabase Realtime or services like OneSignal.

### 📊 Reporting & Analytics
7. **Performance Analytics Dashboard**
   - Track teacher feedback trends, attendance stats, leave trends.
   - Visual graphs and filters (by class, time period, subject).

8. **Audit Logs**
   - Track changes (e.g. leave balance updates, user deletions).
   - Useful for transparency and debugging.

### 🏫 Parent/Guardian Access (Optional Future Phase)
9. **Parent Portal**
   - View announcements, student attendance, upcoming events.
   - Limited access (read-only) to relevant info.

### 🔐 Security & Controls
10. **Activity Logs / Session History**
    - Track logins per user (device, time, IP).
    - Useful for security audits.

11. **Granular Role Permissions**
    - Customize what each role can see or do beyond current presets.

### 🛠 Platform Enhancements
12. **Dark Mode Toggle**
    - User toggle for dark/light mode for better accessibility.

13. **Offline Mode with Sync**
    - Allow teachers to access attendance or announcements offline and sync when back online.

14. **Form Builder**
    - Creator/Admin can build custom forms (surveys, registrations, etc.) with drag-and-drop.

### 👨‍🏫 Teacher Tools
15. **Lesson Planner**
    - Teachers can plan and save daily/weekly lessons.
    - Reusable templates for future planning.

16. **Student Feedback Loop**
    - Teachers can submit reports on student performance per week.
    - Heads/Admin can view summaries.

### ✅ Quick Wins (Small But Useful)
- Quick Action Shortcuts on dashboard (e.g., "Apply Leave", "Post Announcement", "View Schedule").
- Sticky Notes Widget on dashboards.
- Birthday Reminders (for students or staff).
- Dashboard Notifications (colored badges for pending leave requests, unread messages).

---

## License
This project is for Charis Hope Learning Centre. For other use, please contact the creator.
