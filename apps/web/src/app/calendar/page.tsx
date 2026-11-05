'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  User 
} from 'lucide-react';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// API Hook
import { useGetCalendarAppointments, CalendarAppointment } from '@/features/calendar/api/get-calendar-appointments';

// --- Native Date Helpers (Zero Dependency) ---
const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
  return new Date(d.setDate(diff));
};

const getDaysOfWeek = (startDate: Date) => {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });
};

const formatHour = (hour: number) => {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${ampm}`;
};

// Start calendar at 8 AM, end at 6 PM
const START_HOUR = 8;
const END_HOUR = 18;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => START_HOUR + i);

export default function CalendarPage() {
  // Local State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [selectedTherapist, setSelectedTherapist] = useState<string>('ALL');

  // Derived Date Info
  const startOfWeekDate = useMemo(() => getStartOfWeek(currentDate), [currentDate]);
  const daysOfWeek = useMemo(() => getDaysOfWeek(startOfWeekDate), [startOfWeekDate]);
  
  // Format for API (ISOs)
  const apiStartDate = startOfWeekDate.toISOString();
  const apiEndDate = new Date(daysOfWeek[6].setHours(23, 59, 59, 999)).toISOString();

  // Queries
  const { data: appointments, isLoading } = useGetCalendarAppointments({
    view,
    startDate: apiStartDate,
    endDate: apiEndDate,
    therapistId: selectedTherapist !== 'ALL' ? selectedTherapist : undefined,
  });

  // Handlers
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (view === 'week') newDate.setDate(newDate.getDate() - 7);
    if (view === 'day') newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'week') newDate.setDate(newDate.getDate() + 7);
    if (view === 'day') newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to position appointments on the grid
  const getAppointmentStyles = (apt: CalendarAppointment) => {
    const startDate = new Date(apt.startTime);
    const endDate = new Date(apt.endTime);
    
    // Calculate top position based on hours from START_HOUR
    const startHourNum = startDate.getHours() + (startDate.getMinutes() / 60);
    const topPosition = (startHourNum - START_HOUR) * 64; // 64px per hour (h-16)

    // Calculate height based on duration
    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const height = durationHours * 64;

    // Dark theme color mapping
    const baseColorClass = apt.colorCode 
      ? `bg-[${apt.colorCode}]/20 border-[${apt.colorCode}]/50 text-foreground` 
      : apt.status === 'COMPLETED' ? 'bg-success/20 border-success/40 text-success'
      : apt.status === 'IN_PROGRESS' ? 'bg-info/20 border-info/40 text-info'
      : 'bg-primary/20 border-primary/40 text-foreground';

    return {
      top: `${topPosition}px`,
      height: `${height}px`,
      className: `absolute left-1 right-1 rounded-[8px] border-l-4 border-t border-r border-b p-2 text-xs overflow-hidden shadow-sm transition-all hover:shadow-md cursor-pointer backdrop-blur-sm ${baseColorClass}`,
    };
  };

  return (
    <div className="timeflow-container py-6 flex flex-col space-y-6 animate-in fade-in duration-500 h-[calc(100vh-4rem)] min-h-[700px]">
      
      {/* Header Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
          <div className="flex items-center bg-card rounded-[10px] border border-border shadow-sm overflow-hidden">
            <button onClick={handlePrev} className="h-10 px-3 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors border-r border-border">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={handleToday} className="h-10 px-5 font-semibold hover:bg-accent text-foreground transition-colors border-r border-border">
              Today
            </button>
            <button onClick={handleNext} className="h-10 px-3 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground min-w-[200px]">
            {startOfWeekDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <Select value={selectedTherapist} onValueChange={setSelectedTherapist}>
            <SelectTrigger className="w-full sm:w-[200px] h-10 bg-card border-border text-foreground rounded-[10px] focus:ring-primary transition-all">
              <User className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Therapists" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground rounded-[12px] shadow-xl">
              <SelectItem value="ALL" className="focus:bg-accent focus:text-foreground cursor-pointer">All Therapists</SelectItem>
              <SelectItem value="T-01" className="focus:bg-accent focus:text-foreground cursor-pointer">Dr. Sarah Jenkins</SelectItem>
              <SelectItem value="T-02" className="focus:bg-accent focus:text-foreground cursor-pointer">Mark Ruffalo (BCBA)</SelectItem>
            </SelectContent>
          </Select>

          <div className="bg-card p-1 rounded-[10px] border border-border flex items-center w-full sm:w-auto justify-between sm:justify-start">
            {(['day', 'week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`h-8 px-4 rounded-[6px] capitalize text-sm font-medium transition-all ${
                  view === v 
                    ? 'bg-accent text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button className="btn-primary w-full sm:w-auto h-10">
            <Plus className="w-4 h-4 mr-2" /> New Appointment
          </button>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="enterprise-card flex-1 p-0 overflow-hidden flex flex-col min-h-0 bg-background">
        
        {/* Days Header */}
        <div className="grid grid-cols-8 border-b border-border bg-card shrink-0">
          <div className="col-span-1 border-r border-border py-3 flex items-center justify-center text-xs font-medium text-muted-foreground">
            <Clock className="w-4 h-4 mr-1" /> EST
          </div>
          {daysOfWeek.map((day, i) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={i} className="col-span-1 border-r border-border py-3 flex flex-col items-center justify-center">
                <span className={`text-xs font-semibold mb-1 ${isToday ? 'text-info' : 'text-muted-foreground'}`}>
                  {day.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()}
                </span>
                <span className={`text-base sm:text-lg flex items-center justify-center w-8 h-8 rounded-full ${isToday ? 'bg-primary text-white font-bold shadow-md' : 'text-foreground'}`}>
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Time Grid Scrollable Body */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-0 relative custom-scrollbar">
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <Skeleton className="w-[300px] h-[200px] rounded-[16px] bg-card" />
            </div>
          )}
          
          <div className="relative min-w-[800px]">
            {/* Grid Lines */}
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 h-16 border-b border-border/50 group">
                <div className="col-span-1 border-r border-border/50 relative bg-card">
                  <span className="absolute -top-2.5 right-2 text-xs text-muted-foreground pr-2 font-medium bg-card">
                    {formatHour(hour)}
                  </span>
                </div>
                {daysOfWeek.map((_, i) => (
                  <div key={i} className="col-span-1 border-r border-border/50 hover:bg-accent/30 transition-colors cursor-crosshair border-dashed" />
                ))}
              </div>
            ))}

            {/* Appointments Overlay */}
            {appointments && view === 'week' && (
              <div className="absolute top-0 left-0 right-0 bottom-0 grid grid-cols-8 pointer-events-none">
                <div className="col-span-1 pointer-events-none" /> {/* Spacer for Time Column */}
                
                {daysOfWeek.map((day, dayIndex) => {
                  // Filter appointments for this specific day
                  const dayAppointments = appointments.filter(apt => 
                    new Date(apt.startTime).toDateString() === day.toDateString()
                  );

                  return (
                    <div key={dayIndex} className="col-span-1 relative pointer-events-auto">
                      {dayAppointments.map(apt => {
                        const { top, height, className } = getAppointmentStyles(apt);
                        return (
                          <div 
                            key={apt.id} 
                            style={{ top, height }} 
                            className={className}
                            title={`${apt.clientName} - ${apt.serviceType}`}
                          >
                            <div className="font-bold text-foreground truncate">{apt.clientName}</div>
                            <div className="text-muted-foreground font-medium text-[10px] sm:text-xs truncate">{apt.serviceType}</div>
                            {/* Only show therapist name if duration is > 30 mins to prevent overlapping */}
                            {parseFloat(height) > 40 && (
                              <div className="text-muted-foreground/80 text-[10px] mt-1 truncate">
                                <User className="w-3 h-3 inline mr-1" />{apt.therapistName}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
