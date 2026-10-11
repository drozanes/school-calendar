"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  isBefore, 
  startOfDay 
} from "date-fns";
import { he } from "date-fns/locale";
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, BookOpen, PartyPopper, AlertCircle } from "lucide-react";
import type { ScheduleEvent, Track } from "@/utils/googleSheets";

const GRADES = ["ט", "י", "יא", "יב"];
const CLASSES = [1, 2, 3, 4, 5, 6];
const TRACKS: Array<Track | "הכל"> = ["הכל", "אור עציון", "פנמצ", "תורת עציון"];

const normalizeHebrewMonth = (m: string) => {
  const cleaned = m.trim().replace(/\s+/g, " ");
  if (cleaned === "נ יסן") return "ניסן";
  if (cleaned === "חשוון") return "חשון";
  return cleaned;
};

export default function CalendarApp() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [hebrewDates, setHebrewDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedGrade, setSelectedGrade] = useState<string>("ט");
  const [selectedClass, setSelectedClass] = useState<number>(1);
  const [selectedTrack, setSelectedTrack] = useState<Track | "הכל">("הכל");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  const isInitialized = useRef(false);

  // Load saved preferences and initialize date
  useEffect(() => {
    const savedGrade = localStorage.getItem("cal_grade");
    const savedClass = localStorage.getItem("cal_class");
    const savedTrack = localStorage.getItem("cal_track") as Track | "הכל" | null;
    const savedView = localStorage.getItem("cal_view") as "month" | "week" | null;

    queueMicrotask(() => {
      setCurrentDate(new Date());
      if (savedGrade && GRADES.includes(savedGrade)) setSelectedGrade(savedGrade);
      if (savedClass && CLASSES.includes(Number(savedClass))) setSelectedClass(Number(savedClass));
      if (savedTrack && TRACKS.includes(savedTrack)) setSelectedTrack(savedTrack);
      if (savedView === "month" || savedView === "week") setViewMode(savedView);
      isInitialized.current = true;
    });
  }, []);

  // Save preferences when changed (guarded against initial default overwrite)
  useEffect(() => {
    if (!isInitialized.current) return;
    localStorage.setItem("cal_grade", selectedGrade);
    localStorage.setItem("cal_class", selectedClass.toString());
    localStorage.setItem("cal_track", selectedTrack);
    localStorage.setItem("cal_view", viewMode);
  }, [selectedGrade, selectedClass, selectedTrack, viewMode]);

  // Fetch schedule data on mount
  useEffect(() => {
    let ignore = false;
    fetch("/api/schedule")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`שגיאה בקבלת נתונים מהשרת (${res.status})`);
        }
        return res.json();
      })
      .then((json) => {
        if (ignore) return;
        if (json.success) {
          if (Array.isArray(json.data)) {
            setEvents(json.data);
          } else {
            setEvents(json.data.events || []);
            setHebrewDates(json.data.hebrewDates || {});
          }
        } else {
          throw new Error(json.error || "שגיאה בטעינת לוח המבחנים והאירועים");
        }
      })
      .catch((err: unknown) => {
        if (ignore) return;
        console.error("Failed to fetch schedule", err);
        const message = err instanceof Error ? err.message : "שגיאה בחיבור לשרת";
        setError(message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetch("/api/schedule")
      .then(async (res) => {
        if (!res.ok) throw new Error(`שגיאה בקבלת נתונים מהשרת (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (json.success) {
          if (Array.isArray(json.data)) {
            setEvents(json.data);
          } else {
            setEvents(json.data.events || []);
            setHebrewDates(json.data.hebrewDates || {});
          }
        } else {
          throw new Error(json.error || "שגיאה בטעינת לוח המבחנים והאירועים");
        }
      })
      .catch((err: unknown) => {
        console.error("Failed to fetch schedule", err);
        const message = err instanceof Error ? err.message : "שגיאה בחיבור לשרת";
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Filtering logic
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // 1. Check Track
      if (selectedTrack !== "הכל") {
        if (!evt.tracks.includes("כללי") && !evt.tracks.includes(selectedTrack)) {
          return false;
        }
      }

      // 2. Check Grade & Class
      if (evt.grade === "כללי") return true;
      if (evt.grade !== selectedGrade) return false;
      
      // General event for the grade
      if (evt.specificClasses.length === 0) return true;
      // Specifically for this class
      if (evt.specificClasses.includes(selectedClass)) return true;
      
      return false;
    });
  }, [events, selectedTrack, selectedGrade, selectedClass]);

  // Group events by date for O(1) lookups during rendering
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const evt of filteredEvents) {
      const list = map.get(evt.date);
      if (list) {
        list.push(evt);
      } else {
        map.set(evt.date, [evt]);
      }
    }
    return map;
  }, [filteredEvents]);

  if (!currentDate) return null;

  const goNext = () => {
    setCurrentDate(viewMode === "month" ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  };
  
  const goPrev = () => {
    setCurrentDate(viewMode === "month" ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const goToday = () => {
    setCurrentDate(new Date());
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

  const extractMonth = (dateStr: string) => {
    const hebDate = hebrewDates[dateStr];
    if (!hebDate) return null;
    const parts = hebDate.trim().split(/\s+/);
    if (parts.length > 1) {
      return normalizeHebrewMonth(parts.slice(1).join(" "));
    }
    return normalizeHebrewMonth(hebDate);
  };

  const getHebrewSubtitle = () => {
    const days = viewMode === "month" 
      ? eachDayOfInterval({ start: monthStart, end: monthEnd })
      : calendarDays;
    
    if (viewMode === "month") {
      const months = new Set<string>();
      for (const d of days) {
        const h = extractMonth(format(d, "yyyy-MM-dd"));
        if (h) months.add(h);
      }
      return Array.from(months).join(" - ");
    } else {
      let firstHeb: string | null = null;
      let lastHeb: string | null = null;
      for (const d of days) {
        const h = hebrewDates[format(d, "yyyy-MM-dd")];
        if (h) {
          if (!firstHeb) firstHeb = h;
          lastHeb = h;
        }
      }
      if (firstHeb && lastHeb && firstHeb !== lastHeb) return `${firstHeb} - ${lastHeb}`;
      return firstHeb || "";
    }
  };

  const hebSubtitle = getHebrewSubtitle();
  const today = new Date();

  return (
    <div className="max-w-6xl mx-auto p-2 md:p-4">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-3 rounded-2xl shadow-sm mb-4 border border-gray-100 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2.5 rounded-full text-blue-600 hidden sm:block">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">לוח אירועים ומבחנים</h1>
            <p className="text-xs text-gray-500">שנת תשפ״ז</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
          <div className="flex bg-white rounded-lg border border-gray-300 overflow-hidden shadow-xs">
            <button 
              className={`px-3 py-1 text-sm font-medium transition-colors ${viewMode === "month" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
              onClick={() => setViewMode("month")}
              aria-pressed={viewMode === "month"}
            >
              חודש
            </button>
            <button 
              className={`px-3 py-1 text-sm font-medium border-r border-gray-300 transition-colors ${viewMode === "week" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
              onClick={() => setViewMode("week")}
              aria-pressed={viewMode === "week"}
            >
              שבוע
            </button>
          </div>

          <label className="flex items-center gap-1.5 font-medium text-gray-700 text-sm">
            שכבה:
            <select 
              className="bg-white border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedGrade} 
              onChange={e => setSelectedGrade(e.target.value)}
            >
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5 font-medium text-gray-700 text-sm">
            כיתה:
            <select 
              className="bg-white border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedClass} 
              onChange={e => setSelectedClass(Number(e.target.value))}
            >
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5 font-medium text-gray-700 text-sm">
            מסלול:
            <select 
              className="bg-white border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedTrack} 
              onChange={e => setSelectedTrack(e.target.value as Track | "הכל")}
            >
              {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center gap-1.5">
          <button 
            onClick={goPrev}
            aria-label={viewMode === "month" ? "חודש קודם" : "שבוע קודם"}
            title={viewMode === "month" ? "חודש קודם" : "שבוע קודם"}
            className="p-1.5 md:p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-700 font-bold"
          >
            <ChevronRight size={24} />
          </button>
          <button
            onClick={goToday}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors shadow-xs"
            title="חזור להיום"
            aria-label="חזור להיום"
          >
            היום
          </button>
        </div>

        <div className="flex flex-col items-center">
          <h2 className="text-lg md:text-2xl font-bold text-gray-800 capitalize text-center leading-tight">
            {viewMode === "month" ? (
              format(currentDate, "MMMM yyyy", { locale: he })
            ) : (
              `${format(startDate, "d MMMM", { locale: he })} - ${format(endDate, "d MMMM yyyy", { locale: he })}`
            )}
          </h2>
          {hebSubtitle && (
            <span className="text-sm font-medium text-gray-500 mt-0.5">
              {hebSubtitle}
            </span>
          )}
        </div>

        <button 
          onClick={goNext}
          aria-label={viewMode === "month" ? "חודש הבא" : "שבוע הבא"}
          title={viewMode === "month" ? "חודש הבא" : "שבוע הבא"}
          className="p-1.5 md:p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-700 font-bold"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center my-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={handleRetry}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
          >
            נסה שנית
          </button>
        </div>
      )}

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
                const dayEvents = eventsByDate.get(dateStr) || [];
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, today);
                const isPast = isBefore(day, startOfDay(today));
                const hebDate = hebrewDates[dateStr];

                return (
                  <div 
                    key={day.toISOString()} 
                    className={`min-h-[140px] p-2 border-b border-l border-gray-100 relative
                      ${!isCurrentMonth ? "bg-gray-50/50" : (isPast ? "bg-gray-50/30" : "bg-white")}
                      ${idx % 7 === 6 ? "border-l-0" : ""}
                      ${isPast && !isToday ? "opacity-50 grayscale-[40%]" : ""}
                    `}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                        ${isToday ? "bg-blue-600 text-white shadow-md" : (isCurrentMonth ? "text-gray-800" : "text-gray-400")}
                      `}>
                        {format(day, "d")}
                      </span>
                      {hebDate && (
                        <span className="text-[11px] font-medium text-gray-500">
                          {hebDate}
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

          {/* Mobile Calendar List View - Compact */}
          <div className="md:hidden flex flex-col gap-2.5">
            {calendarDays.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(dateStr) || [];
              const isToday = isSameDay(day, today);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isPast = isBefore(day, startOfDay(today));
              const hebDate = hebrewDates[dateStr];

              // In month view, hide empty days to save scrolling
              if (viewMode === "month" && dayEvents.length === 0) return null;
              // In week view, hide empty days from other months if they are at the edges
              if (viewMode === "week" && dayEvents.length === 0 && !isCurrentMonth) return null;

              return (
                <div 
                  key={day.toISOString() + "-mobile"} 
                  className={`p-3 rounded-xl border shadow-sm ${
                    isToday ? 'border-blue-400 bg-blue-50/40' : (isPast ? 'border-gray-200 bg-gray-50/50 opacity-60 grayscale-[30%]' : 'border-gray-200 bg-white')
                  }`}
                >
                  <div className={`flex justify-between items-center ${dayEvents.length > 0 ? 'mb-2 pb-1.5 border-b border-gray-100' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-base font-bold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                        {format(day, "EEEE", { locale: he })}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {format(day, "dd/MM")}
                      </span>
                    </div>
                    {hebDate && (
                      <span className="text-[11px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                        {hebDate}
                      </span>
                    )}
                  </div>

                  {dayEvents.length === 0 ? (
                    <div className="text-xs text-gray-400 py-1">אין אירועים ביום זה</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {dayEvents.map(evt => (
                        <div 
                          key={evt.id} 
                          className={`p-2 rounded-lg border flex gap-2 items-center ${
                            evt.type === 'מבחן' 
                              ? 'bg-red-50/50 border-red-100 text-red-900' 
                              : evt.grade === 'כללי' 
                                ? 'bg-purple-50/50 border-purple-100 text-purple-900' 
                                : 'bg-blue-50/50 border-blue-100 text-blue-900'
                          }`}
                        >
                          <div className={`flex-shrink-0 p-1 rounded-md ${
                            evt.type === 'מבחן' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {evt.type === "מבחן" ? <BookOpen size={14}/> : <PartyPopper size={14}/>}
                          </div>
                          <div className="flex flex-col justify-center min-w-0">
                            <span className="font-semibold text-xs leading-snug break-words">{evt.text}</span>
                            {!evt.tracks.includes("כללי") && (
                              <span className="text-[10px] opacity-75 font-medium">{evt.tracks.join(", ")}</span>
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
            {viewMode === "month" && calendarDays.every(day => !eventsByDate.has(format(day, "yyyy-MM-dd"))) && (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-xl border border-gray-200 shadow-inner">
                <CalendarIcon size={32} className="mx-auto text-gray-300 mb-2" />
                <span className="font-medium text-base">אין אירועים בחודש זה</span>
                <p className="text-xs opacity-75 mt-1">נסה לשנות את סינון הכיתה או המסלול</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
