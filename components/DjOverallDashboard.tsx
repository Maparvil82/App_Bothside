import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CardMetricProps {
  value: string;
  label: string;
}

interface MiniCardProps {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface DjOverallDashboardData {
  ganadoMesActual: string;
  estimadoMesActual: string;
  sesionesHechas: string;
  sesionesRestantes: string;
  horasPinchadas: string;
  horasEstimadas: string;
  promedioHora: string;
  intervaloMasComun: string;
}

interface DjOverallDashboardProps {
  data: DjOverallDashboardData;
  style?: StyleProp<ViewStyle>;
}

const CardMetric: React.FC<CardMetricProps> = ({ value, label }) => (
  <View style={styles.metricWrapper}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const MiniCard: React.FC<MiniCardProps> = ({ value, label, icon }) => (
  <View style={styles.miniCard}>

    <Text style={styles.miniValue}>{value}</Text>
    <Text style={styles.miniLabel}>{label}</Text>
  </View>
);

export const DjOverallDashboard: React.FC<DjOverallDashboardProps> = ({
  data,
  style,
}) => {
  const [showEarnings, setShowEarnings] = React.useState(false);

  const monthLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('es-ES', { month: 'long' });
    const name = formatter.format(new Date());
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, []);

  const miniCards = [
    { value: data.sesionesHechas, label: 'Sesiones hechas' },
    { value: data.sesionesRestantes, label: 'Sesiones restantes' },
    { value: data.horasPinchadas, label: 'Horas pinchadas' },
    { value: data.horasEstimadas, label: 'Horas estimadas' },
    { value: showEarnings ? data.promedioHora : '****', label: 'Promedio €/h' },
    { value: data.intervaloMasComun, label: 'Intervalo más común' },
  ];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Información {monthLabel}</Text>
        <TouchableOpacity onPress={() => setShowEarnings(!showEarnings)}>
          <Ionicons
            name={showEarnings ? "eye-outline" : "eye-off-outline"}
            size={24}
            color="rgba(255,255,255,0.8)"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.metricsRow}>
        <CardMetric
          value={showEarnings ? data.ganadoMesActual : '****'}
          label="Ganado este mes"
        />
        <CardMetric
          value={showEarnings ? data.estimadoMesActual : '****'}
          label="Estimado del mes"
        />
      </View>

      <View style={styles.separator} />

      {/* ... rest of component ... */}

      <View style={styles.miniGrid}>
        {miniCards.map((card) => (
          <MiniCard key={card.label} value={card.value} label={card.label} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#323232',
    borderRadius: 8,
    padding: 20,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionDot: {
    color: '#6B6B6B',
    fontSize: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 60,
    marginBottom: 16,
  },
  metricWrapper: {
    flex: 1,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '700',
  },
  metricLabel: {
    color: '#E0E0E0',
    fontSize: 14,
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginBottom: 18,
  },
  miniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  miniCard: {
    width: '48%',
    marginBottom: 12,
    backgroundColor: '#E6E6E6',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconDot: {
    color: '#8A8A8A',
    fontSize: 18,
  },
  miniValue: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  miniLabel: {
    color: '#7E7E7E',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});

