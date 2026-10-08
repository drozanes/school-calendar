"use client";

import { useState, useEffect } from "react";
import { 
  format, 
  addMonths, 
  subMonths, 
  addWeeks,
  subWeeks,
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay,
  parseISO
} from "date-fns";
import { he } from "date-fns/locale";
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, BookOpen, PartyPopper } from "lucide-react";
import type { ScheduleEvent } from "@/utils/googleSheets";

const GRADES = ["ט", "י", "יא", "יב"];
const CLASSES = [1, 2, 3, 4, 5, 6];
const TRACKS = ["הכל", "אור עציון", "פנמצ", "תורת עציון"];

export default function CalendarApp() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedGrade, setSelectedGrade] = useState<string>("ט");
  const [selectedClass, setSelectedClass] = useState<number>(1);
  const [selectedTrack, setSelectedTrack] = useState<string>("הכל");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  // Initialize date on mount (fixes prerender error)
  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  // Load saved preferences
  useEffect(() => {
    const savedGrade = localStorage.getItem("cal_grade");
    const savedClass = localStorage.getItem("cal_class");
    const savedTrack = localStorage.getItem("cal_track");
    const savedView = localStorage.getItem("cal_view") as "month" | "week";
    if (savedGrade) setSelectedGrade(savedGrade);
    if (savedClass) setSelectedClass(Number(savedClass));
    if (savedTrack) setSelectedTrack(savedTrack);
    if (savedView) setViewMode(savedView);
  }, []);

  // Save preferences when changed
  useEffect(() => {
    localStorage.setItem("cal_grade", selectedGrade);
    localStorage.setItem("cal_class", selectedClass.toString());
    localStorage.setItem("cal_track", selectedTrack);
    localStorage.setItem("cal_view", viewMode);
  }, [selectedGrade, selectedClass, selectedTrack, viewMode]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/schedule");
        const json = await res.json();
        if (json.success) {
          setEvents(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch schedule", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtering logic
  const filteredEvents = events.filter((evt) => {
    // 1. Check Track
    if (selectedTrack !== "הכל") {
      // If it has "כללי", it applies to everyone. 
      // Otherwise, it MUST explicitly include the selected track.
      if (!evt.tracks.includes("כללי") && !evt.tracks.includes(selectedTrack as any)) {
        return false;
      }
    }

    // 2. Check Grade & Class
    if (evt.grade === "כללי") return true;
    if (evt.grade !== selectedGrade) return false;
    
    // It's for the selected grade. Check specific classes
    if (evt.specificClasses.length === 0) return true; // General event for the grade
    if (evt.specificClasses.includes(selectedClass)) return true; // Specifically for this class
    
    return false; // Specifically for another class
  });

  if (!currentDate) return null;

  const goNext = () => {
    setCurrentDate(viewMode === "month" ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  };
  
  const goPrev = () => {
    setCurrentDate(viewMode === "month" ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  };

  // Calendar Grid generation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  
  // Israeli week starts on Sunday (0)
  const startDate = viewMode === "month" 
    ? startOfWeek(monthStart, { weekStartsOn: 0 }) 
    : startOfWeek(currentDate, { weekStartsOn: 0 });
    
  const endDate = viewMode === "month" 
    ? endOfWeek(monthEnd, { weekStartsOn: 0 })
    : endOfWeek(currentDate, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const today = new Date();

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm mb-6 border border-gray-100 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-full text-blue-600">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">לוח אירועים ומבחנים</h1>
            <p className="text-sm text-gray-500">מחצית א׳ - תשפ״ז</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
          <div className="flex bg-white rounded-lg border border-gray-300 overflow-hidden">
            <button 
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${viewMode === "month" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
              onClick={() => setViewMode("month")}
            >
              חודש
            </button>
            <button 
              className={`px-4 py-1.5 text-sm font-medium border-r border-gray-300 transition-colors ${viewMode === "week" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
              onClick={() => setViewMode("week")}
            >
              שבוע
            </button>
          </div>

          <label className="flex items-center gap-2 font-medium text-gray-700">
            שכבה:
            <select 
              className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedGrade} 
              onChange={e => setSelectedGrade(e.target.value)}
            >
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 font-medium text-gray-700">
            כיתה:
            <select 
              className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedClass} 
              onChange={e => setSelectedClass(Number(e.target.value))}
            >
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 font-medium text-gray-700">
            מסלול:
            <select 
              className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedTrack} 
              onChange={e => setSelectedTrack(e.target.value)}
            >
              {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex justify-between items-center mb-6 px-2">
        <button 
          onClick={goPrev}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-700 font-bold"
        >
          <ChevronRight size={24} />
        </button>
        <h2 className="text-2xl font-bold text-gray-800 capitalize text-center">
          {viewMode === "month" ? (
            format(currentDate, "MMMM yyyy", { locale: he })
          ) : (
            `${format(startDate, "d MMMM", { locale: he })} - ${format(endDate, "d MMMM yyyy", { locale: he })}`
          )}
        </h2>
        <button 
          onClick={goNext}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-700 font-bold"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Desktop Calendar Grid */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Days of week header */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"].map(day => (
                <div key={day} className="py-3 text-center font-semibold text-gray-600 text-sm">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 auto-rows-fr">
              {calendarDays.map((day, idx) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayEvents = filteredEvents.filter(e => e.date === dateStr);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, today);

                return (
                  <div 
                    key={day.toISOString()} 
                    className={`min-h-[140px] p-2 border-b border-l border-gray-100 relative
                      ${!isCurrentMonth ? "bg-gray-50/50" : "bg-white"}
                      ${idx % 7 === 0 ? "border-l-0" : ""} // Fix rightmost border in RTL
                    `}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                        ${isToday ? "bg-blue-600 text-white shadow-md" : (isCurrentMonth ? "text-gray-800" : "text-gray-400")}
                      `}>
                        {format(day, "d")}
                      </span>
                      {/* Hebrew date from events if exists for this day */}
                      {dayEvents.length > 0 && dayEvents[0].hebrewDate && (
                        <span className="text-[10px] text-gray-400">
                          {dayEvents[0].hebrewDate}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1.5 overflow-y-auto max-h-[180px] no-scrollbar">
                      {dayEvents.map(evt => (
                        <div 
                          key={evt.id} 
                          className={`text-xs p-1.5 rounded-md border flex items-start gap-1.5
                            ${evt.type === "מבחן" 
                              ? "bg-red-50 border-red-200 text-red-800" 
                              : evt.grade === "כללי" 
                                ? "bg-purple-50 border-purple-200 text-purple-800"
                                : "bg-blue-50 border-blue-200 text-blue-800"
                            }
                          `}
                        >
                          <span className="mt-0.5 opacity-70 flex-shrink-0">
                            {evt.type === "מבחן" ? <BookOpen size={12}/> : <PartyPopper size={12}/>}
                          </span>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="leading-tight break-words">{evt.text}</span>
                            {!evt.tracks.includes("כללי") && (
                              <span className="text-[9px] opacity-75 font-medium">{evt.tracks.join(", ")}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Calendar List View */}
          <div className="md:hidden flex flex-col gap-3">
            {calendarDays.map((day, idx) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayEvents = filteredEvents.filter(evt => evt.date === dateStr);
              const isToday = isSameDay(day, today);
              const isCurrentMonth = isSameMonth(day, currentDate);

              // In month view, hide empty days to save scrolling
              if (viewMode === "month" && dayEvents.length === 0) return null;
              // In week view, hide empty days from other months if they are at the edges
              if (viewMode === "week" && dayEvents.length === 0 && !isCurrentMonth) return null;

              return (
                <div 
                  key={day.toISOString() + "-mobile"} 
                  className={`p-4 rounded-xl border shadow-sm ${
                    isToday ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                        {format(day, "EEEE", { locale: he })}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {format(day, "d בMMMM", { locale: he })}
                      </span>
                    </div>
                    {dayEvents[0]?.hebrewDate && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        {dayEvents[0].hebrewDate}
                      </span>
                    )}
                  </div>

                  {dayEvents.length === 0 ? (
                    <div className="text-gray-400 text-sm py-1">אין אירועים מתוכננים</div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {dayEvents.map(evt => (
                        <div 
                          key={evt.id} 
                          className={`p-3 rounded-xl border flex gap-3 ${
                            evt.type === 'מבחן' 
                              ? 'bg-red-50/50 border-red-100 text-red-900' 
                              : evt.grade === 'כללי'
                                ? 'bg-purple-50/50 border-purple-100 text-purple-900'
                                : 'bg-blue-50/50 border-blue-100 text-blue-900'
                          }`}
                        >
                          <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-lg ${
                            evt.type === 'מבחן' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {evt.type === "מבחן" ? <BookOpen size={16}/> : <PartyPopper size={16}/>}
                          </div>
                          <div className="flex flex-col justify-center">
                            <span className="font-semibold text-sm leading-snug">{evt.text}</span>
                            {!evt.tracks.includes("כללי") && (
                              <span className="text-xs opacity-75 mt-1 font-medium">{evt.tracks.join(", ")}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* If month is completely empty */}
            {viewMode === "month" && calendarDays.every(day => filteredEvents.filter(e => e.date === format(day, "yyyy-MM-dd")).length === 0) && (
              <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-2xl border border-gray-200 shadow-inner">
                <CalendarIcon size={48} className="mx-auto text-gray-300 mb-3" />
                <span className="font-medium text-lg">אין אירועים בחודש זה</span>
                <p className="text-sm opacity-75 mt-1">נסה לשנות את סינון הכיתה או המסלול</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
