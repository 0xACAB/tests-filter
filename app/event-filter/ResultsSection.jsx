'use client';
import { useExperimentStore } from './states';

const getOutcomeColor = (winningVariant) =>
    winningVariant === 'home' ? 'text-indigo-700' : winningVariant === 'away' ? 'text-teal-700' : 'text-slate-600';

function PeriodChart({ scheme, cardProfile }) {
    const getTotal = (scores) => {
        if (!Array.isArray(scores)) return null;
        const total = scores.at(-1);
        if (total == null || (typeof total !== 'number' && typeof total !== 'string')) return null;
        if (typeof total === 'string' && !total.trim()) return null;
        const value = Number(total);
        return Number.isFinite(value) && value >= 0 ? value : null;
    };
    const homeTotal = getTotal(scheme.home);
    const awayTotal = getTotal(scheme.away);
    const hasWinner = homeTotal !== null && awayTotal !== null && homeTotal !== awayTotal;
    const homeLeads = hasWinner && homeTotal > awayTotal;
    const variants = [
        {
            label: cardProfile.homeLabel,
            color: hasWinner ? (homeLeads ? '#15803d' : '#be123c') : '#4338ca',
            result: hasWinner ? (homeLeads ? 'больше баллов' : 'меньше баллов') : null,
            scores: scheme.home
        },
        {
            label: cardProfile.awayLabel,
            color: hasWinner ? (homeLeads ? '#be123c' : '#15803d') : '#0f766e',
            result: hasWinner ? (homeLeads ? 'меньше баллов' : 'больше баллов') : null,
            scores: scheme.away
        }
    ].map((variant) => ({
        ...variant,
        points: Array.isArray(variant.scores)
            ? variant.scores.slice(0, -1).flatMap((score, index) => {
                  if (score == null || (typeof score === 'string' && !score.trim())) return [];
                  const value = Number(score);
                  return Number.isFinite(value) && value >= 0 ? [{ period: index + 1, value }] : [];
              })
            : []
    }));

    if (variants.some((variant) => variant.points.length < 2)) return null;

    const maxPeriod = Math.max(...variants.flatMap((variant) => variant.points.map((point) => point.period)));
    const maxValue = Math.max(1, ...variants.flatMap((variant) => variant.points.map((point) => point.value)));
    const x = (period) => 16 + ((period - 1) / (maxPeriod - 1)) * 268;
    const y = (value) => 65 - (value / maxValue) * 55;
    const description = variants
        .map(
            (variant) =>
                `${variant.label}${variant.result ? ` (${variant.result})` : ''}: ${variant.points.map((point) => `${point.period} период — ${point.value}`).join(', ')}`
        )
        .join('; ');

    return (
        <div className="mt-3 border-t border-slate-200 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-600">Динамика по периодам</span>
                <span className="flex flex-wrap gap-2">
                    {variants.map((variant) => (
                        <span key={variant.label} style={{ color: variant.color }}>
                            ● {variant.label}{variant.result ? ` (${variant.result})` : ''}
                        </span>
                    ))}
                </span>
            </div>
            <svg
                viewBox="0 0 300 88"
                className="mt-1 h-auto w-full"
                role="img"
                aria-label={`Значения по периодам. ${description}`}
            >
                <line x1="16" y1="65" x2="284" y2="65" stroke="#cbd5e1" />
                {variants.map((variant) => (
                    <g key={variant.label} fill={variant.color} stroke={variant.color}>
                        {variant.points.slice(1).map((point, index) => {
                            const previous = variant.points[index];
                            if (point.period !== previous.period + 1) return null;
                            return (
                                <line
                                    key={point.period}
                                    x1={x(previous.period)}
                                    y1={y(previous.value)}
                                    x2={x(point.period)}
                                    y2={y(point.value)}
                                    strokeWidth="2"
                                />
                            );
                        })}
                        {variant.points.map((point) => (
                            <circle key={point.period} cx={x(point.period)} cy={y(point.value)} r="3" />
                        ))}
                    </g>
                ))}
                {Array.from({ length: maxPeriod }, (_, index) => (
                    <text
                        key={index}
                        x={x(index + 1)}
                        y="82"
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="10"
                    >
                        {index + 1}
                    </text>
                ))}
            </svg>
        </div>
    );
}

export default function ResultsSection({ events, loading, cardProfile }) {
    const { selectedVersion, setSelectedVersion } = useExperimentStore();

    if (loading) {
        return <div className="text-center py-12">Загрузка...</div>;
    }

    if (events.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="text-gray-500 text-lg mb-2">
                    {selectedVersion
                        ? `Нет записей с версией ${selectedVersion}`
                        : 'Нет данных для отображения'}
                </div>
                {selectedVersion && (
                    <button
                        onClick={() => {
                            // Сбросить выбранную версию в сторе и URL
                            const url = new URL(window.location.href);
                            url.searchParams.delete('coefficient');
                            window.history.pushState({}, '', url.toString());
                            setSelectedVersion(null);
                        }}
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        Показать пустой набор версий
                    </button>
                )}
            </div>
        );
    }
    return (
        <div className="mb-6 p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                    {selectedVersion
                        ? `Записи с версией ${selectedVersion} (${events.length})`
                        : `Все записи (${events.length})`}
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event) => (
                    <EventCard
                        key={event.eventId}
                        event={event}
                        selectedVersion={selectedVersion}
                        cardProfile={cardProfile}
                        getOutcomeColor={getOutcomeColor}
                    />
                ))}
            </div>
        </div>
    );
}

function EventCard({ event, selectedVersion, cardProfile, getOutcomeColor }) {
    const hasMatchingVersion =
        selectedVersion &&
        event.realCoefficients?.some(
            (versionValue) =>
                versionValue !== null &&
                parseFloat(versionValue).toFixed(2) === parseFloat(selectedVersion).toFixed(2)
        );
    const getCardColor = () => {
        if (!hasMatchingVersion) return 'bg-slate-50 border-slate-300';

        const matchingVersionIndex = event.realCoefficients?.findIndex((value) => {
            if (value == null) return false;
            const numericVersion = Number(value);
            const numericSelectedVersion = Number(selectedVersion);
            return !isNaN(numericVersion) && numericVersion.toFixed(2) === numericSelectedVersion.toFixed(2);
        });

        const isSuccessfulVariant =
            matchingVersionIndex !== -1 &&
            ((event.winner === 'home' && matchingVersionIndex === 0) ||
                (event.winner === 'away' && matchingVersionIndex === 1));

        return isSuccessfulVariant ? 'bg-emerald-100 border-emerald-300' : 'bg-rose-100 border-rose-300';
    };

    return (
        <div className={`p-4 border shadow-sm hover:shadow-md transition-shadow ${getCardColor()}`}>
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="text-sm text-slate-600 font-mono">
                        {cardProfile.eventPrefix}
                        {event.eventId}
                    </div>
                    <div className={`text-lg font-medium mt-1 ${getOutcomeColor(event.winner)}`}>
                        {event.winner === 'home'
                            ? cardProfile.winnerHome
                            : event.winner === 'away'
                              ? cardProfile.winnerAway
                              : cardProfile.winnerUnknown}
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <div className="text-sm text-slate-600 mb-2">{cardProfile.sectionTitle}</div>
                {/* Основные версии */}
                <div className="mb-3">
                    <div className="text-xs font-medium text-slate-500 mb-1">{cardProfile.primaryTitle}</div>
                    <div className="flex gap-2">
                        {event.realCoefficients?.map((versionValue, index) => {
                            const isVariantA = index === 0;
                            const isWinner =
                                (event.winner === 'home' && index === 0) || (event.winner === 'away' && index === 1);
                            const hasResult = event.winner === 'home' || event.winner === 'away';
                            const isSelected =
                                selectedVersion &&
                                versionValue !== null &&
                                selectedVersion !== null &&
                                (Number(versionValue) || 0).toFixed(2) ===
                                    (Number(selectedVersion) || 0).toFixed(2);

                            return (
                                <div
                                    key={index}
                                    className={`flex-1 p-2 rounded-lg text-center ${
                                        isSelected
                                            ? 'bg-amber-100 border-2 border-amber-400'
                                            : isVariantA
                                              ? 'bg-indigo-100 border border-indigo-200'
                                              : 'bg-teal-100 border border-teal-200'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="text-xs text-slate-600">
                                            {isVariantA ? cardProfile.homeLabel : cardProfile.awayLabel}
                                        </div>
                                        {isWinner && <span className="text-xs text-emerald-700 font-medium">✓</span>}
                                    </div>
                                    <div
                                        className={`text-lg font-bold ${
                                            isSelected ? 'text-amber-800' : 'text-slate-800'
                                        }`}
                                    >
                                        {(Number(versionValue) || 0).toFixed(2)}
                                    </div>
                                    {isSelected && <div className="text-xs font-medium text-amber-800">Выбрано</div>}
                                    {cardProfile.showOutcomeLabels && hasResult && (
                                        <div
                                            className={`text-xs mt-1 font-medium ${isWinner ? 'text-emerald-700' : 'text-rose-700'}`}
                                        >
                                            {isWinner ? cardProfile.successLabel : cardProfile.failureLabel}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Дополнительные источники */}
                {event.flashScoreCoefficients && (
                    <div>
                        <div className="text-xs font-medium text-slate-500 mb-1">Дополнительные источники:</div>
                        <div>
                            {Object.entries(event.flashScoreCoefficients).map(([source, versions], index) => {
                                return (
                                    <div key={source + index}>
                                        {`${cardProfile.sourceLabels?.[source] || `Источник ${index + 1}`}:`}
                                        <div className="flex gap-1">
                                            {versions.map((versionValue, index) => {
                                                const isVariantA = index === 0;
                                                const isWinner =
                                                    (event.winner === 'home' && index === 0) ||
                                                    (event.winner === 'away' && index === 1);
                                                const isSelected =
                                                    selectedVersion &&
                                                    versionValue !== null &&
                                                    selectedVersion !== null &&
                                                    (Number(versionValue) || 0).toFixed(2) ===
                                                        (Number(selectedVersion) || 0).toFixed(2);
                                                return (
                                                    <div
                                                        key={index}
                                                        className={`flex-1 p-1 rounded text-center text-sm ${
                                                            isSelected
                                                                ? 'bg-amber-100 border border-amber-400'
                                                                : 'bg-white/70 border border-slate-300'
                                                        }`}
                                                        title={`${isVariantA ? cardProfile.homeLabel : cardProfile.awayLabel}: ${(
                                                            Number(versionValue) || 0
                                                        ).toFixed(2)}`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-xs text-slate-600">
                                                                {isVariantA
                                                                    ? cardProfile.homeLabel
                                                                    : cardProfile.awayLabel}
                                                            </div>
                                                            {isWinner && (
                                                                <span className="text-xs text-emerald-700">✓</span>
                                                            )}
                                                        </div>
                                                        <div
                                                            className={`font-medium ${
                                                                isSelected ? 'text-amber-800' : 'text-slate-700'
                                                            }`}
                                                        >
                                                            {(Number(versionValue) || 0).toFixed(2)}
                                                        </div>
                                                        {isSelected && (
                                                            <div className="text-xs font-medium text-amber-800">
                                                                Выбрано
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {event.scheme && (
                <div className="mb-4 p-3 bg-white/70 border border-slate-200 rounded-lg">
                    <div className="text-sm text-slate-600 mb-2">{cardProfile.result}</div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <div className="text-xs font-medium text-indigo-700">{cardProfile.homeLabel}</div>
                            <div className="flex gap-1 mt-1">
                                {event.scheme.home
                                    ?.filter(Boolean)
                                    .slice(0, -1)
                                    .map((score, idx) => (
                                        <div key={idx} className="flex-1 text-center p-1 bg-white rounded text-sm">
                                            {score}
                                        </div>
                                    ))}
                            </div>
                            <div className="text-xs text-slate-600 mt-1 text-center">
                                Итого: {event.scheme.home?.filter(Boolean).at(-1) || 0}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs font-medium text-teal-700">{cardProfile.awayLabel}</div>
                            <div className="flex gap-1 mt-1">
                                {event.scheme.away
                                    ?.filter(Boolean)
                                    .slice(0, -1)
                                    .map((score, idx) => (
                                        <div key={idx} className="flex-1 text-center p-1 bg-white rounded text-sm">
                                            {score}
                                        </div>
                                    ))}
                            </div>
                            <div className="text-xs text-slate-600 mt-1 text-center">
                                Итого: {event.scheme.away?.filter(Boolean).at(-1) || 0}
                            </div>
                        </div>
                    </div>
                    <PeriodChart scheme={event.scheme} cardProfile={cardProfile} />
                </div>
            )}


            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-600">
                    {event.createdAt && new Date(event.createdAt).toLocaleDateString('ru-RU')}
                </div>
                <div className="text-xs">
                    {event.winner === 'home' ? (
                        <span className="text-emerald-700">{cardProfile.footerHome}</span>
                    ) : event.winner === 'away' ? (
                        <span className="text-rose-700">{cardProfile.footerAway}</span>
                    ) : (
                        <span className="text-slate-600">{cardProfile.footerUnknown}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
