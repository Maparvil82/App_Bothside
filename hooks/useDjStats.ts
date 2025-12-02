import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface SessionRow {
    id: string;
    user_id: string;
    date: string;
    name: string;
    start_time: string | null;
    end_time: string | null;
    quick_note: string | null;
    tag: string | null;
    payment_type: 'cerrado' | 'hora' | 'gratis' | null;
    payment_amount: number | null;
}

export interface SessionNoteRow {
    id: string;
    user_id: string;
    session_id: string;
    created_at: string;
    note_text?: string | null;
}

export interface EnrichedSession extends SessionRow {
    durationHours: number;
}

const buildDateTimeFromParts = (baseDate: Date, time: string | null): Date | null => {
    if (!time) return null;
    const [h, m] = time.split(':').map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const d = new Date(baseDate);
    d.setHours(h, m, 0, 0);
    return d;
};

const getDurationHours = (dateString: string, start: string | null, end: string | null): number => {
    if (!start || !end) return 0;
    const baseDate = new Date(dateString);
    const startDt = buildDateTimeFromParts(baseDate, start);
    let endDt = buildDateTimeFromParts(baseDate, end);
    if (!startDt || !endDt) return 0;
    if (endDt <= startDt) {
        endDt.setDate(endDt.getDate() + 1);
    }
    const diffMs = endDt.getTime() - startDt.getTime();
    if (diffMs <= 0) return 0;
    return diffMs / (1000 * 60 * 60);
};

const getMonthKey = (date: string): string => {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
};

export const useDjStats = () => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<EnrichedSession[]>([]);
    const [notes, setNotes] = useState<SessionNoteRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!user?.id) return;
            try {
                setLoading(true);

                const { data: sessionRows, error: sessionsError } = await supabase
                    .from('sessions')
                    .select('id, user_id, date, name, start_time, end_time, quick_note, tag, payment_type, payment_amount')
                    .eq('user_id', user.id)
                    .order('date', { ascending: false });

                if (sessionsError) throw sessionsError;

                const enriched: EnrichedSession[] = (sessionRows || []).map((s: any) => ({
                    ...s,
                    durationHours: getDurationHours(s.date, s.start_time, s.end_time),
                }));

                setSessions(enriched);

                const { data: notesRows, error: notesError } = await supabase
                    .from('session_notes')
                    .select('id, user_id, session_id, created_at, note_text')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (notesError) throw notesError;
                setNotes(notesRows || []);
            } catch (error) {
                console.error('Error loading DJ stats:', error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [user?.id]);

    const now = new Date();
    const currentMonthKey = getMonthKey(now.toISOString());

    const summary = useMemo(() => {
        if (!sessions.length) {
            return {
                totalEarnings: 0,
                monthEarnings: 0,
                monthEstimated: 0,
                totalSessions: 0,
                avgPerSession: 0,
                totalHours: 0,
                monthHours: 0,
                monthSessionsDone: 0,
                monthSessionsRemaining: 0,
                monthHoursPlayed: 0,
                monthHoursEstimated: 0,
                monthAvgPerHour: 0,
                monthMostCommonInterval: null as string | null,
                bestSession: null as { name: string; amount: number } | null,
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let totalEarnings = 0;
        let totalSessions = 0;
        let totalHours = 0;
        let monthHours = 0;

        sessions.forEach((s) => {
            if (s.payment_amount && s.payment_amount > 0) {
                totalEarnings += s.payment_amount;
                totalSessions += 1;
            }
            const hours = s.durationHours || 0;
            totalHours += hours;
            if (getMonthKey(s.date) === currentMonthKey) {
                monthHours += hours;
            }
        });

        const isCurrentMonth = (dateString: string): boolean => {
            const d = new Date(dateString);
            return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        };

        const validSessions = sessions.filter((s) => {
            return (
                s.payment_type &&
                s.payment_type !== 'gratis' &&
                s.payment_amount &&
                s.payment_amount > 0
            );
        });

        let monthEarnings = 0;
        let monthEstimated = 0;

        const now = new Date();

        validSessions.forEach((s) => {
            if (!isCurrentMonth(s.date)) return;

            // monthEstimated always includes the session if it's in the current month
            monthEstimated += (s.payment_amount || 0);

            // Construct endDateTime to compare with now for monthEarnings
            const sessionDate = new Date(s.date);
            // We use the helper function but we need to handle the case where times might be null
            // If times are null, we fallback to date comparison
            if (s.start_time && s.end_time) {
                const startDt = buildDateTimeFromParts(sessionDate, s.start_time);
                let endDt = buildDateTimeFromParts(sessionDate, s.end_time);

                if (startDt && endDt) {
                    if (endDt <= startDt) {
                        endDt.setDate(endDt.getDate() + 1); // Overnight session
                    }

                    if (endDt <= now) {
                        monthEarnings += (s.payment_amount || 0);
                    }
                }
            } else {
                // Fallback: compare dates only
                const sDate = new Date(s.date);
                sDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (sDate < today) {
                    monthEarnings += (s.payment_amount || 0);
                }
            }
        });

        const currentMonthSessions = validSessions.filter((s) => isCurrentMonth(s.date));

        const sessionsInCurrentMonth = sessions.filter((s) => isCurrentMonth(s.date));

        // For session counts/hours, we can keep using the date-based logic or align it?
        // The user only specified earnings.
        // But to be consistent, "monthSessionsDone" should probably match "Ganado".
        // Let's align "monthSessionsDone" to be count of sessions that are "Ganado".

        const pastSessionsAllCurrentMonth = sessionsInCurrentMonth.filter((s) => {
            if (s.start_time && s.end_time) {
                const sessionDate = new Date(s.date);
                const startDt = buildDateTimeFromParts(sessionDate, s.start_time);
                let endDt = buildDateTimeFromParts(sessionDate, s.end_time);
                if (startDt && endDt) {
                    if (endDt <= startDt) endDt.setDate(endDt.getDate() + 1);
                    return endDt <= now;
                }
            }
            const d = new Date(s.date);
            d.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return d < today;
        });

        const monthSessionsDone = pastSessionsAllCurrentMonth.length;
        const monthSessionsTotal = sessionsInCurrentMonth.length;
        const monthSessionsRemaining = Math.max(monthSessionsTotal - monthSessionsDone, 0);

        const monthHoursPlayed = pastSessionsAllCurrentMonth.reduce(
            (sum, s) => sum + (s.durationHours || 0),
            0,
        );

        const monthHoursEstimated = sessionsInCurrentMonth.reduce(
            (sum, s) => sum + (s.durationHours || 0),
            0,
        );

        const monthAvgPerHour = monthHoursPlayed > 0 ? monthEarnings / monthHoursPlayed : 0;

        const intervalCounts = new Map<string, number>();
        pastSessionsAllCurrentMonth.forEach((s) => {
            if (!s.start_time || !s.end_time) return;
            const formatTime = (t: string) => t.slice(0, 5); // HH:MM
            const key = `${formatTime(s.start_time)} - ${formatTime(s.end_time)}`;
            intervalCounts.set(key, (intervalCounts.get(key) || 0) + 1);
        });

        let monthMostCommonInterval: string | null = null;
        let maxCount = 0;
        intervalCounts.forEach((count, key) => {
            if (count > maxCount) {
                maxCount = count;
                monthMostCommonInterval = key;
            }
        });

        const avgPerSession = totalSessions > 0 ? totalEarnings / totalSessions : 0;

        let bestSession: { name: string; amount: number } | null = null;
        sessions.forEach((s) => {
            if (s.payment_amount && s.payment_amount > 0) {
                if (!bestSession || s.payment_amount > bestSession.amount) {
                    bestSession = { name: s.name, amount: s.payment_amount };
                }
            }
        });

        return {
            totalEarnings,
            monthEarnings,
            monthEstimated,
            totalSessions,
            avgPerSession,
            totalHours,
            monthHours,
            monthSessionsDone,
            monthSessionsRemaining,
            monthHoursPlayed,
            monthHoursEstimated,
            monthAvgPerHour,
            monthMostCommonInterval,
            bestSession,
        };
    }, [sessions, currentMonthKey]);

    return {
        sessions,
        notes,
        loading,
        summary,
        getMonthKey, // Exporting helper if needed by components
    };
};
