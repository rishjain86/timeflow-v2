import prisma from '../../lib/prisma';
import { GetBillingReviewQuery } from './billing-review.schema';

// Helper function to evaluate status (Architectural improvement applied)
const evaluateBillingStatus = (session: any) => {
  if (!session.attendance || session.attendance.status !== 'PRESENT') {
    return { status: 'missing_attendance' as const, color: 'Red' as const };
  } 
  
  if (!session.clinicalNote || !session.clinicalNote.isApproved) {
    return { status: 'cnr_pending' as const, color: 'Yellow' as const };
  } 
  
  return { status: 'ready' as const, color: 'Green' as const };
};

export const getBillingDashboardStats = async (filters: GetBillingReviewQuery) => {
  const { startDate, endDate, therapistId, statusFilter } = filters;

  // 1. Build Prisma Where Clause dynamically using exact approved schema fields
  const whereClause: any = {};
  
  if (startDate && endDate) {
    whereClause.startTime = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }
  
  if (therapistId) {
    whereClause.therapistId = therapistId;
  }

  // 2. Fetch raw appointments with proper relations
  const appointments = await prisma.appointment.findMany({
    where: whereClause,
    include: {
      therapist: { 
        include: { user: true } // Correct therapist -> user relation
      },
      client: true,             // Assuming client.name is directly on Client model
      attendance: true,
      clinicalNote: true,       // Correct CNR relation name
    },
    orderBy: { startTime: 'desc' }, // Used startTime instead of appointmentDate
  });

  // 3. Evaluate Status and Build Dashboard Data
  let summary = {
    total: 0,
    ready: 0,
    missingAttendance: 0,
    cnrPending: 0,
  };

  const evaluatedSessions = appointments.map((session) => {
    // Call the helper function for clean evaluation
    const { status, color } = evaluateBillingStatus(session);

    // Update summary metrics
    if (status === 'missing_attendance') summary.missingAttendance++;
    else if (status === 'cnr_pending') summary.cnrPending++;
    else if (status === 'ready') summary.ready++;
    
    summary.total++;

    return {
      id: session.id,
      date: session.startTime,
      clientName: session.client.name, // Correct client field
      therapistName: `${session.therapist.user.firstName} ${session.therapist.user.lastName}`, // Correct nested user fields
      status,
      color,
      attendanceId: session.attendance?.id || null,
      clinicalNoteId: session.clinicalNote?.id || null, // Correct CNR ID
    };
  });

  // 4. Apply Post-Evaluation Status Filter
  const filteredSessions = statusFilter 
    ? evaluatedSessions.filter(session => session.status === statusFilter)
    : evaluatedSessions;

  return {
    summary,
    sessions: filteredSessions,
  };
};
