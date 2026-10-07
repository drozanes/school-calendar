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
      if (evt.track !== "כללי" && evt.track !== selectedTrack) {
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
          onClick={goNext}
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
          onClick={goPrev}
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
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
                  className={`min-h-[120px] p-2 border-b border-l border-gray-100 relative
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
                      <span className="text-xs text-gray-400 hidden sm:block">
                        {dayEvents[0].hebrewDate}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 overflow-y-auto max-h-[150px] no-scrollbar">
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
                        <span className="mt-0.5 opacity-70">
                          {evt.type === "מבחן" ? <BookOpen size={12}/> : <PartyPopper size={12}/>}
                        </span>
                        <span className="leading-tight break-words">{evt.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
