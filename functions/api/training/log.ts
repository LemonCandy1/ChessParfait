import { getAdminClient, getSessionAuthUser, json, type SupabaseEnv } from '../../_lib/community';
import { finishedDays, toLog, type TrainingLogRow } from '../../_lib/training';
import { findPlan } from '../../../src/data/trainingPlans';
import { awardPoints, getProfile } from '../../_lib/profiles';
import {
    currentStreak,
    isDayComplete,
    isLoggableDay,
    minutesFor,
    rewardForFinishedDay,
    sanitiseItems,
    streakEndingOn
} from '../../../src/lib/training';

/**
 * POST /api/training/log { day, planId, completedItems }
 * Saves the ticked items for the user's local `day` (only "today" in some time zone is accepted).
 * The first time all required items are ticked, the day's points (plus any streak bonus) are
 * added to the account. A day is never paid twice, even if items are unticked and ticked again.
 */
export async function onRequestPost(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const user = await getSessionAuthUser(request, env);
        if (!user) return json({ message: 'Please sign in to use training plans.' }, 401);

        const { day, planId, completedItems } = await request.json();
        const plan = findPlan(planId);
        if (!plan) return json({ message: 'Unknown training plan.' }, 400);
        if (!isLoggableDay(day)) return json({ message: 'Only today\'s training can be updated.' }, 400);

        const items = sanitiseItems(plan, completedItems);
        const completed = isDayComplete(plan, items);
        const admin = getAdminClient(env);

        // Save the ticks. points_awarded is left out so an existing payout is never overwritten.
        const { data: saved, error: writeError } = await admin
            .from('training_logs')
            .upsert({
                user_id: user.id,
                day,
                plan_id: plan.id,
                completed_items: items,
                minutes: minutesFor(plan, items),
                completed,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,day' })
            .select('day, plan_id, completed_items, minutes, completed, points_awarded')
            .single();
        if (writeError) throw writeError;
        const row = saved as TrainingLogRow;

        const finished = await finishedDays(admin, user.id, day);
        if (completed) finished.add(day); else finished.delete(day);

        // Pay the day once: the points ledger refuses a second claim for the same day, so
        // double-clicks or parallel requests can never pay twice.
        let pointsAwarded = 0;
        let bonus = 0;
        let totalPoints: number;
        if (completed && row.points_awarded === 0) {
            const reward = rewardForFinishedDay(streakEndingOn(finished, day));
            const result = await awardPoints(admin, user.id, 'training', day, reward.total, { planId: plan.id, bonus: reward.bonus });
            totalPoints = result.totalPoints;
            if (result.awarded) {
                pointsAwarded = reward.total;
                bonus = reward.bonus;
                row.points_awarded = reward.total;
                const { error: markError } = await admin
                    .from('training_logs')
                    .update({ points_awarded: reward.total })
                    .eq('user_id', user.id)
                    .eq('day', day);
                if (markError) throw markError;
            }
        } else {
            totalPoints = (await getProfile(admin, user)).points;
        }

        return json({
            log: toLog(row),
            pointsAwarded,
            bonus,
            totalPoints,
            streak: currentStreak(finished, day)
        });
    } catch (err) {
        console.error('Training log error:', err);
        return json({ message: 'Could not save your training.' }, 500);
    }
}
