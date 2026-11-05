'use client';

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  MapPin, 
  MoreVertical, 
  PlusCircle,
  FileText
} from 'lucide-react';

// Shadcn UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

// Components & Mock Data
import { BookSessionModal } from '@/features/patient/components/book-session-modal';

// Mock Data for UI scaffolding
const upcomingAppointments = [
  {
    id: 'apt_1',
    type: 'Cognitive Behavioral Therapy',
    provider: 'Dr. Emily Chen',
    date: 'Thursday, Aug 15, 2026',
    time: '10:00 AM - 10:45 AM',
    modality: 'Telehealth',
    status: 'CONFIRMED',
  },
  {
    id: 'apt_2',
    type: 'Follow-up Session',
    provider: 'Dr. Emily Chen',
    date: 'Thursday, Aug 29, 2026',
    time: '10:00 AM - 10:45 AM',
    modality: 'Telehealth',
    status: 'SCHEDULED',
  }
];

const pastAppointments = [
  {
    id: 'apt_3',
    type: 'Initial Intake',
    provider: 'Dr. Emily Chen',
    date: 'Thursday, Aug 1, 2026',
    time: '10:00 AM - 11:00 AM',
    modality: 'In-Person',
    status: 'COMPLETED',
  }
];

export default function PatientAppointmentsPage() {
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">My Appointments</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your upcoming sessions and view past appointment history.
          </p>
        </div>
        <button onClick={() => setIsBookModalOpen(true)} className="btn-primary shrink-0 w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Book New Session
        </button>
      </div>

      {/* Tabs for Upcoming vs Past */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-6 bg-card border border-border h-[48px] p-1 rounded-[12px]">
          <TabsTrigger 
            value="upcoming" 
            className="rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all"
          >
            Upcoming
          </TabsTrigger>
          <TabsTrigger 
            value="past" 
            className="rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all"
          >
            Past History
          </TabsTrigger>
        </TabsList>
        
        {/* UPCOMING APPOINTMENTS TAB */}
        <TabsContent value="upcoming" className="space-y-4">
          {upcomingAppointments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="enterprise-card p-0 overflow-hidden border-l-4 border-l-primary group flex flex-col">
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-foreground group-hover:text-info transition-colors">{apt.type}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">with {apt.provider}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="btn-ghost h-8 w-8 p-0 -mt-1 -mr-2 hover:bg-accent rounded-md transition-colors opacity-80 group-hover:opacity-100">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4 text-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 border-border rounded-[12px] bg-card shadow-xl text-foreground">
                          <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-foreground">Reschedule</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium transition-colors">Cancel Appointment</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{apt.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{apt.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {apt.modality === 'Telehealth' ? (
                          <Video className="h-4 w-4 text-primary" />
                        ) : (
                          <MapPin className="h-4 w-4 text-primary" />
                        )}
                        <span className="font-medium text-foreground">{apt.modality}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 border-t border-border p-4 flex justify-between items-center">
                    <span className={`badge-base ${apt.status === 'CONFIRMED' ? 'badge-paid' : 'badge-pending'}`}>
                      {apt.status}
                    </span>
                    
                    {apt.modality === 'Telehealth' && (
                      <button className="btn-primary h-9 px-4 text-sm flex items-center shadow-md">
                        <Video className="mr-2 h-4 w-4 fill-current" /> Join
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-[16px] border border-dashed border-border shadow-sm">
              <div className="bg-accent w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <CalendarIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No upcoming appointments</h3>
              <p className="text-muted-foreground mt-1 text-sm">You don't have any scheduled sessions at the moment.</p>
              <button onClick={() => setIsBookModalOpen(true)} className="btn-secondary mt-6">
                <PlusCircle className="mr-2 h-4 w-4" /> Book a Session
              </button>
            </div>
          )}
        </TabsContent>

        {/* PAST APPOINTMENTS TAB */}
        <TabsContent value="past" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {pastAppointments.map((apt) => (
              <div key={apt.id} className="enterprise-card p-0 opacity-80 hover:opacity-100 transition-opacity flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{apt.type}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">with {apt.provider}</p>
                    </div>
                    <span className="badge-base badge-cancelled">
                      {apt.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{apt.date}</span>
                  </div>
                </div>
                <div className="bg-muted/50 border-t border-border p-3 flex justify-end">
                  <button className="btn-ghost h-8 px-3 text-sm text-info hover:text-foreground">
                    <FileText className="mr-2 h-4 w-4" /> View Notes
                  </button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

      </Tabs>

      {/* Booking Modal Integration */}
      <BookSessionModal 
        isOpen={isBookModalOpen} 
        onClose={() => setIsBookModalOpen(false)} 
      />
    </div>
  );
}
