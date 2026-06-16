// FORCH.i ORACLE — i18n System (ES, EN, PT, FR)
// Lightweight context-based translations for the app

'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// ─── Translation Keys ─────────────────────────────────────────────────────

type Locale = 'es' | 'en' | 'pt' | 'fr';

const translations = {
  es: {
    // Navigation
    'nav.home': 'Inicio',
    'nav.fixture': 'Fixture',
    'nav.forecast': 'Pronóstico',
    'nav.stats': 'Estadísticas',
    'nav.teams': 'Equipos',

    // Dashboard
    'dash.title': 'Mundial 2026',
    'dash.subtitle': 'Predicciones en tiempo real',
    'dash.live': 'En Vivo',
    'dash.upcoming': 'Próximos Partidos',
    'dash.results': 'Resultados',
    'dash.champion': 'Campeón del Mundo',
    'dash.noLive': 'No hay partidos en vivo',
    'dash.groupStage': 'Fase de Grupos',
    'dash.knockout': 'Eliminatorias',

    // Fixture
    'fixture.title': 'Fixture Completo',
    'fixture.matches': 'Partidos',
    'fixture.tables': 'Tablas',
    'fixture.top8': 'Top 8',
    'fixture.bracket': 'Bracket',
    'fixture.allPhases': 'Todos',
    'fixture.groups': 'Grupos',
    'fixture.round16': '1/16',
    'fixture.round8': '1/8',
    'fixture.quarter': '1/4',
    'fixture.semi': 'Semis',
    'fixture.final': 'Final',

    // Forecast
    'forecast.title': 'Pronóstico del Torneo',
    'forecast.subtitle': 'Simulaciones Monte Carlo',
    'forecast.run': 'Ejecutar Forecast',
    'forecast.running': 'Simulando...',
    'forecast.simCount': 'Simulaciones',
    'forecast.top8': 'Top 8 Campeones',
    'forecast.team': 'Equipo',
    'forecast.champion': 'Campeón',
    'forecast.runnerUp': 'Subcampeón',
    'forecast.third': 'Tercero',
    'forecast.advances': 'Avanza',
    'forecast.noResults': 'Ejecuta el forecast para ver resultados',

    // Stats
    'stats.title': 'Estadísticas en Vivo',
    'stats.matches': 'Partidos',
    'stats.goals': 'Goles',
    'stats.avg': 'Promedio',
    'stats.cleanSheets': 'Vallas Invictas',
    'stats.highScoring': 'Alta Anotación',
    'stats.overview': 'Resumen',
    'stats.teams': 'Equipos',
    'stats.scorers': 'Goleadores',

    // Teams
    'teams.title': '48 Equipos',
    'teams.subtitle': 'Mundial FIFA 2026',
    'teams.search': 'Buscar equipo...',
    'teams.all': 'Todos',
    'teams.elite': 'Élite',
    'teams.top': 'Top',
    'teams.competitive': 'Competitivo',
    'teams.average': 'Promedio',
    'teams.darkHorse': 'Revelación',

    // Common
    'common.loading': 'Cargando...',
    'common.error': 'Error cargando datos',
    'common.close': 'Cerrar',
    'common.back': 'Volver',
    'common.power': 'Poder',
    'common.attack': 'Ataque',
    'common.midfield': 'Medio Campo',
    'common.defense': 'Defensa',

    // Branding
    'brand.badge': 'Built with FORCH.i by Paulo Velasco',
  },
  en: {
    'nav.home': 'Home',
    'nav.fixture': 'Fixture',
    'nav.forecast': 'Forecast',
    'nav.stats': 'Stats',
    'nav.teams': 'Teams',
    'dash.title': 'World Cup 2026',
    'dash.subtitle': 'Real-time predictions',
    'dash.live': 'Live',
    'dash.upcoming': 'Upcoming Matches',
    'dash.results': 'Results',
    'dash.champion': 'World Champion',
    'dash.noLive': 'No live matches',
    'dash.groupStage': 'Group Stage',
    'dash.knockout': 'Knockout',
    'fixture.title': 'Full Fixture',
    'fixture.matches': 'Matches',
    'fixture.tables': 'Tables',
    'fixture.top8': 'Top 8',
    'fixture.bracket': 'Bracket',
    'fixture.allPhases': 'All',
    'fixture.groups': 'Groups',
    'fixture.round16': 'R32',
    'fixture.round8': 'R16',
    'fixture.quarter': 'QF',
    'fixture.semi': 'SF',
    'fixture.final': 'Final',
    'forecast.title': 'Tournament Forecast',
    'forecast.subtitle': 'Monte Carlo Simulations',
    'forecast.run': 'Run Forecast',
    'forecast.running': 'Simulating...',
    'forecast.simCount': 'Simulations',
    'forecast.top8': 'Top 8 Champions',
    'forecast.team': 'Team',
    'forecast.champion': 'Champion',
    'forecast.runnerUp': 'Runner-up',
    'forecast.third': 'Third',
    'forecast.advances': 'Advances',
    'forecast.noResults': 'Run forecast to see results',
    'stats.title': 'Live Statistics',
    'stats.matches': 'Matches',
    'stats.goals': 'Goals',
    'stats.avg': 'Average',
    'stats.cleanSheets': 'Clean Sheets',
    'stats.highScoring': 'High Scoring',
    'stats.overview': 'Overview',
    'stats.teams': 'Teams',
    'stats.scorers': 'Scorers',
    'teams.title': '48 Teams',
    'teams.subtitle': 'FIFA World Cup 2026',
    'teams.search': 'Search team...',
    'teams.all': 'All',
    'teams.elite': 'Elite',
    'teams.top': 'Top',
    'teams.competitive': 'Competitive',
    'teams.average': 'Average',
    'teams.darkHorse': 'Dark Horse',
    'common.loading': 'Loading...',
    'common.error': 'Error loading data',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.power': 'Power',
    'common.attack': 'Attack',
    'common.midfield': 'Midfield',
    'common.defense': 'Defense',
    'brand.badge': 'Built with FORCH.i by Paulo Velasco',
  },
  pt: {
    'nav.home': 'Início',
    'nav.fixture': 'Fixture',
    'nav.forecast': 'Previsão',
    'nav.stats': 'Estatísticas',
    'nav.teams': 'Equipas',
    'dash.title': 'Copa do Mundo 2026',
    'dash.subtitle': 'Previsões em tempo real',
    'dash.live': 'Ao Vivo',
    'dash.upcoming': 'Próximos Jogos',
    'dash.results': 'Resultados',
    'dash.champion': 'Campeão do Mundo',
    'dash.noLive': 'Sem jogos ao vivo',
    'dash.groupStage': 'Fase de Grupos',
    'dash.knockout': 'Eliminatórias',
    'fixture.title': 'Fixture Completo',
    'fixture.matches': 'Jogos',
    'fixture.tables': 'Classificação',
    'fixture.top8': 'Top 8',
    'fixture.bracket': 'Chaveamento',
    'fixture.allPhases': 'Todos',
    'fixture.groups': 'Grupos',
    'fixture.round16': '1/16',
    'fixture.round8': '1/8',
    'fixture.quarter': '1/4',
    'fixture.semi': 'Semis',
    'fixture.final': 'Final',
    'forecast.title': 'Previsão do Torneio',
    'forecast.subtitle': 'Simulações Monte Carlo',
    'forecast.run': 'Executar Previsão',
    'forecast.running': 'Simulando...',
    'forecast.simCount': 'Simulações',
    'forecast.top8': 'Top 8 Campeões',
    'forecast.team': 'Equipa',
    'forecast.champion': 'Campeão',
    'forecast.runnerUp': 'Vice-campeão',
    'forecast.third': 'Terceiro',
    'forecast.advances': 'Avança',
    'forecast.noResults': 'Execute a previsão para ver resultados',
    'stats.title': 'Estatísticas Ao Vivo',
    'stats.matches': 'Jogos',
    'stats.goals': 'Golos',
    'stats.avg': 'Média',
    'stats.cleanSheets': 'Jogos Sem Sofrer Golo',
    'stats.highScoring': 'Alta Anotação',
    'stats.overview': 'Resumo',
    'stats.teams': 'Equipas',
    'stats.scorers': 'Marcadores',
    'teams.title': '48 Equipas',
    'teams.subtitle': 'Copa do Mundo FIFA 2026',
    'teams.search': 'Pesquisar equipa...',
    'teams.all': 'Todas',
    'teams.elite': 'Élite',
    'teams.top': 'Top',
    'teams.competitive': 'Competitivo',
    'teams.average': 'Média',
    'teams.darkHorse': 'Revelação',
    'common.loading': 'Carregando...',
    'common.error': 'Erro ao carregar dados',
    'common.close': 'Fechar',
    'common.back': 'Voltar',
    'common.power': 'Poder',
    'common.attack': 'Ataque',
    'common.midfield': 'Médio',
    'common.defense': 'Defesa',
    'brand.badge': 'Feito com FORCH.i por Paulo Velasco',
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.fixture': 'Calendrier',
    'nav.forecast': 'Prévisions',
    'nav.stats': 'Statistiques',
    'nav.teams': 'Équipes',
    'dash.title': 'Coupe du Monde 2026',
    'dash.subtitle': 'Prédictions en direct',
    'dash.live': 'En Direct',
    'dash.upcoming': 'Prochains Matchs',
    'dash.results': 'Résultats',
    'dash.champion': 'Champion du Monde',
    'dash.noLive': 'Pas de match en direct',
    'dash.groupStage': 'Phase de Groupes',
    'dash.knockout': 'Éliminatoires',
    'fixture.title': 'Calendrier Complet',
    'fixture.matches': 'Matchs',
    'fixture.tables': 'Classement',
    'fixture.top8': 'Top 8',
    'fixture.bracket': 'Tableau',
    'fixture.allPhases': 'Tous',
    'fixture.groups': 'Groupes',
    'fixture.round16': '1/16',
    'fixture.round8': '1/8',
    'fixture.quarter': '1/4',
    'fixture.semi': 'Demi-finales',
    'fixture.final': 'Finale',
    'forecast.title': 'Prévisions du Tournoi',
    'forecast.subtitle': 'Simulations Monte Carlo',
    'forecast.run': 'Lancer les Prévisions',
    'forecast.running': 'Simulation...',
    'forecast.simCount': 'Simulations',
    'forecast.top8': 'Top 8 Champions',
    'forecast.team': 'Équipe',
    'forecast.champion': 'Champion',
    'forecast.runnerUp': 'Vice-champion',
    'forecast.third': 'Troisième',
    'forecast.advances': 'Avance',
    'forecast.noResults': 'Lancez les prévisions pour voir les résultats',
    'stats.title': 'Statistiques en Direct',
    'stats.matches': 'Matchs',
    'stats.goals': 'Buts',
    'stats.avg': 'Moyenne',
    'stats.cleanSheets': 'Clean Sheets',
    'stats.highScoring': 'Fortes Anotations',
    'stats.overview': 'Aperçu',
    'stats.teams': 'Équipes',
    'stats.scorers': 'Meilleurs buteurs',
    'teams.title': '48 Équipes',
    'teams.subtitle': 'Coupe du Monde FIFA 2026',
    'teams.search': 'Rechercher une équipe...',
    'teams.all': 'Toutes',
    'teams.elite': 'Élite',
    'teams.top': 'Top',
    'teams.competitive': 'Compétitif',
    'teams.average': 'Moyen',
    'teams.darkHorse': 'Poney noir',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur de chargement',
    'common.close': 'Fermer',
    'common.back': 'Retour',
    'common.power': 'Pouvoir',
    'common.attack': 'Attaque',
    'common.midfield': 'Milieu',
    'common.defense': 'Défense',
    'brand.badge': 'Fait avec FORCH.i par Paulo Velasco',
  },
} as const;

// ─── Context ──────────────────────────────────────────────────────────────

type TranslationKey = keyof typeof translations['es'];

interface I18nContextType {
  locale: Locale;
  t: (key: TranslationKey) => string;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'es',
  t: (k) => k,
  setLocale: () => {},
});

export function useI18n() {
  return useContext(I18nContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('forchi-locale') as Locale | null;
    if (saved && translations[saved]) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('forchi-locale', l);
  };

  const t = (key: TranslationKey): string => {
    return translations[locale]?.[key] || translations['es']?.[key] || key;
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

// ─── Language Selector Component ──────────────────────────────────────────

export function LanguageSelector() {
  const { locale, setLocale } = useI18n();

  const languages: { code: Locale; label: string; flag: string }[] = [
    { code: 'es', label: 'ES', flag: '🇪🇸' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'pt', label: 'PT', flag: '🇧🇷' },
    { code: 'fr', label: 'FR', flag: '🇫🇷' },
  ];

  return (
    <div className="flex gap-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLocale(lang.code)}
          className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
            locale === lang.code
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-500 hover:text-slate-300'
          }`}
          title={lang.label}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
}
