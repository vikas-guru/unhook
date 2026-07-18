// Curated, evidence-based reading for people breaking a habit.
// Each article is real editorial prose — no placeholders. Body is written in a
// light markdown-ish dialect the reader renders: blank-line-separated paragraphs,
// "## " subheads, and "- " bullet lines.
//
// Sources are grounded in mainstream behavioral-science literature (Marlatt's
// relapse-prevention and urge-surfing work; Wood & Neal on habit and context;
// B.J. Fogg's behavior model; Clear's systems-over-goals framing; Volkow et al.
// on dopamine and reward). Kept general and non-clinical by design.

export const articles = [
  {
    id: 'urge-surfing',
    title: 'The Science of Urge-Surfing',
    dek: 'A craving is a wave, not a command. Here is how to ride one out without wiping out.',
    minutes: 4,
    tags: ['cravings', 'mindfulness', 'skills'],
    body: `You are not obligated to act on a craving. That sentence sounds obvious until the craving actually arrives — then it feels less like a thought and more like an order. Urge-surfing is a technique, developed in relapse-prevention research by psychologist Alan Marlatt, for meeting that order and declining it, calmly, again and again.

The core insight is about shape. An urge is not a straight line that climbs until you give in. It is a wave. It rises, crests, and — if you do nothing — falls. Most urges peak within a few minutes and subside on their own. We rarely learn this because we almost always cut the experiment short: we give in near the peak and then credit the relief to the habit, when really the wave was about to break anyway.

## Ride it, don't fight it

Fighting an urge head-on tends to amplify it. Try the opposite. When a craving hits, turn toward it with curiosity instead of alarm.

- Name it plainly: "This is a craving. It will pass."
- Locate it in the body. Where do you feel it — chest, jaw, hands, gut? What is its texture?
- Breathe slowly and watch the sensation the way a surfer watches a swell: rising, peaking, receding.
- Do not add a story. "I can't stand this" is a second wave you are generating yourself.

You are not white-knuckling. You are observing a temporary bodily event until it dissolves.

## Why it works

Every time you surf an urge instead of obeying it, you weaken the link between trigger and action. The habit loop learns that the cue no longer reliably produces the reward. Cravings gradually arrive less often and with less authority. This is not willpower in the grit-your-teeth sense — it is practice, and like any practice it compounds.

The first few waves are the hardest you will ever surf. Ride three or four all the way to shore and something quietly shifts: you stop believing the craving's central lie — that it will last forever unless you feed it.`,
  },
  {
    id: 'willpower-fails',
    title: 'Why Willpower Fails and Systems Win',
    dek: 'Motivation is weather. Build something that keeps working after the sky turns grey.',
    minutes: 5,
    tags: ['systems', 'motivation', 'design'],
    body: `We are taught to admire willpower, so when a habit beats us we conclude we simply lacked enough of it. That story is both demoralizing and wrong. Decades of behavioral research point the other way: the people who change most reliably are not the ones with heroic self-control. They are the ones who arranged their lives so that less self-control was required.

## Motivation is weather

Motivation rises and falls with sleep, stress, blood sugar, and mood. It is real, but it is weather — you cannot bank on it being sunny at 11pm when the craving shows up. Any plan that depends on you feeling strong in your weakest moment is a plan built to fail on exactly the night it matters.

Systems are different. A system is a small, repeatable structure that produces the right behavior even when motivation is low. It moves the effort from the hard moment (resisting) to an easy earlier moment (arranging).

## Goals point, systems carry

A goal names a destination: "quit vaping," "stop doomscrolling." Useful for direction, useless for the walk itself. As James Clear puts it, you do not rise to the level of your goals; you fall to the level of your systems. Winners and losers often share the same goal — what differs is the machinery underneath.

Trade willpower for design:

- Instead of resisting the phone at night, leave it charging in another room.
- Instead of trying not to buy the thing, don't keep it in the house.
- Instead of remembering your replacement, put it physically in the path — running shoes by the door, tea by the kettle.

## Make the good path the lazy path

The aim is to make your desired behavior the one that requires the least effort, and the unwanted one require the most. When the healthy choice is also the easy choice, you no longer need to be impressive at midnight. You just need to have been thoughtful at noon.

This is not a lowering of standards. It is the highest-leverage move available — because it works on the days you feel weak, which are the only days that ever really tested the goal.`,
  },
  {
    id: 'dopamine-doomscroll',
    title: 'Dopamine and the Doom-Scroll',
    dek: 'Your feed is not addictive by accident. Understanding the machinery is the first step to escaping it.',
    minutes: 5,
    tags: ['neuroscience', 'digital', 'triggers'],
    body: `Dopamine has a bad reputation as the "pleasure chemical," which turns out to be a misunderstanding that matters. Dopamine is less about the reward itself and more about the anticipation of reward — the wanting, not the liking. This distinction is the entire business model of the infinite feed.

## Wanting outlives liking

When you pull to refresh, you rarely know what you will get. Maybe something great, probably something forgettable. That uncertainty is the point. Neuroscientists have long known that unpredictable rewards drive dopamine harder than reliable ones — the same principle that makes slot machines compelling. Your brain's reward system fires most on the maybe.

So you keep scrolling in search of a hit that stays one swipe away. You are not weak-willed. You are a well-tuned system responding exactly as designed — by teams who A/B tested that design against millions of people to maximize precisely this.

## The comedown is the cost

Every spike has a trough. After a long scroll you often feel flat, irritable, or vaguely empty — the neurological hangover of having spent your reward budget on nothing nourishing. Worse, the baseline creeps: ordinary life starts to feel dull next to the engineered intensity of the feed, so you reach for it again to feel normal. That is the trap tightening.

## Retune your reward

You cannot delete your dopamine system, but you can stop letting an algorithm program it.

- Add friction to the wanting: log out, delete the app from your phone, remove the badge counts. Every extra tap is a chance to wake up.
- Make the maybe a definitely: replace open-ended feeds with finite media — a saved article, an album, a chapter that ends.
- Practice boredom on purpose. Let a queue line or a coffee be quiet. Tolerance for mild boredom is the muscle the feed atrophied, and it grows back.

The goal is not a monk's detachment. It is to want the things that are actually good for you a little more, and the slot machine in your pocket a little less.`,
  },
  {
    id: 'design-environment',
    title: 'Designing Your Environment to Win',
    dek: 'Self-control is a poor guard. A well-arranged room never sleeps on the job.',
    minutes: 4,
    tags: ['systems', 'design', 'environment'],
    body: `Behavior is shaped by context far more than we like to admit. Researchers Wendy Wood and David Neal have shown that much of daily action runs on autopilot, cued by the environment rather than chosen in the moment. Change the environment and you change the behavior — often more easily than changing the mind.

## The habit lives in the room, not just the head

A cue you never encounter cannot trigger a craving. This is why the single most effective thing many people do is not psychological at all: they make the unwanted option physically harder to reach and the wanted option physically easier.

- Distance is friction. The snack on the counter gets eaten; the same snack in the basement often does not.
- Sight is a summons. If you can see it, part of you is already negotiating. Put it out of view.
- Defaults decide. Whatever is easiest at zero effort is what you will do most nights.

## Addition, not just subtraction

Removing cues is half the work. The other half is planting the cue you want. B.J. Fogg calls these anchors — attaching a new behavior to something already in your environment and routine.

- Want to drink more water? Put the glass where you already stand each morning.
- Want to read instead of scroll? Leave the book on the pillow and the charger in the kitchen.
- Want to walk? Set the shoes by the door the night before, laces loose.

## Rearrange the room, not your soul

There is a quiet dignity in this approach. It stops treating every craving as a referendum on your character and starts treating it as a design problem with a design solution. You are not weak for keeping tempting things at arm's reach — you are wise. The strongest people do not win by resisting temptation all day. They win by rarely having to.`,
  },
  {
    id: 'relapse-is-data',
    title: 'Relapse Is Data, Not Failure',
    dek: 'A slip is not the end of the story. Handled right, it is the most useful page in it.',
    minutes: 4,
    tags: ['relapse', 'mindset', 'resilience'],
    body: `Nobody breaks a hard habit in a clean straight line. Slips happen. What determines the outcome is almost never the slip itself — it is the twenty minutes after, and the story you tell about it.

## The abstinence violation effect

Marlatt named a common trap: the abstinence violation effect. You break your streak, and instead of treating it as one event, you treat it as proof — proof that you have failed, that you were always going to, that you might as well keep going now that it is "ruined." One slip becomes a full relapse not because of the substance or the scroll, but because of that interpretation. The guilt does more damage than the act.

## One slip is one slip

A single lapse changes very little on its own. A missed day is a missed day, not a verdict. The people who recover fastest are the ones who can say, without drama: "That happened. It is not who I am. What's next?"

- Resist the all-or-nothing voice. "I already blew it" is the sentence that turns a stumble into a fall.
- Shrink the timeframe. You do not have to fix forever. You have to handle the next hour.
- Get back on the same day if you can. Continuity matters more than perfection.

## Debrief like a scientist

The most valuable thing a slip offers is information. Something in the chain worked against you — treat it as a case study, not a confession.

- What was the trigger? Time of day, place, emotion, person, hunger, boredom?
- What did the craving promise, and did it deliver?
- What is one small change to the environment or plan that would make that exact moment easier next time?

Every slip you examine this way makes the next one less likely. Failure is repeating the same lapse blindly. Data is a lapse you learned from. Choose which one it becomes.`,
  },
  {
    id: 'two-minute-replacement',
    title: 'The 2-Minute Replacement Rule',
    dek: 'You cannot simply delete a habit. You have to give the moment somewhere else to go.',
    minutes: 4,
    tags: ['skills', 'replacement', 'systems'],
    body: `Habits are hard to erase because they occupy a slot — a specific moment, mood, or cue that has learned to expect a specific action. Try to remove the action and you leave the slot empty, aching to be filled. The craving rushes into that vacuum. The fix is not deletion but substitution: give the slot a new, easier tenant.

## Keep the cue, swap the routine

Every habit runs a loop: cue, routine, reward. You usually cannot change the cue — stress will still arrive, the evening will still come, the phone will still buzz. And you do not want to lose the reward — the relief, the break, the soothing. What you can change is the routine in the middle. Keep the trigger, keep the payoff, replace the behavior.

- Cue: bored on the couch → old routine: scroll → new routine: two pages of a book already sitting there.
- Cue: stressed after a call → old routine: vape → new routine: step outside, four slow breaths.
- Cue: restless at your desk → old routine: open the feed → new routine: fill and drink a glass of water.

## Make it laughably small

This is where most replacements fail — they aim too high. "Meditate for twenty minutes" is not a replacement, it is a second habit you also do not have. B.J. Fogg's research is blunt about this: shrink the new behavior until it is almost impossible to refuse. Two minutes, one glass, four breaths, a single page. Small enough that resistance has nothing to push against.

You are not trying to fill the whole evening. You are trying to get through the ninety seconds when the craving peaks. A two-minute action is long enough to let the urge wave break, and easy enough that you will actually reach for it.

## Rehearse before you need it

Decide your replacement now, while calm, and stage it physically — the book on the couch, the water by the desk, the shoes at the door. Cravings are bad at improvising; they win when the moment is unplanned. A replacement chosen in advance and left in plain sight turns the hardest decision of your night into something you already made.`,
  },
]

export function getArticle(id) {
  return articles.find((a) => a.id === id) || null
}
