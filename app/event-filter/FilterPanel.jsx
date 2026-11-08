'use client';

import { useMemo, useState } from 'react';
import { useExperimentStore } from './states';

export default function FilterPanel({
    events,
    onCoefficientSelect,
    onVariantSelect,
    coefficientFilterLabel = 'Фильтр по значению:',
    variantFilterLabel = 'Для теста:',
    allVariantsLabel = 'Любой тест',
    variantALabel = 'Тест A',
    variantBLabel = 'Тест B'
}) {
    const {
        coefficientStats,
        totalEvents,
        selectedCoefficient,
        selectedVariant,
        minSampleSize,
        topCoefficientsLimit,
        minCoefficientThreshold,
        setMinSampleSize,
        setTopCoefficientsLimit,
        setMinCoefficientThreshold
    } = useExperimentStore();
    // Уникальные значения для выпадающего списка
    const uniqueCoefficients = useMemo(() => {
        const coefficients = coefficientStats.map((stat) => stat.coefficient);
        const validCoefficients = coefficients.reduce((acc, value) => {
            if (!isNaN(value) && (value >= minCoefficientThreshold || Number(value).toFixed(2) === selectedCoefficient)) {
                acc.push(parseFloat(Number(value).toFixed(2)));
            }
            return acc;
        }, []);
        return [...new Set(validCoefficients)].sort((a, b) => a - b);
    }, [coefficientStats, minCoefficientThreshold, selectedCoefficient]);

    // Map для быстрого доступа к сводным данным по значению
    const coefficientStatsByValue = useMemo(
        () => new Map(coefficientStats.map((stat) => [stat.coefficient.toFixed(2), stat])),
        [coefficientStats]
    );

    // Есть ли активный фильтр (для подсветки)
    const hasActiveFilter = !!(selectedCoefficient || selectedVariant);

    return (
        <div className="p-0">
            <div className="grid grid-cols-2 gap-4">
                <StatBox label="Всего записей" value={totalEvents} />
                <StatBox
                    label="Показано"
                    value={events.length}
                    highlight={hasActiveFilter && events.length < totalEvents}
                />
            </div>

            <div className="mt-4 p-4 bg-white border border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-3">Параметры фильтрации</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ParameterInput id="min-sample-size" label="Мин. размер выборки" value={minSampleSize} onChange={setMinSampleSize} />
                    <ParameterInput id="top-coefficients-limit" label="Лимит коэффициентов" value={topCoefficientsLimit} onChange={setTopCoefficientsLimit} />
                    <ParameterInput id="min-coefficient-threshold" label="Мин. порог коэффициента" value={minCoefficientThreshold} onChange={setMinCoefficientThreshold} decimal />
                </div>
            </div>

            <div className="mt-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
                    {/* Фильтр по значению */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">{coefficientFilterLabel}</label>
                        <select
                            value={selectedCoefficient || ''}
                            onChange={(e) => onCoefficientSelect(e.target.value || null)}
                            className="w-full p-2 border rounded-lg"
                        >
                            <option value="">Пустой набор значений</option>
                            {uniqueCoefficients.map((coefficientValue) => {
                                const stat = coefficientStatsByValue.get(coefficientValue.toFixed(2));
                                return (
                                    <option key={coefficientValue} value={coefficientValue.toFixed(2)}>
                                        {coefficientValue.toFixed(2)}
                                        {stat && ` (${stat.successCount}/${stat.sampleSize})`}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Фильтр по варианту */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">{variantFilterLabel}</label>
                        <select
                            value={selectedVariant || ''}
                            onChange={(e) => onVariantSelect(e.target.value || null)}
                            className="w-full p-2 border rounded-lg"
                        >
                            <option value="">{allVariantsLabel}</option>
                            <option value="home">{variantALabel}</option>
                            <option value="away">{variantBLabel}</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ParameterInput({ id, label, value, onChange, decimal = false }) {
    const [draft, setDraft] = useState(String(value));
    const valid = parseParameter(draft, decimal) !== null;

    return (
        <div>
            <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <input
                id={id}
                type={decimal ? 'text' : 'number'}
                inputMode={decimal ? 'decimal' : 'numeric'}
                min={decimal ? undefined : 1}
                max={decimal ? undefined : Number.MAX_SAFE_INTEGER}
                step={decimal ? undefined : 1}
                value={draft}
                onChange={(e) => {
                    const next = e.target.value;
                    setDraft(next);
                    const numericValue = parseParameter(next, decimal);
                    if (numericValue !== null) onChange(numericValue);
                }}
                aria-invalid={!valid}
                aria-describedby={!valid ? `${id}-error` : undefined}
                className="w-full p-2 border border-gray-300 rounded text-sm"
            />
            {!valid && (
                <p id={`${id}-error`} className="mt-1 text-xs text-red-700">
                    {decimal ? 'Введите число от 0 с точностью до сотых.' : 'Введите целое число от 1.'}
                </p>
            )}
        </div>
    );
}

function parseParameter(value, decimal) {
    const pattern = decimal ? /^\d+(?:[.,]\d{0,2})?$/ : /^\d+$/;
    if (!pattern.test(value)) return null;
    const number = Number(value.replace(',', '.'));
    if (decimal ? !Number.isFinite(number) : !Number.isSafeInteger(number) || number < 1) return null;
    return number;
}

function StatBox({ label, value, highlight = false }) {
    return (
        <div className="text-center">
            <div className="text-sm text-gray-600">{label}</div>
            <div className={`text-2xl font-bold ${highlight ? 'text-blue-600' : ''}`}>{value}</div>
        </div>
    );
}
