// src/lib/validators.ts

export interface CommandValidationResult {
  isValid: boolean;
  message?: string;
}

// Basic check for UUID format. More comprehensive regex can be used if needed.
// This regex checks for the standard xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx format.
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const validateCommand = (cmd: any): CommandValidationResult => {
  if (!cmd || typeof cmd !== 'object') {
    return { isValid: false, message: 'Invalid command object.' };
  }
  if (!cmd.command || typeof cmd.command !== 'string' || String(cmd.command).trim() === '') {
    return { isValid: false, message: 'Missing or invalid command type.' };
  }

  const commandType = String(cmd.command).trim();

  if (commandType === 'AddSchedule') {
    const requiredFields = ['day', 'time', 'level', 'subject', 'teacher_id'];
    for (const field of requiredFields) {
      if (!cmd[field] || typeof cmd[field] !== 'string' || String(cmd[field]).trim() === '') {
        return { isValid: false, message: `AddSchedule failed: Missing or empty '${field}'. Field value was: '${cmd[field]}'` };
      }
    }
    // Basic time format validation (HH:MM)
    if (cmd.time && !/^\d{2}:\d{2}$/.test(String(cmd.time).trim())) {
      return { isValid: false, message: `AddSchedule failed: Invalid time format for '${cmd.time}'. Expected HH:MM (24-hour).` };
    }
    // Check if teacher_id is a valid UUID. AI prompt now mandates UUID.
    if (cmd.teacher_id && !UUID_REGEX.test(String(cmd.teacher_id).trim())) {
      return { isValid: false, message: `AddSchedule failed: Invalid teacher_id format for '${cmd.teacher_id}'. Expected UUID.` };
    }
  } else if (commandType === 'UpdateSchedule') {
    if (!cmd.id || typeof cmd.id !== 'string' || String(cmd.id).trim() === '') {
      return { isValid: false, message: `UpdateSchedule failed: Missing or empty 'id'.` };
    }
    if (!UUID_REGEX.test(String(cmd.id).trim())) {
        return { isValid: false, message: `UpdateSchedule failed: Invalid id format for '${cmd.id}'. Expected UUID.` };
    }

    const updateFields = { ...cmd };
    delete updateFields.command;
    delete updateFields.id;
    if (Object.keys(updateFields).length === 0) {
      return { isValid: false, message: `UpdateSchedule failed for ID ${cmd.id}: No fields provided for update.` };
    }
    // Validate time format if provided for update
    if (updateFields.time && (typeof updateFields.time !== 'string' || !/^\d{2}:\d{2}$/.test(String(updateFields.time).trim()))) {
      return { isValid: false, message: `UpdateSchedule failed for ID ${cmd.id}: Invalid time format for '${updateFields.time}'. Expected HH:MM (24-hour).` };
    }
    // Validate teacher_id format if provided for update
    if (updateFields.teacher_id && (typeof updateFields.teacher_id !== 'string' || !UUID_REGEX.test(String(updateFields.teacher_id).trim()))) {
        return { isValid: false, message: `UpdateSchedule failed for ID ${cmd.id}: Invalid teacher_id format for '${updateFields.teacher_id}'. Expected UUID.` };
    }
  } else if (commandType === 'DeleteSchedule') {
    if (!cmd.id || typeof cmd.id !== 'string' || String(cmd.id).trim() === '') {
      return { isValid: false, message: `DeleteSchedule failed: Missing or empty 'id'.` };
    }
    if (!UUID_REGEX.test(String(cmd.id).trim())) {
        return { isValid: false, message: `DeleteSchedule failed: Invalid id format for '${cmd.id}'. Expected UUID.` };
    }
  } else {
    return { isValid: false, message: `Unknown command type: ${commandType}` };
  }
  return { isValid: true };
};
