'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useExperimentStore } from './states';
import TopVersions from './TopVersions';
import ResultsSection from './ResultsSection';
import FilterPanel from './FilterPanel';
import { fetchExperimentStats } from './actions/stats';
import eventCardConfig from '../../config/event-card.json';

const subscribeToClient = () => () => { };
const getClientStatus = () => true;
const getServerClientStatus = () => false;

export default function FilterClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isClient = useSyncExternalStore(subscribeToClient, getClientStatus, getServerClientStatus);

    const {
        events,
        loading,
        selectedVersion,
        selectedVariant,
        initializeExperimentStats,
        setSelectedVersion,
        setSelectedVariant,
        loadEvents
    } = useExperimentStore();

    // Инициализация статики (один раз)
    useEffect(() => {
        let isMounted = true;

        async function loadExperimentStats() {
            try {
                const experimentStats = await fetchExperimentStats();
                if (isMounted) initializeExperimentStats(...experimentStats);
            } catch (error) {
                if (isMounted) console.error('Failed to fetch stats:', error);
            }
        }

        loadExperimentStats();
        return () => {
            isMounted = false;
        };
    }, [initializeExperimentStats]);

    // Синхронизация стора с URL (только на клиенте)
    useEffect(() => {
        if (!isClient) return;

        const versionParam = searchParams.get('coefficient');
        const versionFromUrl = versionParam ? Number(versionParam).toFixed(2) : null;
        const variantFromUrl = searchParams.get('team');
        if (versionFromUrl && versionFromUrl !== selectedVersion) {
            setSelectedVersion(versionFromUrl);
        }
        if (variantFromUrl && variantFromUrl !== selectedVariant) setSelectedVariant(variantFromUrl);
        if (!versionFromUrl && selectedVersion) setSelectedVersion(null);
        if (!variantFromUrl && selectedVariant) setSelectedVariant(null);
    }, [searchParams, selectedVersion, selectedVariant, setSelectedVersion, setSelectedVariant, isClient]);

    // Загрузка матчей при изменении фильтров
    useEffect(() => {
        if (selectedVersion !== undefined) {
            // если стор уже инициализирован (хотя бы null)
            loadEvents();
        }
    }, [selectedVersion, selectedVariant, loadEvents]);

    const handleVersionSelect = (value) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set('coefficient', value);
        } else {
            params.delete('coefficient');
        }
        router.push(`/?${params.toString()}`);
    };

    const handleVariantSelect = (value) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set('team', value);
        } else {
            params.delete('team');
        }
        router.push(`/?${params.toString()}`);
    };

    // На сервере показываем заглушку, на клиенте - полный компонент
    if (!isClient) {
        return (
            <div className="scrollbar-aware-container">
                <div className="p-4 max-w-6xl mx-auto">
                    <h1 className="text-2xl font-bold mb-6 text-center">
                        {eventCardConfig?.pageTitle}
                    </h1>
                    <div>Загрузка...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="scrollbar-aware-container">
            <div className="p-4 max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold mb-6 text-center">
                    {eventCardConfig?.pageTitle}
                </h1>

                <FilterPanel
                    router={router}
                    events={events}
                    onVersionSelect={handleVersionSelect}
                    onVariantSelect={handleVariantSelect}
                    versionFilterLabel={eventCardConfig?.filterLabel}
                    variantFilterLabel={eventCardConfig?.teamFilterLabel}
                    allVariantsLabel={eventCardConfig?.allTeamsLabel}
                    variantALabel={eventCardConfig?.homeTeamLabel}
                    variantBLabel={eventCardConfig?.awayTeamLabel}
                />

                <TopVersions onVersionSelect={handleVersionSelect} />

                {eventCardConfig && <ResultsSection events={events} loading={loading} cardProfile={eventCardConfig} />}
            </div>
        </div>
    );
}
