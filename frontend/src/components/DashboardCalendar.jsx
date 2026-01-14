import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar, Maximize2, X, ArrowLeft } from 'lucide-react';

export default function DashboardCalendar({ scheduledPickups = [] }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build events map from scheduled pickups
    const eventsMap = useMemo(() => {
        const map = {};
        scheduledPickups.forEach(vehicle => {
            if (vehicle.pickupDate) {
                const dateKey = new Date(vehicle.pickupDate).toDateString();
                if (!map[dateKey]) map[dateKey] = [];
                map[dateKey].push({
                    vehicle,
                    time: vehicle.pickupTime || '09:00'
                });
            }
        });
        return map;
    }, [scheduledPickups]);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        return { daysInMonth: lastDay.getDate(), startingDay: firstDay.getDay() };
    };

    const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    const calendarDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < startingDay; i++) days.push({ day: null, key: `e-${i}` });
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateKey = date.toDateString();
            const isToday = dateKey === today.toDateString();
            const events = eventsMap[dateKey] || [];
            days.push({ day, date, dateKey, isToday, events, key: `d-${day}` });
        }
        return days;
    }, [currentDate, daysInMonth, startingDay, eventsMap, today]);

    // Hours for day view
    const hours = Array.from({ length: 13 }, (_, i) => i + 7);

    // Get events for selected date organized by hour
    const dayEvents = useMemo(() => {
        if (!selectedDate) return {};
        const events = eventsMap[selectedDate.toDateString()] || [];
        const byHour = {};
        events.forEach(e => {
            const hour = parseInt(e.time?.split(':')[0] || '9', 10);
            if (!byHour[hour]) byHour[hour] = [];
            byHour[hour].push(e);
        });
        return byHour;
    }, [selectedDate, eventsMap]);

    const handleDayClick = (date) => {
        if (date) setSelectedDate(date);
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <>
            {/* Dashboard Widget - Proper sized card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="glass rounded-xl p-5"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold text-slate-100">Calendar</h2>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={prevMonth} className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium text-slate-300 min-w-[100px] text-center">
                            {currentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
                        </span>
                        <button onClick={nextMonth} className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 ml-2"
                            title="Expand"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {weekDays.map(d => (
                        <div key={d} className="text-center text-xs font-medium text-slate-500 py-1">{d.charAt(0)}</div>
                    ))}
                    {calendarDays.map(({ day, isToday, events, key }) => (
                        <div
                            key={key}
                            className={`
                                aspect-square flex items-center justify-center text-xs rounded-md relative
                                ${!day ? '' : 'hover:bg-slate-700/50 cursor-pointer transition-colors'}
                                ${isToday ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary/50' : 'text-slate-300'}
                            `}
                            onClick={() => day && setIsModalOpen(true)}
                        >
                            {day && (
                                <>
                                    <span>{day}</span>
                                    {events?.length > 0 && (
                                        <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-success" />
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="glass-strong rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                                <div className="flex items-center gap-2">
                                    {selectedDate && (
                                        <button onClick={() => setSelectedDate(null)} className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 mr-1">
                                            <ArrowLeft className="h-4 w-4" />
                                        </button>
                                    )}
                                    <Calendar className="h-5 w-5 text-primary" />
                                    <h2 className="text-lg font-bold text-slate-100">
                                        {selectedDate
                                            ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                                            : 'Calendar'
                                        }
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!selectedDate && (
                                        <button onClick={goToToday} className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-300 hover:bg-slate-600/50">
                                            Today
                                        </button>
                                    )}
                                    <button onClick={() => { setIsModalOpen(false); setSelectedDate(null); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {selectedDate ? (
                                /* Day View */
                                <div className="flex-1 overflow-y-auto p-4">
                                    <div className="space-y-1">
                                        {hours.map(hour => {
                                            const hourEvents = dayEvents[hour] || [];
                                            const timeLabel = hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
                                            return (
                                                <div key={hour} className="flex gap-3 py-2 border-b border-slate-700/30">
                                                    <div className="w-14 text-xs text-slate-500 shrink-0 pt-0.5">{timeLabel}</div>
                                                    <div className="flex-1 min-h-[24px]">
                                                        {hourEvents.map((e, i) => (
                                                            <div key={i} className="text-sm bg-success/20 text-success border border-success/30 rounded px-2 py-1 mb-1">
                                                                <span className="font-medium">{e.vehicle.stockNumber}</span>
                                                                <span className="text-success/70 ml-2 text-xs">
                                                                    {e.vehicle.year} {e.vehicle.make} {e.vehicle.model}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                /* Month View */
                                <>
                                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800/30">
                                        <button onClick={prevMonth} className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200">
                                            <ChevronLeft className="h-5 w-5" />
                                        </button>
                                        <span className="text-base font-semibold text-slate-200">{monthName}</span>
                                        <button onClick={nextMonth} className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200">
                                            <ChevronRight className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="p-4">
                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                            {weekDays.map(d => (
                                                <div key={d} className="text-center text-xs font-medium text-slate-500 py-1">{d}</div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {calendarDays.map(({ day, date, isToday, events, key }) => (
                                                <div
                                                    key={key}
                                                    onClick={() => day && handleDayClick(date)}
                                                    className={`
                                                        aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative cursor-pointer transition-colors
                                                        ${!day ? '' : 'hover:bg-slate-700/50'}
                                                        ${isToday ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary/50' : 'text-slate-300'}
                                                    `}
                                                >
                                                    {day && (
                                                        <>
                                                            <span>{day}</span>
                                                            {events?.length > 0 && (
                                                                <div className="absolute bottom-1 flex gap-0.5">
                                                                    {events.slice(0, 3).map((_, i) => (
                                                                        <div key={i} className="w-1 h-1 rounded-full bg-success" />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
