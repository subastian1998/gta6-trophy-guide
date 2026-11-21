// Flashcard quiz for the GTA VI trophy hunt: learn the list by testing
// yourself on it. Two question modes, both built only from the official
// data in trophies.json — names and descriptions as PlayStation
// publishes them, nothing invented, no guide text in the answers:
//
//   Mode "desc-to-name": show an official description, pick the trophy
//     name it belongs to (4 choices).
//   Mode "name-to-desc": show a trophy name, pick its official
//     description (4 choices).
//
// The three wrong choices are drawn from other trophies in the same
// list, so every option on screen is a real trophy name or a real
// description. Score and streak live only for this visit (module state,
// never localStorage): closing the tab resets them, which is the point
// of a flashcard round. Revealing the answer shows the right choice and
// a button that opens that trophy's guide panel.

export const QUIZ_MODES = ["desc-to-name", "name-to-desc"];
export const QUIZ_CHOICE_COUNT = 4;
export const QUIZ_MODE_LABELS = {
  "desc-to-name": "Description → name",
  "name-to-desc": "Name → description",
};

// Fisher–Yates shuffle on a copy, so the caller's array is untouched.
export function shuffleArray(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Three distractors for one trophy: other trophies picked at random.
// The answer itself is never among them, and no trophy repeats.
export function pickDistractors(trophies, answer) {
  const pool = trophies.filter((t) => t.id !== answer.id);
  return shuffleArray(pool).slice(0, QUIZ_CHOICE_COUNT - 1);
}

// Build one question: { mode, prompt, promptLabel, choices, answerId,
// answerText }. In desc-to-name the prompt is the official description
// and the choices are names; in name-to-desc it is the other way round.
export function buildQuestion(trophies, mode, answer) {
  const chosen = answer ?? shuffleArray(trophies)[0];
  const distractors = pickDistractors(trophies, chosen);
  const all = shuffleArray([chosen, ...distractors]);
  if (mode === "name-to-desc") {
    return {
      mode,
      prompt: chosen.name,
      promptLabel: "Which official description belongs to this trophy?",
      choices: all.map((t) => ({ id: t.id, text: t.description })),
      answerId: chosen.id,
      answerText: chosen.description,
      answerTrophy: chosen,
    };
  }
  return {
    mode,
    prompt: chosen.description,
    promptLabel: "Which trophy has this official description?",
    choices: all.map((t) => ({ id: t.id, text: t.name })),
    answerId: chosen.id,
    answerText: chosen.name,
    answerTrophy: chosen,
  };
}

// Score bookkeeping, kept in-session only: { asked, correct, streak,
// bestStreak }. A wrong answer resets the streak to 0; a right one
// extends it and may set a new best.
export function createQuizScore() {
  return { asked: 0, correct: 0, streak: 0, bestStreak: 0 };
}

export function recordQuizAnswer(score, wasCorrect) {
  score.asked += 1;
  if (wasCorrect) {
    score.correct += 1;
    score.streak += 1;
    if (score.streak > score.bestStreak) score.bestStreak = score.streak;
  } else {
    score.streak = 0;
  }
  return score;
}

export function quizAccuracy(score) {
  if (score.asked === 0) return 0;
  return Math.round((score.correct / score.asked) * 100);
}

// How many trophies can be quiz answers: every trophy with a
// description is askable, so the pool is the whole list unless a
// trophy somehow has no description.
export function quizPoolSize(trophies) {
  return trophies.filter((t) => (t.description ?? "").trim().length > 0).length;
}

// Render the quiz into root. onOpenGuide opens the answer trophy's
// guide panel from the reveal. Every round starts fresh: score and
// streak are new each time the tab is opened.
export function renderQuiz(root, { trophies, onOpenGuide }) {
  const score = createQuizScore();
  let mode = "desc-to-name";
  let question = buildQuestion(trophies, mode);
  let answered = false;
  let pickedId = null;
  // Trophies already asked this round, so questions do not repeat
  // until the whole list has been covered once.
  let askedIds = new Set();

  function nextQuestion() {
    const remaining = trophies.filter((t) => !askedIds.has(t.id));
    const pool = remaining.length > 0 ? remaining : trophies;
    if (remaining.length === 0) askedIds = new Set();
    question = buildQuestion(pool, mode);
    askedIds.add(question.answerId);
    answered = false;
    pickedId = null;
  }

  function render() {
    root.replaceChildren();

    const intro = document.createElement("p");
    intro.className = "quiz-intro";
    intro.textContent =
      "Flashcards from the official list only — names and descriptions as PlayStation publishes them. Score and streak reset when you leave; the point is the round, not the record.";
    root.append(intro);

    const bar = document.createElement("div");
    bar.className = "quiz-bar";

    const modes = document.createElement("div");
    modes.className = "quiz-modes";
    modes.setAttribute("role", "group");
    modes.setAttribute("aria-label", "Question mode");
    for (const m of QUIZ_MODES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-mode-btn" + (mode === m ? " is-active" : "");
      btn.textContent = QUIZ_MODE_LABELS[m];
      btn.addEventListener("click", () => {
        if (mode === m) return;
        mode = m;
        askedIds = new Set();
        nextQuestion();
        render();
      });
      modes.append(btn);
    }
    bar.append(modes);

    const scoreEl = document.createElement("p");
    scoreEl.className = "quiz-score";
    scoreEl.textContent =
      score.asked === 0
        ? "Score 0 · streak 0 — first question below."
        : `Score ${score.correct}/${score.asked} (${quizAccuracy(score)}%) · streak ${score.streak} · best ${score.bestStreak}`;
    bar.append(scoreEl);
    root.append(bar);

    const card = document.createElement("div");
    card.className = "quiz-card";
    const label = document.createElement("p");
    label.className = "quiz-prompt-label";
    label.textContent = question.promptLabel;
    const prompt = document.createElement("p");
    prompt.className = "quiz-prompt";
    prompt.textContent = mode === "desc-to-name" ? `“${question.prompt}”` : question.prompt;
    card.append(label, prompt);

    const choices = document.createElement("div");
    choices.className = "quiz-choices";
    for (const choice of question.choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      const isAnswer = choice.id === question.answerId;
      const isPicked = pickedId === choice.id;
      btn.className =
        "quiz-choice" +
        (answered && isAnswer ? " is-correct" : "") +
        (answered && isPicked && !isAnswer ? " is-wrong" : "");
      btn.disabled = answered;
      btn.textContent = choice.text;
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        pickedId = choice.id;
        recordQuizAnswer(score, isAnswer);
        render();
      });
      choices.append(btn);
    }
    card.append(choices);

    const feedback = document.createElement("div");
    feedback.className = "quiz-feedback";
    if (answered) {
      const verdict = document.createElement("p");
      verdict.className = "quiz-verdict";
      verdict.textContent =
        pickedId === question.answerId
          ? `Correct — that is ${question.answerTrophy.name}.`
          : `Not quite — the answer is ${question.answerTrophy.name}: “${question.answerText}”.`;
      feedback.append(verdict);
      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "btn-guide";
      openBtn.textContent = `Open the guide for ${question.answerTrophy.name}`;
      openBtn.addEventListener("click", () => onOpenGuide(question.answerTrophy));
      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "quiz-next-btn";
      nextBtn.textContent = "Next question";
      nextBtn.addEventListener("click", () => {
        nextQuestion();
        render();
      });
      feedback.append(openBtn, nextBtn);
    } else {
      const hint = document.createElement("p");
      hint.className = "quiz-hint";
      hint.textContent = "Pick one of the four — every option is a real trophy from the list.";
      feedback.append(hint);
    }
    card.append(feedback);
    root.append(card);

    const foot = document.createElement("p");
    foot.className = "quiz-foot";
    foot.textContent =
      "Hidden trophies appear here by name and description — the quiz is a study tool, not spoiler-free mode. All 55 trophies are in the deck.";
    root.append(foot);
  }

  nextQuestion();
  render();
  return { render };
}

// ---------------------------------------------------------------------------
// Round 5 — extra quiz modes. The two original modes stay untouched;
// these three play on top of the same deck and the same scoring helpers:
//
//   "timed": a desc-to-name question with a 20-second clock. Answering
//     after the clock runs out counts as wrong even when the pick was
//     right, so the mode trains recall under pressure, not guessing.
//   "name-from-hint": only the grade, the kind and the first letter of
//     the name are shown, so the player must know the list cold.
//   "difficulty": the prompt is a trophy name and the four choices are
//     difficulty ratings — it teaches the hunt profile (the difficulty
//     field each trophy carries in trophies.json), not the descriptions.
// ---------------------------------------------------------------------------

export const QUIZ_TIMED_SECONDS = 20;
export const QUIZ_EXTRA_MODES = ["timed", "name-from-hint", "difficulty"];
export const QUIZ_EXTRA_MODE_LABELS = {
  timed: "Timed challenge (20s)",
  "name-from-hint": "Guess the name from a hint",
  difficulty: "Guess the difficulty",
};

// Plain words for a 1-5 difficulty, shared by the difficulty mode and
// any panel that shows a trophy's rating.
export function difficultyLabel(n) {
  if (n <= 1) return "1 — Trivial";
  if (n === 2) return "2 — Easy";
  if (n === 3) return "3 — Moderate";
  if (n === 4) return "4 — Hard";
  return "5 — Hardest grind";
}

// A timed question is a desc-to-name question plus its clock: the
// moment the question was shown (ms since epoch) and how many seconds
// the player gets. The clock is data, not a timer — the caller ticks it.
export function buildTimedQuestion(trophies, answer) {
  const base = buildQuestion(trophies, "desc-to-name", answer);
  return { ...base, mode: "timed", seconds: QUIZ_TIMED_SECONDS, askedAt: Date.now() };
}

// Seconds left on a timed question at `nowMs` (defaults to now), never
// below zero. A question with no clock is treated as already expired.
export function timedSecondsLeft(question, nowMs = Date.now()) {
  if (!question || typeof question.askedAt !== "number") return 0;
  const used = (nowMs - question.askedAt) / 1000;
  return Math.max(0, question.seconds - used);
}

// A whole timed round: a shuffled deck of questions, the running score
// (the same shape createQuizScore returns) and the index of the current
// question. Built once, then advanced by timedQuizAnswer.
export function createTimedQuiz(trophies, questionCount = 10) {
  const deck = shuffleArray(trophies).slice(0, Math.max(1, questionCount));
  return {
    questions: deck.map((t) => buildTimedQuestion(trophies, t)),
    index: 0,
    score: createQuizScore(),
    finished: deck.length === 0,
  };
}

// Answer the current timed question. Returns { correct, timedOut } and
// moves the round on; the last answer marks the round finished. A pick
// after the clock hits zero is wrong even when it names the right trophy.
export function timedQuizAnswer(state, choiceId, nowMs = Date.now()) {
  const question = state.questions[state.index];
  if (!question) return { correct: false, timedOut: false };
  const timedOut = timedSecondsLeft(question, nowMs) <= 0;
  const correct = !timedOut && choiceId === question.answerId;
  recordQuizAnswer(state.score, correct);
  state.index += 1;
  if (state.index >= state.questions.length) state.finished = true;
  return { correct, timedOut };
}

// Hint question: the prompt is grade + kind + first letter + name
// length, the choices are four real trophy names. Hidden trophies are
// fair game here — the mode is a study tool, like the original modes.
export function buildNameHintQuestion(trophies, answer) {
  const chosen = answer ?? shuffleArray(trophies)[0];
  const distractors = pickDistractors(trophies, chosen);
  const all = shuffleArray([chosen, ...distractors]);
  const initial = chosen.name.trim().charAt(0).toUpperCase();
  return {
    mode: "name-from-hint",
    prompt:
      `${chosen.grade} · ${chosen.kind} · starts with “${initial}” · ` +
      `${chosen.name.trim().length} characters`,
    promptLabel: "Which trophy fits this hint?",
    choices: all.map((t) => ({ id: t.id, text: t.name })),
    answerId: chosen.id,
    answerText: chosen.name,
    answerTrophy: chosen,
  };
}

// Difficulty question: the prompt is a trophy name, the choices are
// the five difficulty labels minus one (four choices, as elsewhere).
// A trophy with no difficulty in the data counts as 3 — moderate.
export function buildDifficultyQuestion(trophies, answer) {
  const chosen = answer ?? shuffleArray(trophies)[0];
  const rating = Number.isInteger(chosen.difficulty) ? chosen.difficulty : 3;
  const others = shuffleArray([1, 2, 3, 4, 5].filter((n) => n !== rating)).slice(0, 3);
  const levels = shuffleArray([rating, ...others]);
  return {
    mode: "difficulty",
    prompt: chosen.name,
    promptLabel: "How hard is this trophy, on this guide's 1–5 scale?",
    choices: levels.map((n) => ({ id: n, text: difficultyLabel(n) })),
    answerId: rating,
    answerText: difficultyLabel(rating),
    answerTrophy: chosen,
  };
}

// One mixed round across any of the five modes: `modes` names the modes
// to draw from, `count` caps the questions. Each entry is a question
// object from the matching builder, so the renderer needs no new shape.
export function buildMixedQuizRound(trophies, modes, count = 10) {
  const usable = (modes ?? []).filter((m) =>
    ["desc-to-name", "name-to-desc", "timed", "name-from-hint", "difficulty"].includes(m),
  );
  const picked = usable.length > 0 ? usable : ["desc-to-name"];
  const deck = shuffleArray(trophies).slice(0, Math.max(1, count));
  return deck.map((t, i) => {
    const mode = picked[i % picked.length];
    if (mode === "name-to-desc") return buildQuestion(trophies, mode, t);
    if (mode === "timed") return buildTimedQuestion(trophies, t);
    if (mode === "name-from-hint") return buildNameHintQuestion(trophies, t);
    if (mode === "difficulty") return buildDifficultyQuestion(trophies, t);
    return buildQuestion(trophies, "desc-to-name", t);
  });
}

// One-line verdict for a finished round, for the score line under the
// quiz: "7/10 correct · 70% · best streak 4".
export function quizRoundSummary(score) {
  return (
    `${score.correct}/${score.asked} correct · ${quizAccuracy(score)}% · ` +
    `best streak ${score.bestStreak}`
  );
}
