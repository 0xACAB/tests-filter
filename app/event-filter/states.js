'use client';
import { create } from 'zustand/index';
import { devtools } from 'zustand/middleware';
import { fetchFilteredEvents } from './actions/stats';
import { MIN_SAMPLE_SIZE_FOR_TOP_VERSIONS, TOP_VERSIONS_LIMIT, MIN_VERSION_THRESHOLD } from './globals';


const eventFilterReducer = (state, action) => {
    switch (action.type) {
        case 'version':
            const versionFilter = action.payload;
            return {
                ...state,
                filteredEvents: state.allEvents.filter((event) => {
                    const hasMatchingVersion = event.realCoefficients?.some((value) => {
                        const numericVersion = Number(value);
                        return !isNaN(numericVersion) && numericVersion.toFixed(2) === versionFilter;
                    });
                    if (!hasMatchingVersion) return false;
                })
            };
        case 'variant':
            const selectedVariant = action.payload;
            return {
                filteredEvents: state.allEvents.filter((event) => {
                    if (selectedVariant === 'home') {
                        const variantAVersion = Number(event.realCoefficients?.[0]);
                        return !isNaN(variantAVersion);
                    }
                    if (selectedVariant === 'away') {
                        const variantBVersion = Number(event.realCoefficients?.[1]);
                        return !isNaN(variantBVersion);
                    }
                })
            };
        default:
            return state;
    }
};
// store/index.js
const useExperimentStore = create()(
    devtools((set, get) => ({
        // Состояния
        selectedVersion: null,
        selectedVariant: null,
        totalEvents: 0,
        events: [],
        loading: false,
        versionStats: [],
        variantVersionStats: {},
        versionRecords: [],
        statsInitialized: false,
        minSampleSize: MIN_SAMPLE_SIZE_FOR_TOP_VERSIONS,
        topVersionsLimit: TOP_VERSIONS_LIMIT,
        minVersionThreshold: MIN_VERSION_THRESHOLD,

        // Инициализация статической статистики (вызывается один раз)
        initializeExperimentStats: (versionStats, variantVersionStats, totalEvents, versionRecords) => {
            set({
                versionStats,
                variantVersionStats,
                totalEvents,
                versionRecords,
                statsInitialized: true
            });
        },

        setSelectedVersion: (selectedVersion) => {
            set({ selectedVersion });
        },

        setSelectedVariant: (selectedVariant) => set({ selectedVariant }),

        setMinSampleSize: (value) => set({ minSampleSize: value }),
        setTopVersionsLimit: (value) => set({ topVersionsLimit: value }),
        setMinVersionThreshold: (value) => set({ minVersionThreshold: value }),

        // Асинхронная загрузка событий эксперимента с сервера
        loadEvents: async () => {
            const { selectedVersion, selectedVariant } = get();
            set({ loading: true });
            try {
                // Подготовка параметров для серверного экшена
                const params = { searchParams: { version: selectedVersion, team: selectedVariant } };
                const fetchedEvents = await fetchFilteredEvents(params);
                set({ events: fetchedEvents, loading: false });
            } catch (error) {
                console.error('Failed to load events:', error);
                set({ events: [], loading: false });
            }
        },

        filterEventsByVersion: async (version) =>
            set((state) => eventFilterReducer(state, { type: 'version', payload: version })),
        filterEventsByVariant: async (variant) =>
            set((state) => eventFilterReducer(state, { type: 'variant', payload: variant }))
    }))
);
export { useExperimentStore };
