import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

export default function DashboardCalendar({ scheduledPickups = [], pendingPickups = [] }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isExpanded, setIsExpanded] = useState(false);

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

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const days = [];
        // Empty cells for days before month starts
        for (let i = 0; i < startingDay; i++) {
            days.push({ day: null, key: `empty-${i}` });
        }
        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateKey = date.toDateString();
            const isToday = date.toDateString() === today.toDateString();
            const events = eventsMap[dateKey] || [];
            days.push({ day, date, dateKey, isToday, events, key: `day-${day}` });
        }
        return days;
    }, [currentDate, daysInMonth, startingDay, eventsMap, today]);

    // Get upcoming events for expanded view
    const upcomingEvents = useMemo(() => {
        const events = [];
        scheduledPickups.forEach(vehicle => {
            if (vehicle.pickupDate) {
                const pickupDate = new Date(vehicle.pickupDate);
                if (pickupDate >= today) {
                    events.push({
                        date: pickupDate,
                        vehicle,
                        time: vehicle.pickupTime || 'TBD',
                        type: 'Scheduled Pickup'
                    });
                }
            }
        });
        return events.sort((a, b) => a.date - b.date).slice(0, 5);
    }, [scheduledPickups, today]);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-xl overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-slate-100">Calendar</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToToday}
                        className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                    >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/30">
                <button
                    onClick={prevMonth}
                    className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium text-slate-200">{monthName}</span>
                <button
                    onClick={nextMonth}
                    className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-3">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-[10px] font-medium text-slate-500 py-1">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map(({ day, isToday, events, key }) => (
                        <div
                            key={key}
                            className={`
                                aspect-square flex flex-col items-center justify-center rounded-md text-xs relative
                                ${!day ? '' : 'hover:bg-slate-700/50 cursor-pointer transition-colors'}
                                ${isToday ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary/50' : 'text-slate-300'}
                            `}
                        >
                            {day && (
                                <>
                                    <span>{day}</span>
                                    {events.length > 0 && (
                                        <div className="absolute bottom-0.5 flex gap-0.5">
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

            {/* Expanded Events List */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-700/50 overflow-hidden"
                    >
                        <div className="p-4">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                Upcoming Events
                            </h3>
                            {upcomingEvents.length > 0 ? (
                                <div className="space-y-2">
                                    {upcomingEvents.map((event, i) => (
                                        <div
                                            key={i}
                                            className="flex items-start gap-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
                                        >
                                            <div className="text-center min-w-[40px]">
                                                <div className="text-lg font-bold text-slate-100">
                                                    {event.date.getDate()}
                                                </div>
                                                <div className="text-[10px] text-slate-500 uppercase">
                                                    {event.date.toLocaleString('default', { month: 'short' })}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-200 truncate">
                                                    {event.vehicle.stockNumber} - {event.vehicle.year} {event.vehicle.make} {event.vehicle.model}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {event.type} at {event.time}
                                                </p>
                                            </div>
                                            <div className="w-2 h-2 rounded-full bg-success mt-1.5 shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 text-center py-4">
                                    No upcoming events
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
