import { Layout } from '../components/Layout';

export default function UpcomingFeatures() {
  return (
    <Layout title="Upcoming Features">
      <div className="max-w-3xl mx-auto px-2 sm:px-0 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">Upcoming Features</h1>
        <div className="space-y-8 text-base sm:text-lg">
          <section>
            <h2 className="text-xl font-semibold mb-2">📆 Academic & Scheduling Features</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                <b>Timetable Builder</b><br />
                <ul className="list-disc ml-6">
                  <li>Allow Admin/Head to assign teachers to subjects and time slots with drag-and-drop interface.</li>
                  <li>Automatic conflict detection (same teacher double-booked, overlapping class times).</li>
                  <li>Exportable to PDF/CSV.</li>
                </ul>
              </li>
              <li>
                <b>Attendance Tracking</b><br />
                <ul className="list-disc ml-6">
                  <li>Teachers can mark attendance per class/session.</li>
                  <li>Admin/Head can view reports by student/class/date.</li>
                  <li>Option to flag students with frequent absences.</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">📝 Student & Class Management</h2>
            <ol className="list-decimal ml-6 space-y-2" start={3}>
              <li>
                <b>Student Records Module</b><br />
                <ul className="list-disc ml-6">
                  <li>Profiles for each student: personal info, academic history, behavior notes, and guardian contact.</li>
                  <li>Ability to add notes or flags.</li>
                </ul>
              </li>
              <li>
                <b>Class Roster & Subject Grouping</b><br />
                <ul className="list-disc ml-6">
                  <li>Assign students to classes and subjects.</li>
                  <li>Teachers view class list and basic student info.</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">🧾 Communication & Notifications</h2>
            <ol className="list-decimal ml-6 space-y-2" start={5}>
              <li>
                <b>Internal Messaging System</b><br />
                <ul className="list-disc ml-6">
                  <li>Private messages between teachers, admins, and heads.</li>
                  <li>Optional email notification on new message.</li>
                </ul>
              </li>
              <li>
                <b>Push Notifications</b><br />
                <ul className="list-disc ml-6">
                  <li>Send instant updates for announcements, leave approvals, or emergencies.</li>
                  <li>Use Supabase Realtime or services like OneSignal.</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">📊 Reporting & Analytics</h2>
            <ol className="list-decimal ml-6 space-y-2" start={7}>
              <li>
                <b>Performance Analytics Dashboard</b><br />
                <ul className="list-disc ml-6">
                  <li>Track teacher feedback trends, attendance stats, leave trends.</li>
                  <li>Visual graphs and filters (by class, time period, subject).</li>
                </ul>
              </li>
              <li>
                <b>Audit Logs</b><br />
                <ul className="list-disc ml-6">
                  <li>Track changes (e.g. leave balance updates, user deletions).</li>
                  <li>Useful for transparency and debugging.</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">🏫 Parent/Guardian Access (Optional Future Phase)</h2>
            <ol className="list-decimal ml-6 space-y-2" start={9}>
              <li>
                <b>Parent Portal</b><br />
                <ul className="list-disc ml-6">
                  <li>View announcements, student attendance, upcoming events.</li>
                  <li>Limited access (read-only) to relevant info.</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">🔐 Security & Controls</h2>
            <ol className="list-decimal ml-6 space-y-2" start={10}>
              <li>
                <b>Activity Logs / Session History</b><br />
                <ul className="list-disc ml-6">
                  <li>Track logins per user (device, time, IP).</li>
                  <li>Useful for security audits.</li>
                </ul>
              </li>
              <li>
                <b>Granular Role Permissions</b><br />
                <ul className="list-disc ml-6">
                  <li>Customize what each role can see or do beyond current presets.</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">🛠 Platform Enhancements</h2>
            <ol className="list-decimal ml-6 space-y-2" start={12}>
              <li>
                <b>Dark Mode Toggle</b><br />
                <ul className="list-disc ml-6">
                  <li>User toggle for dark/light mode for better accessibility.</li>
                </ul>
              </li>
              <li>
                <b>Offline Mode with Sync</b><br />
                <ul className="list-disc ml-6">
                  <li>Allow teachers to access attendance or announcements offline and sync when back online.</li>
                </ul>
              </li>
              <li>
                <b>Form Builder</b><br />
                <ul className="list-disc ml-6">
                  <li>Creator/Admin can build custom forms (surveys, registrations, etc.) with drag-and-drop.</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">👨‍🏫 Teacher Tools</h2>
            <ol className="list-decimal ml-6 space-y-2" start={15}>
              <li>
                <b>Lesson Planner</b><br />
                <ul className="list-disc ml-6">
                  <li>Teachers can plan and save daily/weekly lessons.</li>
                  <li>Reusable templates for future planning.</li>
                </ul>
              </li>
              <li>
                <b>Student Feedback Loop</b><br />
                <ul className="list-disc ml-6">
                  <li>Teachers can submit reports on student performance per week.</li>
                  <li>Heads/Admin can view summaries.</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">✅ Quick Wins (Small But Useful)</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>Quick Action Shortcuts on dashboard (e.g., "Apply Leave", "Post Announcement", "View Schedule").</li>
              <li>Sticky Notes Widget on dashboards.</li>
              <li>Birthday Reminders (for students or staff).</li>
              <li>Dashboard Notifications (colored badges for pending leave requests, unread messages).</li>
            </ul>
          </section>
        </div>
      </div>
    </Layout>
  );
}
