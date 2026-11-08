'use client';
import { create } from 'zustand/index';
import { devtools } from 'zustand/middleware';
import { fetchFilteredEvents } from './actions/stats';


const eventFilterReducer = (state, action) => {
    switch (action.type) {
        case 'coefficient':
            const coefficientFilter = action.payload;
            return {
                ...state,
                filteredEvents: state.allEvents.filter((event) => {
                    const hasMatchingCoefficient = event.realCoefficients?.some((value) => {
                        const numericCoefficient = Number(value);
                        return !isNaN(numericCoefficient) && numericCoefficient.toFixed(2) === coefficientFilter;
                    });
                    if (!hasMatchingCoefficient) return false;
                })
            };
        case 'variant':
            const selectedVariant = action.payload;
            return {
                filteredEvents: state.allEvents.filter((event) => {
                    if (selectedVariant === 'home') {
                        const variantACoefficient = Number(event.realCoefficients?.[0]);
                        return !isNaN(variantACoefficient);
                    }
                    if (selectedVariant === 'away') {
                        const variantBCoefficient = Number(event.realCoefficients?.[1]);
                        return !isNaN(variantBCoefficient);
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
        selectedCoefficient: null,
        selectedVariant: null,
        totalEvents: 0,
        events: [],
        loading: false,
        coefficientStats: [],
        variantCoefficientStats: {},
        statsInitialized: false,

        // Инициализация статической статистики (вызывается один раз)
        initializeExperimentStats: (coefficientStats, variantCoefficientStats, totalEvents) => {
            set({
                coefficientStats,
                variantCoefficientStats,
                totalEvents,
                statsInitialized: true
            });
        },

        setSelectedCoefficient: (selectedCoefficient) => {
            set({ selectedCoefficient });
        },

        setSelectedVariant: (selectedVariant) => set({ selectedVariant }),

        // Асинхронная загрузка событий эксперимента с сервера
        loadEvents: async () => {
            const { selectedCoefficient, selectedVariant } = get();
            set({ loading: true });
            try {
                // Подготовка параметров для серверного экшена
                const params = { searchParams: { coefficient: selectedCoefficient, team: selectedVariant } };
                const fetchedEvents = await fetchFilteredEvents(params);
                set({ events: fetchedEvents, loading: false });
            } catch (error) {
                console.error('Failed to load events:', error);
                set({ events: [], loading: false });
            }
        },

        filterEventsByCoefficient: async (coefficient) =>
            set((state) => eventFilterReducer(state, { type: 'coefficient', payload: coefficient })),
        filterEventsByVariant: async (variant) =>
            set((state) => eventFilterReducer(state, { type: 'variant', payload: variant }))
    }))
);
export { useExperimentStore };
