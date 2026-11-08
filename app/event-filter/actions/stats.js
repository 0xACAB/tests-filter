'use server';
import { connectToDatabase } from '@/lib/mongodb';

export async function fetchExperimentStats() {
    const { db } = await connectToDatabase();
    const rawEvents = await db
        .collection('nba')
        .aggregate([
            {
                $match: {
                    //eventId: 'MH3FeAUP',
                    /*flashScoreCoefficients: {
                        $exists: true,
                        $ne: null
                    },*/
                    realCoefficients: {
                        $exists: true,
                        $ne: null
                    }
                }
            },
            {
                $match: {
                    realCoefficients: {
                        $elemMatch: {
                            $type: 'string',
                            $regex: /^.{4,5}$/ // проверка длины через regex
                        }
                    }
                }
            }
        ])
        .sort({ createdAt: -1 })
        .toArray();

    const events = rawEvents.map((event) => ({
        ...event,
        _id: event._id.toString(),
        createdAt: event.createdAt ? event.createdAt.toISOString() : null
    }));

    const versionStats = events.reduce((stats, event) => {
        event.realCoefficients.forEach((version, index) => {
            const numericVersion = Number(version);

            const key = numericVersion.toFixed(2);
            if (!stats[key]) {
                stats[key] = { version: numericVersion, sampleSize: 0, successCount: 0 };
            }
            stats[key].sampleSize++;

            if ((event.winner === 'home' && index === 0) || (event.winner === 'away' && index === 1)) {
                stats[key].successCount++;
            }
        });
        return stats;
    }, {});

    const variantVersionStats = events.reduce((stats, event) => {
        event.realCoefficients.forEach((version, index) => {
            const numericVersion = Number(version);

            const variant = index === 0 ? 'home' : 'away';
            const variantKey = `${numericVersion.toFixed(2)}_${variant}`;

            if (!stats[variantKey]) {
                stats[variantKey] = {
                    version: numericVersion,
                    variant,
                    sampleSize: 0,
                    successCount: 0
                };
            }
            stats[variantKey].sampleSize++;

            if ((event.winner === 'home' && index === 0) || (event.winner === 'away' && index === 1)) {
                stats[variantKey].successCount++;
            }
        });
        return stats;
    }, {});
    return [Object.values(versionStats), variantVersionStats, events.length];
}

export async function fetchFilteredEvents(props) {
    const { version, team: variant } = (await props.searchParams) || {};
    let versionFieldPath;
    if (variant) {
        versionFieldPath = `realCoefficients.${variant === 'home' ? 0 : 1}`;
    } else {
        versionFieldPath = 'realCoefficients';
    }
    const { db } = await connectToDatabase();
    //В realCoefficients всегда строки длины 4 или 5 "x.xx" или "xx.xx"
    const matchingVersions = version ? [version] : [];
    const events = await db
        .collection('nba')
        .aggregate([
            {
                $match: {
                    //eventId: 'MH3FeAUP',
                    flashScoreCoefficients: {
                        $exists: true,
                        $ne: null
                    },
                    [versionFieldPath]: {
                        $exists: true,
                        $ne: null,
                        $in: matchingVersions
                    }
                }
            },
            {
                $match: {
                    realCoefficients: {
                        $elemMatch: {
                            $type: 'string',
                            $regex: /^.{4,5}$/ // проверка длины через regex
                        }
                    }
                }
            }
        ])
        .sort({ createdAt: -1 })
        .toArray();

    return events.map((event) => ({
        ...event,
        _id: event._id.toString(),
        createdAt: event.createdAt ? event.createdAt.toISOString() : null
    }));
}
