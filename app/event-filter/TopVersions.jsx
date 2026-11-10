'use client';

import { useMemo } from 'react';
import { useExperimentStore } from './states';
import { getTopVersions } from './versionStats';

function VersionButton({ stat, isSelected, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 rounded-full text-sm transition-all relative ${
                isSelected ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200'
            }`}
            title={`${stat.version.toFixed(2)} (${
                stat.variant === 'home' ? 'Тест A' : stat.variant === 'away' ? 'Тест B' : 'Все варианты'
            }): ${stat.successCount}/${stat.sampleSize} результатов (${(stat.successRate * 100).toFixed(1)}%)`}
        >
            <div className="flex items-center gap-1">
                <span>{stat.version.toFixed(2)}</span>
                <span className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                    ({stat.successCount}/{stat.sampleSize})
                </span>
            </div>
        </button>
    );
}
export default function TopVersions({ onVersionSelect }) {
    const {
        statsInitialized,
        versionStats,
        variantVersionStats,
        selectedVersion,
        selectedVariant,
        minSampleSize,
        topVersionsLimit,
        minVersionThreshold
    } = useExperimentStore();

    const topVersions = useMemo(() => {
        if (!statsInitialized) return [];
        return getTopVersions({
            versionStats,
            variantVersionStats,
            selectedVariant,
            minSampleSize,
            topVersionsLimit,
            minVersionThreshold
        });
    }, [statsInitialized, versionStats, variantVersionStats, selectedVariant, minSampleSize, topVersionsLimit, minVersionThreshold]);

    return (
        <div className="p-4">
            {/* ... */}
            <div className="flex flex-wrap gap-2">
                {topVersions.map((stat) => (
                    <VersionButton
                        key={`${stat.version}_${stat.variant || 'all'}`}
                        stat={stat}
                        isSelected={
                            selectedVersion &&
                            stat.version.toFixed(2) === selectedVersion &&
                            (!selectedVariant || stat.variant === selectedVariant)
                        }
                        onClick={() => onVersionSelect(stat.version.toString())}
                    />
                ))}
            </div>
        </div>
    );
}
