import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import Svg, { Path, G } from 'react-native-svg';
import { useTheme, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DjOverallDashboard, DjOverallDashboardData } from '../components/DjOverallDashboard';
import { useTranslation } from '../src/i18n/useTranslation';

import { useDjStats, EnrichedSession, SessionNoteRow } from '../hooks/useDjStats';





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

const formatHoursValue = (hours: number): string => {
  if (!hours || hours <= 0) return '0 h';
  if (hours >= 10) return `${Math.round(hours)} h`;
  return `${hours.toFixed(1)} h`;
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
  const { t } = useTranslation();

  const { sessions, notes, loading, summary, getMonthKey } = useDjStats();
  const [filters, setFilters] = useState({
    month: 'all',
    tag: 'all',
    paymentType: 'all',
    search: '',
  });

  const now = new Date();
  const currentMonthKey = getMonthKey(now.toISOString());
  const currentMonthNameRaw = now.toLocaleDateString('es-ES', { month: 'long' });
  const currentMonthName = currentMonthNameRaw.charAt(0).toUpperCase() + currentMonthNameRaw.slice(1);



  const overallDashboardData: DjOverallDashboardData = useMemo(() => {
    return {
      ganadoMesActual: formatCurrency(summary.monthEarnings),
      estimadoMesActual: formatCurrency(summary.monthEstimated),
      sesionesHechas: summary.monthSessionsDone.toString(),
      sesionesRestantes: summary.monthSessionsRemaining.toString(),
      horasPinchadas: formatHoursValue(summary.monthHoursPlayed),
      horasEstimadas: formatHoursValue(summary.monthHoursEstimated),
      promedioHora: summary.monthAvgPerHour > 0 ? formatCurrency(summary.monthAvgPerHour) : '0 €',
      intervaloMasComun: summary.monthMostCommonInterval ?? '–',
    };
  }, [summary]);

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
        <Text style={styles.loadingText}>{t('dj_stats_login_required')}</Text>
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
    if (h >= 20) return { label: t('dj_stats_level_pro'), progress: 1 };
    if (h >= 10) return { label: t('dj_stats_level_active'), progress: h / 20 };
    if (h > 0) return { label: t('dj_stats_level_warming_up'), progress: h / 10 };
    return { label: t('dj_stats_level_none'), progress: 0 };
  }, [totalHoursLast30Days]);

  if (loading) {
    return <BothsideLoader />;
  }

  const userFullName =
    ((user as any)?.user_metadata?.full_name as string | undefined) ||
    ((user as any)?.user_metadata?.name as string | undefined) ||
    ((user as any)?.full_name as string | undefined);
  const displayName =
    userFullName ||
    ((user as any)?.username as string | undefined) ||
    (user?.email ? user.email.split('@')[0] : 'DJ Bothside');
  const displayInitial = displayName[0]?.toUpperCase() || 'D';

  const handleAppStorePress = async () => {
    // TODO: Añadir URL de App Store cuando esté disponible
    const appStoreUrl = ''; // URL de App Store aquí

    if (!appStoreUrl) {
      console.log('URL de App Store no configurada aún');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(appStoreUrl);
      if (supported) {
        await Linking.openURL(appStoreUrl);
      } else {
        console.log('No se puede abrir la URL:', appStoreUrl);
      }
    } catch (error) {
      console.error('Error al abrir App Store:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>


        <View style={styles.overallDashboardWrapper}>
          <DjOverallDashboard data={overallDashboardData} />
        </View>

        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>{t('dj_stats_cta_title')}</Text>
          <Text style={styles.ctaText}>
            {t('dj_stats_cta_description')} <Text style={styles.ctaTextLink}>{t('dj_stats_cta_link')}</Text>.
          </Text>
          <View>
            <Svg width={120} height={40} viewBox="0 0 119.66407 40">
              <G>
                <G>
                  <Path d="M110.13477,0H9.53468c-.3667,0-.729,0-1.09473.002-.30615.002-.60986.00781-.91895.0127A13.21476,13.21476,0,0,0,5.5171.19141a6.66509,6.66509,0,0,0-1.90088.627A6.43779,6.43779,0,0,0,1.99757,1.99707,6.25844,6.25844,0,0,0,.81935,3.61816a6.60119,6.60119,0,0,0-.625,1.90332,12.993,12.993,0,0,0-.1792,2.002C.00587,7.83008.00489,8.1377,0,8.44434V31.5586c.00489.3105.00587.6113.01515.9219a12.99232,12.99232,0,0,0,.1792,2.0019,6.58756,6.58756,0,0,0,.625,1.9043A6.20778,6.20778,0,0,0,1.99757,38.001a6.27445,6.27445,0,0,0,1.61865,1.1787,6.70082,6.70082,0,0,0,1.90088.6308,13.45514,13.45514,0,0,0,2.0039.1768c.30909.0068.6128.0107.91895.0107C8.80567,40,9.168,40,9.53468,40H110.13477c.3594,0,.7246,0,1.084-.002.3047,0,.6172-.0039.9219-.0107a13.279,13.279,0,0,0,2-.1768,6.80432,6.80432,0,0,0,1.9082-.6308,6.27742,6.27742,0,0,0,1.6172-1.1787,6.39482,6.39482,0,0,0,1.1816-1.6143,6.60413,6.60413,0,0,0,.6191-1.9043,13.50643,13.50643,0,0,0,.1856-2.0019c.0039-.3106.0039-.6114.0039-.9219.0078-.3633.0078-.7246.0078-1.0938V9.53613c0-.36621,0-.72949-.0078-1.09179,0-.30664,0-.61426-.0039-.9209a13.5071,13.5071,0,0,0-.1856-2.002,6.6177,6.6177,0,0,0-.6191-1.90332,6.46619,6.46619,0,0,0-2.7988-2.7998,6.76754,6.76754,0,0,0-1.9082-.627,13.04394,13.04394,0,0,0-2-.17676c-.3047-.00488-.6172-.01074-.9219-.01269-.3594-.002-.7246-.002-1.084-.002Z" fill="#a6a6a6" />
                  <Path d="M8.44483,39.125c-.30468,0-.602-.0039-.90429-.0107a12.68714,12.68714,0,0,1-1.86914-.1631,5.88381,5.88381,0,0,1-1.65674-.5479,5.40573,5.40573,0,0,1-1.397-1.0166,5.32082,5.32082,0,0,1-1.02051-1.3965,5.72186,5.72186,0,0,1-.543-1.6572,12.41351,12.41351,0,0,1-.1665-1.875c-.00634-.2109-.01464-.9131-.01464-.9131V8.44434S.88185,7.75293.8877,7.5498a12.37039,12.37039,0,0,1,.16553-1.87207,5.7555,5.7555,0,0,1,.54346-1.6621A5.37349,5.37349,0,0,1,2.61183,2.61768,5.56543,5.56543,0,0,1,4.01417,1.59521a5.82309,5.82309,0,0,1,1.65332-.54394A12.58589,12.58589,0,0,1,7.543.88721L8.44532.875H111.21387l.9131.0127a12.38493,12.38493,0,0,1,1.8584.16259,5.93833,5.93833,0,0,1,1.6709.54785,5.59374,5.59374,0,0,1,2.415,2.41993,5.76267,5.76267,0,0,1,.5352,1.64892,12.995,12.995,0,0,1,.1738,1.88721c.0029.2832.0029.5874.0029.89014.0079.375.0079.73193.0079,1.09179V30.4648c0,.3633,0,.7178-.0079,1.0752,0,.3252,0,.6231-.0039.9297a12.73126,12.73126,0,0,1-.1709,1.8535,5.739,5.739,0,0,1-.54,1.67,5.48029,5.48029,0,0,1-1.0156,1.3857,5.4129,5.4129,0,0,1-1.3994,1.0225,5.86168,5.86168,0,0,1-1.668.5498,12.54218,12.54218,0,0,1-1.8692.1631c-.2929.0068-.5996.0107-.8974.0107l-1.084.002Z" fill="#000" />
                </G>
                <G>
                  <G>
                    <G>
                      <Path d="M24.76888,20.30068a4.94881,4.94881,0,0,1,2.35656-4.15206,5.06566,5.06566,0,0,0-3.99116-2.15768c-1.67924-.17626-3.30719,1.00483-4.1629,1.00483-.87227,0-2.18977-.98733-3.6085-.95814a5.31529,5.31529,0,0,0-4.47292,2.72787c-1.934,3.34842-.49141,8.26947,1.3612,10.97608.9269,1.32535,2.01018,2.8058,3.42763,2.7533,1.38706-.05753,1.9051-.88448,3.5794-.88448,1.65876,0,2.14479.88448,3.591.8511,1.48838-.02416,2.42613-1.33124,3.32051-2.66914a10.962,10.962,0,0,0,1.51842-3.09251A4.78205,4.78205,0,0,1,24.76888,20.30068Z" fill="#fff" />
                      <Path d="M22.03725,12.21089a4.87248,4.87248,0,0,0,1.11452-3.49062,4.95746,4.95746,0,0,0-3.20758,1.65961,4.63634,4.63634,0,0,0-1.14371,3.36139A4.09905,4.09905,0,0,0,22.03725,12.21089Z" fill="#fff" />
                    </G>
                  </G>
                  <G>
                    <Path d="M42.30227,27.13965h-4.7334l-1.13672,3.35645H34.42727l4.4834-12.418h2.083l4.4834,12.418H43.438ZM38.0591,25.59082h3.752l-1.84961-5.44727h-.05176Z" fill="#fff" />
                    <Path d="M55.15969,25.96973c0,2.81348-1.50586,4.62109-3.77832,4.62109a3.0693,3.0693,0,0,1-2.84863-1.584h-.043v4.48438h-1.8584V21.44238H48.4302v1.50586h.03418a3.21162,3.21162,0,0,1,2.88281-1.60059C53.645,21.34766,55.15969,23.16406,55.15969,25.96973Zm-1.91016,0c0-1.833-.94727-3.03809-2.39258-3.03809-1.41992,0-2.375,1.23047-2.375,3.03809,0,1.82422.95508,3.0459,2.375,3.0459C52.30227,29.01563,53.24953,27.81934,53.24953,25.96973Z" fill="#fff" />
                    <Path d="M65.12453,25.96973c0,2.81348-1.50586,4.62109-3.77832,4.62109a3.0693,3.0693,0,0,1-2.84863-1.584h-.043v4.48438h-1.8584V21.44238H58.395v1.50586h.03418A3.21162,3.21162,0,0,1,61.312,21.34766C63.60988,21.34766,65.12453,23.16406,65.12453,25.96973Zm-1.91016,0c0-1.833-.94727-3.03809-2.39258-3.03809-1.41992,0-2.375,1.23047-2.375,3.03809,0,1.82422.95508,3.0459,2.375,3.0459C62.26711,29.01563,63.21438,27.81934,63.21438,25.96973Z" fill="#fff" />
                    <Path d="M71.71047,27.03613c.1377,1.23145,1.334,2.04,2.96875,2.04,1.56641,0,2.69336-.80859,2.69336-1.91895,0-.96387-.67969-1.541-2.28906-1.93652l-1.60937-.3877c-2.28027-.55078-3.33887-1.61719-3.33887-3.34766,0-2.14258,1.86719-3.61426,4.51855-3.61426,2.624,0,4.42285,1.47168,4.4834,3.61426h-1.876c-.1123-1.23926-1.13672-1.9873-2.63379-1.9873s-2.52148.75684-2.52148,1.8584c0,.87793.6543,1.39453,2.25488,1.79l1.36816.33594c2.54785.60254,3.60645,1.626,3.60645,3.44238,0,2.32324-1.85059,3.77832-4.79395,3.77832-2.75391,0-4.61328-1.4209-4.7334-3.667Z" fill="#fff" />
                    <Path d="M83.34621,19.2998v2.14258h1.72168v1.47168H83.34621v4.99121c0,.77539.34473,1.13672,1.10156,1.13672a5.80752,5.80752,0,0,0,.61133-.043v1.46289a5.10351,5.10351,0,0,1-1.03223.08594c-1.833,0-2.54785-.68848-2.54785-2.44434V22.91406H80.16262V21.44238H81.479V19.2998Z" fill="#fff" />
                    <Path d="M86.065,25.96973c0-2.84863,1.67773-4.63867,4.29395-4.63867,2.625,0,4.29492,1.79,4.29492,4.63867,0,2.85645-1.66113,4.63867-4.29492,4.63867C87.72609,30.6084,86.065,28.82617,86.065,25.96973Zm6.69531,0c0-1.9541-.89551-3.10742-2.40137-3.10742s-2.40039,1.16211-2.40039,3.10742c0,1.96191.89453,3.10645,2.40039,3.10645S92.76027,27.93164,92.76027,25.96973Z" fill="#fff" />
                    <Path d="M96.18606,21.44238h1.77246v1.541h.043a2.1594,2.1594,0,0,1,2.17773-1.63574,2.86616,2.86616,0,0,1,.63672.06934v1.73828a2.59794,2.59794,0,0,0-.835-.1123,1.87264,1.87264,0,0,0-1.93652,2.083v5.37012h-1.8584Z" fill="#fff" />
                    <Path d="M109.3843,27.83691c-.25,1.64355-1.85059,2.77148-3.89844,2.77148-2.63379,0-4.26855-1.76465-4.26855-4.5957,0-2.83984,1.64355-4.68164,4.19043-4.68164,2.50488,0,4.08008,1.7207,4.08008,4.46582v.63672h-6.39453v.1123a2.358,2.358,0,0,0,2.43555,2.56445,2.04834,2.04834,0,0,0,2.09082-1.27344Zm-6.28223-2.70215h4.52637a2.1773,2.1773,0,0,0-2.2207-2.29785A2.292,2.292,0,0,0,103.10207,25.13477Z" fill="#fff" />
                  </G>
                </G>
                <G>
                  <G>
                    <Path d="M35.42775,11.71631c0-1.93506,1.0293-3.13037,2.6875-3.13037a2.3842,2.3842,0,0,1,2.48145,2.06787h-.92285A1.53493,1.53493,0,0,0,38.11525,9.4502c-1.07129,0-1.74121.87256-1.74121,2.26611,0,1.38965.66992,2.26172,1.74512,2.26172a1.49525,1.49525,0,0,0,1.55469-1.09961h.92285a2.32824,2.32824,0,0,1-2.47754,1.96387C36.461,14.84229,35.42775,13.64746,35.42775,11.71631Z" fill="#fff" />
                    <Path d="M41.61037,12.44434a2.13323,2.13323,0,1,1,4.24707,0,2.13358,2.13358,0,1,1-4.24707,0Zm3.333,0c0-.97607-.43848-1.54687-1.208-1.54687-.77246,0-1.207.5708-1.207,1.54688,0,.98389.43457,1.55029,1.207,1.55029C44.5049,13.99463,44.94338,13.42432,44.94338,12.44434Z" fill="#fff" />
                    <Path d="M47.04982,10.19482h.85547v.71533h.06641a1.348,1.348,0,0,1,1.34375-.80225,1.46456,1.46456,0,0,1,1.55859,1.6748v2.915h-.88867V12.00586c0-.72363-.31445-1.0835-.97168-1.0835a1.03294,1.03294,0,0,0-1.0752,1.14111v2.63428h-.88867Z" fill="#fff" />
                    <Path d="M53.89455,10.10791c1.0127,0,1.6748.47119,1.76172,1.26514h-.85254c-.082-.33057-.40527-.5415-.90918-.5415-.49609,0-.873.23535-.873.58691,0,.269.22754.43848.71582.55029l.748.17334c.85645.19873,1.25781.56689,1.25781,1.22852,0,.84766-.79,1.41406-1.86523,1.41406-1.07129,0-1.76953-.48389-1.84863-1.28174H52.919a.91365.91365,0,0,0,.97949.562c.55371,0,.94727-.248.94727-.60791,0-.26855-.21094-.44238-.66211-.5498l-.78516-.18213c-.85645-.20264-1.25293-.58691-1.25293-1.25684C52.14553,10.66992,52.877,10.10791,53.89455,10.10791Z" fill="#fff" />
                    <Path d="M56.86525,9.44189l1.03809-1.42236h1.042L57.78322,9.44189Zm.0918.75293h.88477v4.50293h-.88477Z" fill="#fff" />
                    <Path d="M59.22561,15.14844h.90918c.0752.32666.45117.5376,1.05078.5376.74023,0,1.17871-.35156,1.17871-.94678V13.875h-.06641a1.51433,1.51433,0,0,1-1.38965.75635c-1.14941,0-1.86035-.88867-1.86035-2.23682,0-1.373.71875-2.27441,1.86914-2.27441a1.56045,1.56045,0,0,1,1.41406.79395h.07031v-.71924h.85156v4.54c0,1.02979-.80664,1.68311-2.08008,1.68311C60.04787,16.418,59.32033,15.91357,59.22561,15.14844Zm3.15527-2.7583c0-.897-.46387-1.47168-1.2207-1.47168-.76465,0-1.19434.57471-1.19434,1.47168,0,.89746.42969,1.47217,1.19434,1.47217C61.9219,13.8623,62.38088,13.292,62.38088,12.39014Z" fill="#fff" />
                    <Path d="M68.46535,14.69775h-.85645v-.71533h-.07031a1.35022,1.35022,0,0,1-1.36035.80225,1.46254,1.46254,0,0,1-1.55127-1.6665V10.19482h.89014v2.69189c0,.72754.293,1.0752.94629,1.0752a1.02228,1.02228,0,0,0,1.1123-1.1333V10.19482h.88965Z" fill="#fff" />
                    <Path d="M73.689,13.48193a1.828,1.828,0,0,1-1.95117,1.30273,2.04531,2.04531,0,0,1-2.08008-2.32422,2.07685,2.07685,0,0,1,2.07617-2.35254c1.25293,0,2.00879.856,2.00879,2.27V12.688H70.563v.0498a1.1902,1.1902,0,0,0,1.19922,1.29,1.07934,1.07934,0,0,0,1.07129-.5459Zm-3.126-1.45117h2.27441a1.08647,1.08647,0,0,0-1.1084-1.1665A1.15162,1.15162,0,0,0,70.563,12.03076Z" fill="#fff" />
                    <Path d="M74.97707,8.437h.88867v6.26074h-.88867Z" fill="#fff" />
                    <Path d="M77.10109,12.44434a2.13323,2.13323,0,1,1,4.24707,0,2.13358,2.13358,0,1,1-4.24707,0Zm3.333,0c0-.97607-.43848-1.54687-1.208-1.54687-.77246,0-1.207.5708-1.207,1.54688,0,.98389.43457,1.55029,1.207,1.55029C79.99563,13.99463,80.4341,13.42432,80.4341,12.44434Z" fill="#fff" />
                    <Path d="M88.79152,13.48193a1.828,1.828,0,0,1-1.95117,1.30273,2.04531,2.04531,0,0,1-2.08008-2.32422,2.07685,2.07685,0,0,1,2.07617-2.35254c1.25293,0,2.00879.856,2.00879,2.27V12.688H85.66555v.0498a1.1902,1.1902,0,0,0,1.19922,1.29,1.07934,1.07934,0,0,0,1.07129-.5459Zm-3.126-1.45117H87.94a1.08647,1.08647,0,0,0-1.1084-1.1665A1.15162,1.15162,0,0,0,85.66555,12.03076Z" fill="#fff" />
                    <Path d="M90.03859,10.19482h.85547v.71533h.06641a1.348,1.348,0,0,1,1.34375-.80225,1.46456,1.46456,0,0,1,1.55859,1.6748v2.915h-.88867V12.00586c0-.72363-.31445-1.0835-.97168-1.0835a1.03294,1.03294,0,0,0-1.0752,1.14111v2.63428h-.88867Z" fill="#fff" />
                    <Path d="M101.48781,13.48193a1.828,1.828,0,0,1-1.95117,1.30273,2.04531,2.04531,0,0,1-2.08008-2.32422,2.07685,2.07685,0,0,1,2.07617-2.35254c1.25293,0,2.00879.856,2.00879,2.27V12.688H98.36184v.0498a1.1902,1.1902,0,0,0,1.19922,1.29,1.07934,1.07934,0,0,0,1.07129-.5459Zm-3.126-1.45117h2.27441a1.08647,1.08647,0,0,0-1.1084-1.1665A1.15162,1.15162,0,0,0,98.36184,12.03076Z" fill="#fff" />
                    <Path d="M102.7759,8.437h.88867v6.26074h-.88867Z" fill="#fff" />
                  </G>
                </G>
              </G>
            </Svg>
          </View>
        </View>
      </ScrollView>


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Espacio para el botón fijo
  },
  greetingText: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    fontSize: 24,
    fontWeight: '700',
    color: '#323232',
  },
  overallDashboardWrapper: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  ctaCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
  },
  ctaTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  ctaText: {
    color: '#D4D4D4',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
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
  ctaTextLink: {
    color: '#1F8D59',
    fontWeight: '700',
  },
  appStoreButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    ...Platform.select({
      ios: {
        paddingBottom: 34, // Safe area para iPhone con notch
      },
      android: {
        paddingBottom: 16,
      },
    }),
  },
  appStoreImage: {
    width: 120,
    height: 40,
  },
});

export default DjStatsDashboard;
