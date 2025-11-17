import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useTheme, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface SessionRow {
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

interface SessionNoteRow {
  id: string;
  user_id: string;
  session_id: string;
  created_at: string;
  note_text?: string | null;
}

interface EnrichedSession extends SessionRow {
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

const formatCurrency = (value: number): string => {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toFixed(0)} €`;
  }
};

const formatDate = (value: string): string => {
  const d = new Date(value);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDuration = (hours: number): string => {
  if (!hours || hours <= 0) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const getMonthKey = (date: string): string => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
};

const monthLabel = (key: string): string => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
};

const SectionTitle: React.FC<{ icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionHeaderLeft}>
        <Ionicons name={icon} size={18} color={colors.text} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
};

const MiniBarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value));
  if (max <= 0) return null;
  return (
    <View style={styles.chartRow}>
      {data.map((d) => (
        <View key={d.label} style={styles.chartBarContainer}>
          <View style={[styles.chartBar, { height: `${Math.max(10, (d.value / max) * 100)}%` }]} />
          <Text style={styles.chartLabel} numberOfLines={1}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
};

const LegendRow: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (!total) return null;
  return (
    <View style={styles.legendContainer}>
      {data.map((d, idx) => {
        const pct = (d.value / total) * 100;
        const color = LEGEND_COLORS[idx % LEGEND_COLORS.length];
        return (
          <View key={d.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {d.label} · {pct.toFixed(0)}%
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const LEGEND_COLORS = ['#1F8D59', '#0A84FF', '#F39C12', '#9B59B6', '#E74C3C', '#16A085'];

const DjStatsDashboard: React.FC = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [notes, setNotes] = useState<SessionNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    month: 'all',
    tag: 'all',
    paymentType: 'all',
    search: '',
  });

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
        console.error('Error loading DJ stats dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const now = new Date();
  const currentMonthKey = getMonthKey(now.toISOString());
  const currentMonthNameRaw = now.toLocaleDateString('es-ES', { month: 'long' });
  const currentMonthName = currentMonthNameRaw.charAt(0).toUpperCase() + currentMonthNameRaw.slice(1);

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

    const pastSessionsCurrentMonth = validSessions.filter((s) => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      return d < today && isCurrentMonth(s.date);
    });

    const monthEarnings = pastSessionsCurrentMonth.reduce(
      (sum, s) => sum + (s.payment_amount || 0),
      0,
    );

    const currentMonthSessions = validSessions.filter((s) => isCurrentMonth(s.date));

    const monthEstimated = currentMonthSessions.reduce(
      (sum, s) => sum + (s.payment_amount || 0),
      0,
    );

    const sessionsInCurrentMonth = sessions.filter((s) => isCurrentMonth(s.date));

    const pastSessionsAllCurrentMonth = sessionsInCurrentMonth.filter((s) => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
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

  const monthlyEarnings = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => {
      if (!s.payment_amount) return;
      const key = getMonthKey(s.date);
      map.set(key, (map.get(key) || 0) + s.payment_amount);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([key, value]) => ({ label: monthLabel(key), value }));
  }, [sessions]);

  const earningsByPaymentType = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => {
      if (!s.payment_amount || !s.payment_type || s.payment_type === 'gratis') return;
      map.set(s.payment_type, (map.get(s.payment_type) || 0) + s.payment_amount);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  }, [sessions]);

  const earningsByTag = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => {
      if (!s.payment_amount || !s.tag) return;
      const key = s.tag.trim();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + s.payment_amount);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
  }, [sessions]);

  const topPlaces = useMemo(() => earningsByTag.slice(0, 5), [earningsByTag]);
  const topTags = useMemo(() => earningsByTag.slice(0, 5), [earningsByTag]);

  const topMonthsByActivity = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => {
      const key = getMonthKey(s.date);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key, value]) => ({ label: monthLabel(key), value }));
  }, [sessions]);

  const topSessionsByDuration = useMemo(() => {
    return [...sessions]
      .filter((s) => s.durationHours > 0)
      .sort((a, b) => b.durationHours - a.durationHours)
      .slice(0, 5);
  }, [sessions]);

  const uniqueMonths = useMemo(() => {
    const keys = new Set<string>();
    sessions.forEach((s) => keys.add(getMonthKey(s.date)));
    return Array.from(keys).sort().map((key) => ({ key, label: monthLabel(key) }));
  }, [sessions]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    sessions.forEach((s) => {
      if (s.tag && s.tag.trim()) tags.add(s.tag.trim());
    });
    return Array.from(tags).sort();
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filters.month !== 'all' && getMonthKey(s.date) !== filters.month) return false;
      if (filters.tag !== 'all' && (s.tag || '').trim() !== filters.tag) return false;
      if (filters.paymentType !== 'all' && s.payment_type !== filters.paymentType) return false;
      const haystack = `${s.name || ''} ${s.quick_note || ''}`.toLowerCase();
      if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [sessions, filters]);

  const notesWithSession = useMemo(() => {
    if (!notes.length) return [] as { note: SessionNoteRow; session: EnrichedSession | undefined }[];
    return notes.map((n) => ({
      note: n,
      session: sessions.find((s) => s.id === n.session_id),
    }));
  }, [notes, sessions]);

  if (!user?.id) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}> 
        <Text style={styles.loadingText}>Inicia sesión para ver tus estadísticas de DJ.</Text>
      </View>
    );
  }

  const totalHoursLast30Days = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return sessions
      .filter((s) => new Date(s.date) >= cutoff)
      .reduce((sum, s) => sum + (s.durationHours || 0), 0);
  }, [sessions]);

  const activityLevel = useMemo(() => {
    const h = totalHoursLast30Days;
    if (h >= 20) return { label: 'Nivel Pro', progress: 1 };
    if (h >= 10) return { label: 'Muy activo', progress: h / 20 };
    if (h > 0) return { label: 'Calentando', progress: h / 10 };
    return { label: 'Sin actividad reciente', progress: 0 };
  }, [totalHoursLast30Days]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando panel de DJ...</Text>
      </View>
    );
  }

  const displayName = ((user as any)?.username as string | undefined) || user?.email || 'DJ Bothside';
  const displayInitial = displayName[0]?.toUpperCase() || 'D';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}> 

      {/* Métricas rápidas */}
      <View style={styles.quickMetricsRow}>
        <View style={styles.quickMetricCard}>
          <View style={styles.quickMetricHeader}>
            <Text style={styles.quickMetricLabel}>
              Ganado en <Text style={{ fontWeight: '700' }}>{currentMonthName}</Text>
            </Text>
          </View>
          <Text style={styles.quickMetricValue}>{formatCurrency(summary.monthEarnings)}</Text>
        </View>
        <View style={styles.quickMetricCard}>
          <View style={styles.quickMetricHeader}>
            <Text style={styles.quickMetricLabel}>
              Estimado en <Text style={{ fontWeight: '700' }}>{currentMonthName}</Text>
            </Text>
          </View>
          <Text style={styles.quickMetricValue}>{formatCurrency(summary.monthEstimated)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle icon="calendar-outline" title={`Resumen ${currentMonthName}`} />
        <View style={styles.summaryStatsRow}>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatLabel}>Sesiones hechas</Text>
            <Text style={styles.summaryStatValue}>{summary.monthSessionsDone}</Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatLabel}>Sesiones restantes</Text>
            <Text style={styles.summaryStatValue}>{summary.monthSessionsRemaining}</Text>
          </View>
        </View>
        <View style={styles.summaryStatsRow}>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatLabel}>Horas pinchadas</Text>
            <Text style={styles.summaryStatValue}>{summary.monthHoursPlayed.toFixed(1)}h</Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatLabel}>Horas estimadas</Text>
            <Text style={styles.summaryStatValue}>{summary.monthHoursEstimated.toFixed(1)}h</Text>
          </View>
        </View>
        <View style={styles.summaryStatsRow}>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatLabel}>Promedio €/h (hecho)</Text>
            <Text style={styles.summaryStatValue}>{formatCurrency(summary.monthAvgPerHour || 0)}</Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatLabel}>Intervalo más común</Text>
            <Text style={styles.summaryStatValue}>
              {summary.monthMostCommonInterval || '-'}
            </Text>
          </View>
        </View>
      </View>

      {/* Resumen superior */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeaderRow}>
          <Text style={styles.summaryTitle}>Resumen de ingresos DJ</Text>
          <Ionicons name="headset-outline" size={20} color="#4A4A4A" />
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryColumnPrimary}>
            <Text style={styles.summaryLabel}>Total histórico</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalEarnings)}</Text>
          </View>
          <View style={styles.summaryColumnSecondary}>
            <Text style={styles.summaryLabel}>Mes actual</Text>
            <Text style={styles.summaryValueSecondary}>{formatCurrency(summary.monthEarnings)}</Text>
            <Text style={styles.summaryHint}>Estimado mes completo: {formatCurrency(summary.monthEstimated)}</Text>
          </View>
        </View>
        <View style={styles.summaryStatsRow}>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatLabel}>Sesiones</Text>
            <Text style={styles.summaryStatValue}>{summary.totalSessions}</Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatLabel}>Media / sesión</Text>
            <Text style={styles.summaryStatValue}>{formatCurrency(summary.avgPerSession || 0)}</Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatLabel}>Horas totales</Text>
            <Text style={styles.summaryStatValue}>{summary.totalHours.toFixed(1)}h</Text>
          </View>
        </View>
        {summary.bestSession && (
          <View style={styles.bestSessionRow}>
            <Ionicons name="star-outline" size={16} color="#F39C12" />
            <Text style={styles.bestSessionText}>
              Mejor sesión: {summary.bestSession.name} · {formatCurrency(summary.bestSession.amount)}
            </Text>
          </View>
        )}
      </View>

      {/* Gráficas */}
      <View style={styles.section}>
        <SectionTitle icon="stats-chart-outline" title="Ganancias por mes" />
        <MiniBarChart data={monthlyEarnings} />
      </View>

      <View style={styles.section}>
        <SectionTitle icon="pie-chart-outline" title="Tipo de sesión" />
        <LegendRow data={earningsByPaymentType} />
      </View>

      <View style={styles.section}>
        <SectionTitle icon="business-outline" title="Lugares más rentables" />
        <MiniBarChart data={topPlaces} />
      </View>

      {/* Rankings */}
      <View style={styles.rankingsGrid}>
        <View style={styles.rankingCard}>
          <SectionTitle icon="pin-outline" title="Top lugares" />
          {topPlaces.map((item, idx) => (
            <View key={item.label} style={styles.rankingItemRow}>
              <Text style={styles.rankingIndex}>{idx + 1}.</Text>
              <Text style={styles.rankingLabel} numberOfLines={1}>{item.label}</Text>
              <Text style={styles.rankingValue}>{formatCurrency(item.value)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.rankingCard}>
          <SectionTitle icon="pricetag-outline" title="Top tags rentables" />
          {topTags.map((item, idx) => (
            <View key={item.label} style={styles.rankingItemRow}>
              <Text style={styles.rankingIndex}>{idx + 1}.</Text>
              <Text style={styles.rankingLabel} numberOfLines={1}>{item.label}</Text>
              <Text style={styles.rankingValue}>{formatCurrency(item.value)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.rankingsGrid}>
        <View style={styles.rankingCard}>
          <SectionTitle icon="calendar-outline" title="Meses con más actividad" />
          {topMonthsByActivity.map((item, idx) => (
            <View key={item.label} style={styles.rankingItemRow}>
              <Text style={styles.rankingIndex}>{idx + 1}.</Text>
              <Text style={styles.rankingLabel} numberOfLines={1}>{item.label}</Text>
              <Text style={styles.rankingValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.rankingCard}>
          <SectionTitle icon="time-outline" title="Sesiones más largas" />
          {topSessionsByDuration.map((s, idx) => (
            <View key={s.id} style={styles.rankingItemRow}>
              <Text style={styles.rankingIndex}>{idx + 1}.</Text>
              <Text style={styles.rankingLabel} numberOfLines={1}>{s.name}</Text>
              <Text style={styles.rankingValue}>{formatDuration(s.durationHours)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Lista de sesiones */}
      <View style={styles.section}>
        <SectionTitle icon="list-outline" title="Sesiones" />

        <View style={styles.filtersRow}>
          <View style={styles.filterPill}>
            <Text style={styles.filterLabel}>Mes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, filters.month === 'all' && styles.filterChipActive]}
                onPress={() => setFilters((f) => ({ ...f, month: 'all' }))}
              >
                <Text style={styles.filterChipText}>Todos</Text>
              </TouchableOpacity>
              {uniqueMonths.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.filterChip, filters.month === m.key && styles.filterChipActive]}
                  onPress={() => setFilters((f) => ({ ...f, month: m.key }))}
                >
                  <Text style={styles.filterChipText}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.filtersRow}>
          <View style={styles.filterPill}>
            <Text style={styles.filterLabel}>Tag</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, filters.tag === 'all' && styles.filterChipActive]}
                onPress={() => setFilters((f) => ({ ...f, tag: 'all' }))}
              >
                <Text style={styles.filterChipText}>Todos</Text>
              </TouchableOpacity>
              {uniqueTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.filterChip, filters.tag === tag && styles.filterChipActive]}
                  onPress={() => setFilters((f) => ({ ...f, tag }))}
                >
                  <Text style={styles.filterChipText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterPill}>
            <Text style={styles.filterLabel}>Tipo pago</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['all', 'cerrado', 'hora', 'gratis'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterChip, filters.paymentType === type && styles.filterChipActive]}
                  onPress={() => setFilters((f) => ({ ...f, paymentType: type as any }))}
                >
                  <Text style={styles.filterChipText}>{type === 'all' ? 'Todos' : type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o nota"
            placeholderTextColor="#aaa"
            value={filters.search}
            onChangeText={(text) => setFilters((f) => ({ ...f, search: text }))}
          />
        </View>

        {filteredSessions.map((s) => (
          <View key={s.id} style={styles.sessionRow}>
            <View style={styles.sessionRowLeft}>
              <Text style={styles.sessionTitle}>{s.name}</Text>
              <Text style={styles.sessionMeta}>
                {formatDate(s.date)} · {s.tag || 'Sin tag'} · {formatDuration(s.durationHours)}
              </Text>
              {s.quick_note ? (
                <Text style={styles.sessionNote} numberOfLines={2}>
                  {s.quick_note}
                </Text>
              ) : null}
            </View>
            <Text style={styles.sessionAmount}>
              {s.payment_amount ? formatCurrency(s.payment_amount) : '-'}
            </Text>
          </View>
        ))}
      </View>

      {/* Notas del DJ */}
      <View style={styles.section}>
        <SectionTitle icon="journal-outline" title="Notas del DJ" />
        {notesWithSession.length === 0 ? (
          <Text style={styles.emptyNotesText}>Aún no tienes notas registradas en tus sesiones.</Text>
        ) : (
          notesWithSession.map(({ note, session }) => (
            <View key={note.id} style={styles.noteRow}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteDate}>{formatDate(note.created_at)}</Text>
                {session?.tag && <Text style={styles.noteTag}>{session.tag}</Text>}
              </View>
              <Text style={styles.noteSessionName}>{session?.name || 'Sesión'}</Text>
              <Text style={styles.noteContent} numberOfLines={3}>
                {note.note_text || ''}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  headerGreeting: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  headerName: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  addSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#22C55E',
  },
  addSessionText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activityRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityTextCol: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  activityValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: '#E5E7EB',
  },
  activityProgressBar: {
    flex: 1,
    maxWidth: 160,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.4)',
    overflow: 'hidden',
    flexDirection: 'row',
    marginLeft: 16,
  },
  activityProgressFill: {
    backgroundColor: '#22C55E',
    borderRadius: 999,
  },
  quickMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
  },
  quickMetricCard: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 22,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    justifyContent: 'center',
  },
  quickMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  quickMetricLabel: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  quickMetricValue: {
    marginTop: 12,
    fontSize: 40,
    fontWeight: '700',
    color: '#12bd5cff',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#555',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F5F7FB',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2933',
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  summaryColumnPrimary: {
    flex: 1.1,
  },
  summaryColumnSecondary: {
    flex: 1,
    paddingLeft: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6E7A89',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F8D59',
  },
  summaryValueSecondary: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  summaryHint: {
    fontSize: 14,
    marginTop: 2,
    color: '#6E7A89',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 12,
  },
  summaryStatItem: {
    flex: 1,
  },
  summaryStatLabel: {
    fontSize: 16,
    color: '#6E7A89',
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#12161eff',
    marginTop: 4,
  },
  bestSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  bestSessionText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6E7A89',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  chartBar: {
    width: 16,
    borderRadius: 999,
    backgroundColor: '#1F8D59',
  },
  chartLabel: {
    marginTop: 4,
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  legendContainer: {
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
  },
  rankingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
  },
  rankingCard: {
    width: '48%',
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  rankingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  rankingIndex: {
    fontSize: 12,
    color: '#9CA3AF',
    width: 18,
  },
  rankingLabel: {
    fontSize: 12,
    color: '#111827',
    flex: 1,
  },
  rankingValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F8D59',
    marginLeft: 4,
  },
  filtersRow: {
    marginTop: 10,
  },
  filterPill: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    backgroundColor: '#F9FAFB',
  },
  filterChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#1F8D59',
  },
  filterChipText: {
    fontSize: 12,
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    paddingVertical: 0,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  sessionRowLeft: {
    flex: 1,
    paddingRight: 8,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sessionMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  sessionNote: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 4,
  },
  sessionAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F8D59',
    marginLeft: 8,
  },
  emptyNotesText: {
    fontSize: 12,
    color: '#6B7280',
  },
  noteRow: {
    marginTop: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  noteTag: {
    fontSize: 11,
    color: '#1F2933',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  noteSessionName: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  noteContent: {
    marginTop: 4,
    fontSize: 12,
    color: '#4B5563',
  },
});

export default DjStatsDashboard;
