export function getTopVersions({
    versionStats,
    variantVersionStats,
    selectedVariant,
    minSampleSize,
    topVersionsLimit,
    minVersionThreshold
}) {
    const stats = selectedVariant ? Object.values(variantVersionStats) : versionStats;

    return stats
        .filter(
            (stat) =>
                (!selectedVariant || stat.variant === selectedVariant) &&
                stat.sampleSize >= minSampleSize &&
                stat.version >= minVersionThreshold
        )
        .map((stat) => ({ ...stat, successRate: stat.successCount / stat.sampleSize }))
        .sort((a, b) => b.successRate - a.successRate || b.version - a.version)
        .slice(0, topVersionsLimit);
}

export function countRecordsForVersions(versionRecords, topVersions, selectedVariant) {
    if (topVersions.length === 0) return 0;

    const versions = new Set(topVersions.map(({ version }) => version.toFixed(2)));
    const variantIndexes = selectedVariant === 'home' ? [0] : selectedVariant === 'away' ? [1] : [0, 1];

    return versionRecords.filter((record) =>
        variantIndexes.some((index) => {
            const version = record[index];
            return typeof version === 'number' && Number.isFinite(version) && versions.has(version.toFixed(2));
        })
    ).length;
}
