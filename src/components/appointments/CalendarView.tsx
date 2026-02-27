"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import Badge from "@/components/ui/Badge";

type BadgeVariant = "default" | "primary" | "accent" | "danger" | "warning" | "success";

interface Appointment {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  doctor: string;
  reason: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  patient: {
    firstName: string;
    lastName: string;
    patientNumber: string;
  };
}

const STATUS_COLORS: Record<string, BadgeVariant> = {
  SCHEDULED: "primary",
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "warning",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarView({
  appointments,
  onAppointmentClick,
}: {
  appointments: Appointment[];
  onAppointmentClick: (id: string) => void;
}) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((appt) => {
      const dateKey = appt.appointmentDate.split("T")[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(appt);
    });
    return map;
  }, [appointments]);

  const selectedAppointments = selectedDate ? (appointmentsByDate[selectedDate] || []) : [];

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    const todayStr = today.toISOString().split("T")[0];
    setSelectedDate(todayStr);
  };

  const days: (number | null)[] = [];
  // Add empty slots for days before the first day of the month
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const todayStr = today.toISOString().split("T")[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Month Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={goToPrevMonth} className="p-1.5 rounded-lg hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {new Date(currentYear, currentMonth).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button
                onClick={goToToday}
                className="text-xs font-medium text-primary bg-primary-light px-2 py-1 rounded"
              >
                Today
              </button>
            </div>
            <button onClick={goToNextMonth} className="p-1.5 rounded-lg hover:bg-gray-100">
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="h-20 border-b border-r border-gray-50" />;
              }

              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayAppointments = appointmentsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-20 border-b border-r border-gray-50 p-1 text-left transition-colors hover:bg-gray-50 ${
                    isSelected ? "bg-primary-light/50 ring-2 ring-primary ring-inset" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium ${
                        isToday
                          ? "bg-primary text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {day}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="text-[10px] font-bold text-primary bg-primary-light px-1.5 py-0.5 rounded-full">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>
                  {/* Show first 2 appointments as dots */}
                  <div className="mt-1 space-y-0.5">
                    {dayAppointments.slice(0, 2).map((appt) => (
                      <div
                        key={appt.id}
                        className={`text-[10px] truncate px-1 py-0.5 rounded ${
                          appt.status === "SCHEDULED"
                            ? "bg-primary/10 text-primary"
                            : appt.status === "COMPLETED"
                            ? "bg-success/10 text-success"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {appt.appointmentTime} {appt.patient.lastName}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <p className="text-[10px] text-gray-400 px-1">
                        +{dayAppointments.length - 2} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Detail */}
      <div>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-20">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              {selectedDate
                ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : "Select a day"}
            </h3>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {!selectedDate ? (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-gray-500">Click a day to see appointments</p>
              </div>
            ) : selectedAppointments.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-gray-500">No appointments on this day</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {selectedAppointments
                  .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
                  .map((appt) => (
                    <button
                      key={appt.id}
                      onClick={() => onAppointmentClick(appt.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          {appt.appointmentTime}
                        </div>
                        <Badge variant={STATUS_COLORS[appt.status] || "default"}>
                          {appt.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">
                        {appt.patient.firstName} {appt.patient.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{appt.doctor}</p>
                      {appt.reason && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{appt.reason}</p>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
