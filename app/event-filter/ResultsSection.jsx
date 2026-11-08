'use client';
import { useExperimentStore } from './states';

const getOutcomeColor = (winningVariant) =>
    winningVariant === 'home' ? 'text-indigo-700' : winningVariant === 'away' ? 'text-teal-700' : 'text-slate-600';

function PeriodChart({ scheme, cardProfile }) {
    const homeScores = Array.isArray(scheme.home) ? scheme.home.slice(0, -1) : [];
    const awayScores = Array.isArray(scheme.away) ? scheme.away.slice(0, -1) : [];
    const periodCount = Math.min(homeScores.length, awayScores.length);
    const points = [];
    let cumulativeDelta = 0;

    for (let index = 0; index < periodCount; index++) {
        const homeScore = Number(homeScores[index]);
        const awayScore = Number(awayScores[index]);
        if (
            homeScores[index] == null ||
            awayScores[index] == null ||
            (typeof homeScores[index] === 'string' && !homeScores[index].trim()) ||
            (typeof awayScores[index] === 'string' && !awayScores[index].trim()) ||
            !Number.isFinite(homeScore) ||
            !Number.isFinite(awayScore)
        ) {
            break;
        }

        const periodDelta = homeScore - awayScore;
        cumulativeDelta += periodDelta;
        points.push({ period: index + 1, delta: cumulativeDelta, periodDelta });
    }

    if (points.length < 2) return null;

    const maxPeriod = points[points.length - 1].period;
    const maxDelta = Math.max(1, ...points.map((point) => Math.abs(point.delta)));
    const x = (period) => 40 + ((period - 1) / (maxPeriod - 1)) * 244;
    const zeroY = 49;
    const y = (delta) => zeroY - (delta / maxDelta) * 29;
    const colorForDelta = (delta) => (delta > 0 ? '#15803d' : delta < 0 ? '#be123c' : '#64748b');
    const formatDelta = (delta) => (delta > 0 ? `+${delta}` : `${delta}`);
    const formatPoints = (value) => {
        const absoluteValue = Math.abs(value);
        const lastTwoDigits = absoluteValue % 100;
        const lastDigit = absoluteValue % 10;
        const unit =
            lastTwoDigits >= 11 && lastTwoDigits <= 14
                ? 'баллов'
                : lastDigit === 1
                  ? 'балл'
                  : lastDigit >= 2 && lastDigit <= 4
                    ? 'балла'
                    : 'баллов';
        return `${absoluteValue} ${unit}`;
    };
    const leadDescription = (delta) =>
        delta > 0
            ? `${cardProfile.homeLabel} впереди на ${formatPoints(delta)}`
            : delta < 0
              ? `${cardProfile.awayLabel} впереди на ${formatPoints(delta)}`
              : 'равный счёт';
    const description = points
        .map(
            (point) =>
                `${point.period} период: ${leadDescription(point.delta)}, разница за период ${formatDelta(point.periodDelta)}`
        )
        .join('; ');
    const areaSegments = points.slice(1).flatMap((point, index) => {
        const previous = points[index];
        const previousX = x(previous.period);
        const currentX = x(point.period);
        const previousY = y(previous.delta);
        const currentY = y(point.delta);

        if (previous.delta === 0 || point.delta === 0 || Math.sign(previous.delta) === Math.sign(point.delta)) {
            return [
                {
                    key: point.period,
                    color: colorForDelta(previous.delta || point.delta),
                    polygon: `${previousX},${zeroY} ${previousX},${previousY} ${currentX},${currentY} ${currentX},${zeroY}`
                }
            ];
        }

        const crossingX =
            previousX + ((-previous.delta) / (point.delta - previous.delta)) * (currentX - previousX);
        return [
            {
                key: `${point.period}-start`,
                color: colorForDelta(previous.delta),
                polygon: `${previousX},${zeroY} ${previousX},${previousY} ${crossingX},${zeroY}`
            },
            {
                key: `${point.period}-end`,
                color: colorForDelta(point.delta),
                polygon: `${crossingX},${zeroY} ${currentX},${currentY} ${currentX},${zeroY}`
            }
        ];
    });
    return (
        <div className="mt-3 border-t border-slate-200 pt-3">
            <div className="mt-1 flex gap-3 text-xs">
                <span className="text-emerald-700">● {cardProfile.homeLabel} впереди</span>
                <span className="text-rose-700">● {cardProfile.awayLabel} впереди</span>
            </div>
            <svg
                viewBox="0 0 300 112"
                className="mt-1 h-auto w-full"
                role="img"
                aria-label={`Накопительная разница счёта по периодам. ${description}`}
            >
                <rect x="40" y="20" width="244" height={zeroY - 20} fill="#15803d" opacity="0.05" />
                <rect x="40" y={zeroY} width="244" height="29" fill="#be123c" opacity="0.05" />
                <line x1="40" y1={zeroY} x2="284" y2={zeroY} stroke="#94a3b8" strokeDasharray="3 3" />
                <text x="35" y="22" textAnchor="end" fill="#64748b" fontSize="9">
                    +{maxDelta}
                </text>
                <text x="35" y={zeroY + 3} textAnchor="end" fill="#64748b" fontSize="9">
                    0
                </text>
                <text x="35" y="82" textAnchor="end" fill="#64748b" fontSize="9">
                    −{maxDelta}
                </text>
                {areaSegments.map((segment) => (
                    <polygon
                        key={segment.key}
                        points={segment.polygon}
                        fill={segment.color}
                        opacity="0.2"
                    />
                ))}
                {points.slice(1).map((point, index) => {
                    const previous = points[index];
                    return (
                        <line
                            key={point.period}
                            x1={x(previous.period)}
                            y1={y(previous.delta)}
                            x2={x(point.period)}
                            y2={y(point.delta)}
                            stroke={colorForDelta(point.delta || previous.delta)}
                            strokeWidth="2.5"
                        />
                    );
                })}
                {points.map((point) => (
                    <g key={point.period}>
                        <circle
                            cx={x(point.period)}
                            cy={y(point.delta)}
                            r="3.5"
                            fill={colorForDelta(point.delta)}
                        />
                        <text
                            x={x(point.period)}
                            y={point.delta >= 0 ? y(point.delta) - 7 : y(point.delta) + 13}
                            textAnchor="middle"
                            fill={colorForDelta(point.delta)}
                            fontSize="9"
                            fontWeight="600"
                        >
                            {formatDelta(point.delta)}
                        </text>
                    </g>
                ))}
                {points.map((point) => (
                    <text
                        key={`period-${point.period}`}
                        x={x(point.period)}
                        y="103"
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="10"
                    >
                        {point.period}
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
