import { AnnualLeaveApplication } from './leaveManagement'; // Assuming this path and interface

/**
 * Formats a single leave application record into a readable plain text string.
 * @param record - The AnnualLeaveApplication object.
 * @param teacherName - The name of the teacher who applied for leave.
 * @param reviewerName - The name of the person who reviewed the leave (if reviewed).
 * @returns A formatted string representing the leave record.
 */
export const formatLeaveRecordAsText = (
  record: AnnualLeaveApplication,
  teacherName?: string, // Optional, as users.name might be directly on record from join
  reviewerName?: string // Optional, as users_reviewed_by.name might be directly on record
): string => {
  const teacher = teacherName || record.users?.name || `Teacher ID: ${record.teacher_id.substring(0,8)}`;
  const leaveType = record.leave_type || 'Annual'; // Default to 'Annual' if not present
  const status = record.status || 'N/A';

  // Use leave_date for start_date and end_date as per current single-day leave assumption
  const startDate = record.leave_date ? new Date(record.leave_date).toLocaleDateString('en-CA') : 'N/A'; // YYYY-MM-DD
  const endDate = startDate; // For single-day leaves

  const reason = record.reason || 'No reason provided.';

  let approvedByStr = 'N/A';
  if (record.reviewed_by) {
    approvedByStr = reviewerName || record.users_reviewed_by?.name || `Reviewer ID: ${record.reviewed_by.substring(0,8)}`;
  } else if (status === 'Approved' || status === 'Rejected') {
    approvedByStr = 'System/Unknown (No reviewer ID)';
  }

  const approvedAtStr = record.decision_time
    ? new Date(record.decision_time).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
    : (status === 'Approved' || status === 'Rejected' ? 'Unknown Time' : 'N/A');

  const appliedAtStr = record.created_at
    ? new Date(record.created_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
    : 'N/A';

  // Constructing the text format
  let output = `Annual Leave Record\n`;
  output += `--------------------\n`;
  output += `Teacher: ${teacher}\n`;
  output += `Leave Type: ${leaveType}\n`;
  output += `Status: ${status}\n`;
  output += `Leave Date: ${startDate}\n`; // Using "Leave Date" as per single-day context
  // If multi-day becomes a feature, this would be Start Date & End Date
  // output += `Start Date: ${startDate}\n`;
  // output += `End Date: ${endDate}\n`;
  output += `Reason: ${reason}\n`;
  output += `Applied At: ${appliedAtStr}\n`;
  if (status === 'Approved' || status === 'Rejected' || status === 'Cancelled') {
    output += `Reviewed By: ${approvedByStr}\n`;
    output += `Reviewed At: ${approvedAtStr}\n`;
    if (record.reviewer_notes) {
      output += `Reviewer Notes: ${record.reviewer_notes}\n`;
    }
  }

  return output;
};

/**
 * Triggers a browser download for a text file.
 * @param filename - The desired filename for the download (e.g., "export.txt").
 * @param content - The string content of the file.
 */
export const downloadTextFile = (filename: string, content: string): void => {
  try {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element); // Clean up
    URL.revokeObjectURL(element.href); // Free up memory
  } catch (error) {
    console.error("Error triggering text file download:", error);
    // Fallback or alert user, e.g.
    alert("Could not automatically download the file. Your browser might be blocking it, or an error occurred.");
  }
};
