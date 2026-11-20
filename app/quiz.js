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
