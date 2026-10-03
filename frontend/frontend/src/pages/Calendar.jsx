import { useEffect, useMemo, useState } from "react";
import {
  FiX,
  FiCalendar,
  FiClock,
  FiUser,
  FiMapPin,
  FiBriefcase,
  FiCheckCircle,
  FiActivity,
  FiMap,
  FiRefreshCw,
  FiFilter,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiAlertCircle,
} from "react-icons/fi";

import api from "../api";

// =====================================================
// MAIN PAGE
// =====================================================

function Calendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const [showTasks, setShowTasks] = useState(true);
  const [showActivities, setShowActivities] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month");

  // =========================
  // FETCH
  // =========================

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      setError("");

      const [tasksResponse, activitiesResponse] = await Promise.all([
        api.get("/tasks?limit=1000"),
        api.get("/activities?limit=1000"),
      ]);

      const tasksData = tasksResponse?.data;
      const activitiesData = activitiesResponse?.data;

      const tasks = Array.isArray(tasksData)
        ? tasksData
        : tasksData?.tasks || tasksData?.data || [];

      const activities = Array.isArray(activitiesData)
        ? activitiesData
        : activitiesData?.activities || activitiesData?.data || [];

      const taskEvents = tasks
        .filter((task) => task.dueDate)
        .map((task) => ({
          id: `task-${task._id}`,
          title: task.title,
          date: task.dueDate,
          type: "task",
          color: getTaskColor(task.status),
          task,
        }));

      const activityEvents = activities
        .filter((activity) => activity.activityDate)
        .map((activity) => ({
          id: `activity-${activity._id}`,
          title: activity.title,
          date: activity.activityDate,
          type: "activity",
          color: getActivityColor(activity.type),
          activity,
        }));

      setEvents([...taskEvents, ...activityEvents]);
    } catch (err) {
      console.error("Calendar data fetch error:", err);

      setError(
        err?.response?.data?.message || "Failed to load calendar data"
      );

      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  // =========================
  // FILTERS
  // =========================

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (event.type === "task" && !showTasks) return false;
      if (event.type === "activity" && !showActivities) return false;
      return true;
    });
  }, [events, showTasks, showActivities]);

  const taskCount = useMemo(
    () => events.filter((e) => e.type === "task").length,
    [events]
  );

  const activityCount = useMemo(
    () => events.filter((e) => e.type === "activity").length,
    [events]
  );

  const activeFilterCount = useMemo(
    () => [!showTasks, !showActivities].filter(Boolean).length,
    [showTasks, showActivities]
  );

  // =========================
  // CALENDAR MATH
  // =========================

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthLabel = currentDate.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay();
    const startDate = new Date(year, month, 1 - startDay);

    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }

    return days;
  }, [year, month]);

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const eventsByDate = useMemo(() => {
    const map = {};

    filteredEvents.forEach((event) => {
      if (!event.date) return;

      const d = new Date(event.date);
      if (Number.isNaN(d.getTime())) return;

      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

      if (!map[key]) map[key] = [];
      map[key].push(event);
    });

    return map;
  }, [filteredEvents]);

  const getEventsForDay = (day) => {
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    return eventsByDate[key] || [];
  };

  const today = new Date();
  const todayEventsCount = getEventsForDay(today).length;
  const monthEventsCount = useMemo(() => {
    return filteredEvents.filter((e) => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
  }, [filteredEvents, month, year]);

  // =========================
  // HANDLERS
  // =========================

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event) => {
    setSelectedEvent({
      type: event.type,
      task: event.type === "task" ? event.task : undefined,
      activity: event.type === "activity" ? event.activity : undefined,
    });
  };

  const handleDayClick = (day) => {
    const dayEvents = getEventsForDay(day);
    if (dayEvents.length > 0) {
      setSelectedDay({ day, events: dayEvents });
    }
  };

  // =========================
  // RENDER
  // =========================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-blue-50/30 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* HERO HEADER */}

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue via-brand-blue-dark to-brand-blue-light p-6 sm:p-8 shadow-xl shadow-brand-blue/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm text-white flex items-center justify-center shadow-lg border border-white/10">
                <FiCalendar size={24} />
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Calendar
                </h1>

                <p className="text-sm text-brand-blue-100 mt-1">
                  Manage tasks and activities from one place
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <HeroStat
                label="This Month"
                value={monthEventsCount}
                accent="blue"
              />

              <HeroStat
                label="Today"
                value={todayEventsCount}
                accent="emerald"
              />

              <HeroStat
                label="Total"
                value={events.length}
                accent="purple"
              />
            </div>
          </div>
        </div>

        {/* ACTION BAR */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
              <ViewTab
                active={view === "month"}
                onClick={() => setView("month")}
              >
                Month
              </ViewTab>

              <ViewTab
                active={view === "list"}
                onClick={() => setView("list")}
              >
                List
              </ViewTab>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <LegendChip
                color="blue"
                label={`${taskCount} Tasks`}
              />

              <LegendChip
                color="purple"
                label={`${activityCount} Activities`}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* FILTER */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3.5 h-10 text-sm font-medium rounded-xl border transition-all duration-200 ${
                  activeFilterCount > 0
                    ? "bg-brand-blue-50 text-brand-blue-dark border-brand-blue/30 shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:shadow-sm"
                }`}
              >
                <FiFilter size={14} />
                Filters

                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-brand-blue text-white rounded-full">
                    {activeFilterCount}
                  </span>
                )}

                <FiChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showFilters && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowFilters(false)}
                  />

                  <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/60 z-30 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Show on calendar
                      </p>
                    </div>

                    <div className="p-3 space-y-2">
                      <FilterToggle
                        active={showTasks}
                        onClick={() => setShowTasks((prev) => !prev)}
                        color="blue"
                        label="Tasks"
                        count={taskCount}
                      />

                      <FilterToggle
                        active={showActivities}
                        onClick={() => setShowActivities((prev) => !prev)}
                        color="purple"
                        label="Activities"
                        count={activityCount}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* REFRESH */}
            <button
              type="button"
              onClick={fetchCalendarData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 h-10 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 hover:shadow-sm"
            >
              <FiRefreshCw
                size={14}
                className={loading ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-xl shadow-sm">
            <FiAlertCircle className="flex-shrink-0 mt-0.5" size={18} />

            <p className="flex-1">{error}</p>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-800 flex-shrink-0"
            >
              <FiX size={16} />
            </button>
          </div>
        )}

        {/* CALENDAR CARD */}

        <div className="bg-white/70 backdrop-blur-sm border border-gray-200/80 rounded-2xl shadow-lg shadow-gray-200/40 overflow-hidden">
          {/* TOOLBAR */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 bg-white/50">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-600 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200 active:scale-95"
                title="Previous month"
              >
                <FiChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-600 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200 active:scale-95"
                title="Next month"
              >
                <FiChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={handleToday}
                className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200 active:scale-95"
              >
                Today
              </button>

              <div className="ml-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                  {monthLabel}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:hidden">
              <LegendChip color="blue" label={`${taskCount}`} />
              <LegendChip color="purple" label={`${activityCount}`} />
            </div>
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="h-[600px] flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-[3px] border-brand-blue-50 border-t-brand-blue rounded-full animate-spin" />
              <p className="text-sm text-gray-500 mt-4 font-medium">
                Loading calendar...
              </p>
            </div>
          ) : view === "month" ? (
            <div className="p-3 sm:p-5">
              {/* DAY HEADERS */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
                {dayNames.map((name) => (
                  <div
                    key={name}
                    className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider py-2"
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* GRID */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {calendarDays.map((day, index) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = day.getMonth() === month;
                  const isToday = isSameDay(day, today);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  return (
                    <div
                      key={index}
                      onClick={() => handleDayClick(day)}
                      className={`group relative min-h-[104px] sm:min-h-[120px] rounded-xl border p-1.5 sm:p-2.5 flex flex-col cursor-pointer transition-all duration-200 ${
                        isCurrentMonth
                          ? isToday
                            ? "bg-gradient-to-br from-brand-blue-50 to-brand-blue-100/60 border-brand-blue/40 shadow-md shadow-brand-blue/20"
                            : isWeekend
                            ? "bg-gray-50/60 border-gray-200 hover:bg-white hover:shadow-md"
                            : "bg-white border-gray-200 hover:bg-white hover:shadow-md hover:border-gray-300"
                          : "bg-gray-50/30 border-gray-100 opacity-60 hover:opacity-80"
                      }`}
                    >
                      {/* DAY HEADER */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 text-xs sm:text-sm font-bold rounded-full transition-all ${
                            isToday
                              ? "bg-brand-blue text-white shadow-sm shadow-brand-blue/40"
                              : isCurrentMonth
                              ? "text-gray-800 group-hover:bg-gray-100"
                              : "text-gray-400"
                          }`}
                        >
                          {day.getDate()}
                        </span>

                        {dayEvents.length > 0 && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              dayEvents.length > 2
                                ? "bg-brand-blue-100 text-brand-blue-dark"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* EVENTS */}
                      <div className="flex-1 space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                            className="group/event w-full text-left px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-semibold text-white truncate transition-all duration-150 hover:scale-[1.02] hover:shadow-sm flex items-center gap-1"
                            style={{ backgroundColor: event.color }}
                            title={event.title}
                          >
                            {event.type === "task" ? (
                              <FiCheckCircle
                                size={9}
                                className="flex-shrink-0"
                              />
                            ) : (
                              <FiActivity
                                size={9}
                                className="flex-shrink-0"
                              />
                            )}
                            <span className="truncate">
                              {event.title}
                            </span>
                          </button>
                        ))}

                        {dayEvents.length > 2 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDay({ day, events: dayEvents });
                            }}
                            className="w-full text-left px-2 py-0.5 rounded-md text-[10px] font-bold text-brand-blue hover:bg-brand-blue-50 transition-colors"
                          >
                            +{dayEvents.length - 2} more
                          </button>
                        )}
                      </div>

                      {/* Today indicator */}
                      {isToday && (
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* LIST VIEW */
            <div className="p-4 sm:p-6">
              {filteredEvents.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <FiCalendar size={22} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-700">
                    No events found
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...filteredEvents]
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleEventClick(event)}
                        className="w-full text-left flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: event.color }}
                        >
                          {event.type === "task" ? (
                            <FiCheckCircle size={16} />
                          ) : (
                            <FiActivity size={16} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {event.title}
                          </p>

                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                            <FiClock size={11} />
                            {new Date(event.date).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shrink-0 ${
                            event.type === "task"
                              ? "bg-brand-blue-50 text-brand-blue-dark"
                              : "bg-purple-50 text-purple-700"
                          }`}
                        >
                          {event.type}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* DAY DETAILS PANEL */}

        {selectedDay && (
          <DayDetailsPanel
            day={selectedDay.day}
            events={selectedDay.events}
            onClose={() => setSelectedDay(null)}
            onEventClick={handleEventClick}
          />
        )}

        {/* EVENT MODAL */}

        {selectedEvent && (
          <EventDetailsModal
            eventData={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </div>
    </div>
  );
}

// =====================================================
// HERO STAT
// =====================================================

function HeroStat({ label, value, accent }) {
  const accents = {
    blue: "from-brand-blue-100/30 to-brand-blue-50/30 border-brand-blue/30",
    emerald: "from-emerald-400/20 to-emerald-500/20 border-emerald-300/30",
    purple: "from-purple-400/20 to-purple-500/20 border-purple-300/30",
  };

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br backdrop-blur-sm px-4 py-3 min-w-[90px] ${
        accents[accent] || accents.blue
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
        {label}
      </p>

      <p className="text-2xl font-bold text-white mt-0.5 leading-none">
        {value}
      </p>
    </div>
  );
}

// =====================================================
// VIEW TAB
// =====================================================

function ViewTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
        active
          ? "bg-brand-blue text-white shadow-sm shadow-brand-blue/30"
          : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

// =====================================================
// LEGEND CHIP
// =====================================================

function LegendChip({ color, label }) {
  const colors = {
    blue: "bg-brand-blue-50 text-brand-blue-dark border-brand-blue/20",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };

  const dots = {
    blue: "bg-brand-blue",
    purple: "bg-purple-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
        colors[color] || colors.blue
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          dots[color] || dots.blue
        }`}
      />
      {label}
    </span>
  );
}

// =====================================================
// FILTER TOGGLE
// =====================================================

function FilterToggle({ active, onClick, color, label, count }) {
  const activeStyles = {
    blue: "bg-brand-blue-50 border-brand-blue/30",
    purple: "bg-purple-50 border-purple-200",
  };

  const dotStyles = {
    blue: active ? "bg-brand-blue" : "bg-gray-300",
    purple: active ? "bg-purple-500" : "bg-gray-300",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
        active
          ? activeStyles[color]
          : "bg-white border-gray-200 hover:bg-gray-50"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <span
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            dotStyles[color]
          }`}
        />
        {label}
      </span>

      <span
        className={`text-xs font-bold ${
          active ? "text-gray-700" : "text-gray-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// =====================================================
// DAY DETAILS PANEL
// =====================================================

function DayDetailsPanel({ day, events, onClose, onEventClick }) {
  const formattedDate = day.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-[150] bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-brand-blue-50 to-brand-blue-100/50">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">
              {events.length} {events.length === 1 ? "Event" : "Events"}
            </p>

            <h3 className="text-base font-bold text-gray-900 mt-0.5">
              {formattedDate}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-white/60 transition"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => {
                onClose();
                onEventClick(event);
              }}
              className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: event.color }}
              >
                {event.type === "task" ? (
                  <FiCheckCircle size={15} />
                ) : (
                  <FiActivity size={15} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {event.title}
                </p>

                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                  <FiClock size={10} />
                  {new Date(event.date).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// EVENT DETAILS MODAL
// =====================================================

function EventDetailsModal({ eventData, onClose }) {
  const type = eventData?.type;
  const task = eventData?.task;
  const activity = eventData?.activity;
  const data = task || activity;

  if (!data) return null;

  const isTask = type === "task";

  const formatDate = (date) => {
    if (!date) return "Not set";

    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "Not set";

    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const leadName = data.relatedLead
    ? `${data.relatedLead.firstName || ""} ${
        data.relatedLead.lastName || ""
      }`.trim()
    : "";

  const customerName = data.relatedCustomer
    ? `${data.relatedCustomer.firstName || ""} ${
        data.relatedCustomer.lastName || ""
      }`.trim()
    : "";

  const trip = data.relatedTrip || null;

  const hasRelations =
    leadName || customerName || data.relatedCompany?.name || trip;

  return (
    <div
      className="fixed inset-0 z-[200] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[540px] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div
          className={`px-5 py-4 flex items-center justify-between ${
            isTask
              ? "bg-gradient-to-r from-brand-blue-50 to-brand-blue-100/50"
              : "bg-gradient-to-r from-purple-50 to-fuchsia-50"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                isTask
                  ? "bg-gradient-to-br from-brand-blue to-brand-blue-dark text-white"
                  : "bg-gradient-to-br from-purple-500 to-purple-600 text-white"
              }`}
            >
              {isTask ? <FiCheckCircle size={18} /> : <FiActivity size={18} />}
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900">
                {isTask ? "Task Details" : "Activity Details"}
              </h2>

              <p className="text-xs text-gray-500 mt-0.5">
                {isTask ? "Task" : "Activity"} calendar event
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white/60 transition"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-wide font-bold text-gray-400 mb-1">
              Title
            </p>

            <h3 className="text-lg font-bold text-gray-900 leading-snug">
              {data.title}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoBox label="Type" value={data.type || "—"} />
            <InfoBox
              label="Status"
              value={data.status || data.outcome || "—"}
            />
          </div>

          <InfoBox
            label={isTask ? "Due Date" : "Activity Date"}
            value={formatDate(isTask ? data.dueDate : data.activityDate)}
            icon={<FiClock size={13} />}
          />

          <div className="grid grid-cols-2 gap-3">
            <InfoBox
              label={isTask ? "Assigned To" : "Created By"}
              value={isTask ? data.assignedTo?.name : data.createdBy?.name}
              icon={<FiUser size={13} />}
            />

            <InfoBox
              label="Created By"
              value={data.createdBy?.name}
              icon={<FiUser size={13} />}
            />
          </div>

          {(data.description || data.notes) && (
            <div>
              <p className="text-[11px] uppercase tracking-wide font-bold text-gray-400 mb-1.5">
                Description
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {data.description || data.notes}
              </div>
            </div>
          )}

          {hasRelations && (
            <div>
              <p className="text-[11px] uppercase tracking-wide font-bold text-gray-400 mb-2">
                CRM Relationships
              </p>

              <div className="grid grid-cols-2 gap-3">
                {leadName && (
                  <InfoBox
                    label="Lead"
                    value={leadName}
                    icon={<FiUser size={13} />}
                  />
                )}

                {customerName && (
                  <InfoBox
                    label="Customer"
                    value={customerName}
                    icon={<FiUser size={13} />}
                  />
                )}

                {data.relatedCompany?.name && (
                  <InfoBox
                    label="Company"
                    value={data.relatedCompany.name}
                    icon={<FiBriefcase size={13} />}
                  />
                )}

                {trip && (
                  <InfoBox
                    label="Trip"
                    value={trip.title || trip.tripCode}
                    icon={<FiMap size={13} />}
                  />
                )}

                {trip?.destination && (
                  <InfoBox
                    label="Destination"
                    value={trip.destination}
                    icon={<FiMapPin size={13} />}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// INFO BOX
// =====================================================

function InfoBox({ label, value, icon }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mb-1">
        {label}
      </p>

      <div className="flex items-center gap-1.5 min-w-0">
        {icon && (
          <span className="text-gray-400 flex-shrink-0">{icon}</span>
        )}

        <p className="text-sm text-gray-800 font-semibold truncate">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

// =====================================================
// COLOR HELPERS
// =====================================================

function getTaskColor(status) {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "#16a34a";
    case "in progress":
      return "#1800AC";
    case "cancelled":
      return "#6b7280";
    case "pending":
    default:
      return "#f59e0b";
  }
}

function getActivityColor(type) {
  switch ((type || "").toLowerCase()) {
    case "call":
      return "#7c3aed";
    case "email":
      return "#8b5cf6";
    case "meeting":
      return "#9333ea";
    case "whatsapp":
      return "#16a34a";
    case "payment":
      return "#059669";
    case "booking":
      return "#1800AC";
    case "quotation":
      return "#0891b2";
    default:
      return "#7c3aed";
  }
}

export default Calendar;