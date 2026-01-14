import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar, Maximize2, X } from 'lucide-react';

export default function DashboardCalendar({ scheduledPickups = [] }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);

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
                    type: 'pickup',
                    vehicle,
                    time: vehicle.pickupTime || 'TBD'
                });
            }
        });
        return map;
    }, [scheduledPickups]);

    // Calendar helpers
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        return { daysInMonth, startingDay };
    };

    const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < startingDay; i++) {
            days.push({ day: null, key: `empty-${i}` });
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateKey = date.toDateString();
            const isToday = date.toDateString() === today.toDateString();
            const events = eventsMap[dateKey] || [];
            days.push({ day, date, dateKey, isToday, events, key: `day-${day}` });
        }
        return days;
    }, [currentDate, daysInMonth, startingDay, eventsMap, today]);

    // Get upcoming events
    const upcomingEvents = useMemo(() => {
        const events = [];
        scheduledPickups.forEach(vehicle => {
            if (vehicle.pickupDate) {
                const pickupDate = new Date(vehicle.pickupDate);
                if (pickupDate >= today) {
                    events.push({ date: pickupDate, vehicle, time: vehicle.pickupTime || 'TBD' });
                }
            }
        });
        return events.sort((a, b) => a.date - b.date);
    }, [scheduledPickups, today]);

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const weekDaysFull = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Compact Calendar Grid
    const CalendarGrid = ({ compact = false }) => (
        <div className={compact ? "p-2" : "p-4"}>
            <div className={`grid grid-cols-7 gap-0.5 mb-1`}>
                {(compact ? weekDays : weekDaysFull).map((day, i) => (
                    <div key={i} className={`text-center font-medium text-slate-500 ${compact ? 'text-[9px] py-0.5' : 'text-xs py-1'}`}>
                        {day}
                    </div>
                ))}
            </div>
            <div className={`grid grid-cols-7 ${compact ? 'gap-0.5' : 'gap-1'}`}>
                {calendarDays.map(({ day, isToday, events, key }) => (
                    <div
                        key={key}
                        className={`
                            ${compact ? 'aspect-square' : 'aspect-square'} flex flex-col items-center justify-center rounded relative
                            ${!day ? '' : 'hover:bg-slate-700/50 cursor-pointer transition-colors'}
                            ${isToday ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary/50' : 'text-slate-300'}
                            ${compact ? 'text-[10px]' : 'text-sm'}
                        `}
                    >
                        {day && (
                            <>
                                <span>{day}</span>
                                {events.length > 0 && (
                                    <div className={`absolute ${compact ? 'bottom-0' : 'bottom-0.5'} flex gap-0.5`}>
                                        {events.slice(0, 2).map((_, i) => (
                                            <div key={i} className={`${compact ? 'w-0.5 h-0.5' : 'w-1 h-1'} rounded-full bg-success`} />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <>
            {/* Compact Calendar Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="glass rounded-xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-slate-100">{monthName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={prevMonth} className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200">
                            <ChevronLeft className="h-3 w-3" />
                        </button>
                        <button onClick={nextMonth} className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200">
                            <ChevronRight className="h-3 w-3" />
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 ml-1"
                            title="Expand Calendar"
                        >
                            <Maximize2 className="h-3 w-3" />
                        </button>
                    </div>
                </div>

                <CalendarGrid compact />
            </motion.div>

            {/* Expanded Modal */}
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
                            className="glass-strong rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-primary" />
                                    <h2 className="text-lg font-bold text-slate-100">Calendar</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={goToToday} className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-300 hover:bg-slate-600/50">
                                        Today
                                    </button>
                                    <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Month Navigation */}
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/30">
                                <button onClick={prevMonth} className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200">
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <span className="text-base font-semibold text-slate-200">{monthName}</span>
                                <button onClick={nextMonth} className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200">
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Large Calendar Grid */}
                            <CalendarGrid />

                            {/* Upcoming Events */}
                            <div className="border-t border-slate-700/50 p-4 max-h-48 overflow-y-auto">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                    Upcoming Pickups ({upcomingEvents.length})
                                </h3>
                                {upcomingEvents.length > 0 ? (
                                    <div className="space-y-2">
                                        {upcomingEvents.slice(0, 8).map((event, i) => (
                                            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                                <div className="text-center min-w-[36px]">
                                                    <div className="text-base font-bold text-slate-100">{event.date.getDate()}</div>
                                                    <div className="text-[9px] text-slate-500 uppercase">
                                                        {event.date.toLocaleString('default', { month: 'short' })}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-200 truncate">
                                                        {event.vehicle.stockNumber} - {event.vehicle.year} {event.vehicle.make} {event.vehicle.model}
                                                    </p>
                                                    <p className="text-xs text-slate-500">Pickup at {event.time}</p>
                                                </div>
                                                <div className="w-2 h-2 rounded-full bg-success shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-2">No upcoming pickups</p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
