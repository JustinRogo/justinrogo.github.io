const SPREADS = Object.freeze({
  single: Object.freeze({
    label: "One-card reflection",
    title: "Turn your card when you are ready",
    positions: Object.freeze([
      Object.freeze({ name: "Your Focus", subtitle: "What asks for your attention", lead: "As your focus," }),
    ]),
  }),
  three: Object.freeze({
    label: "Past · Present · Future",
    title: "Turn each card in its own time",
    positions: Object.freeze([
      Object.freeze({ name: "Past", subtitle: "What shaped this moment", lead: "In the position of the past," }),
      Object.freeze({ name: "Present", subtitle: "What is active now", lead: "In the position of the present," }),
      Object.freeze({ name: "Future", subtitle: "What may be emerging", lead: "In the position of the future," }),
    ]),
  }),
  situation: Object.freeze({
    label: "Situation · Challenge · Guidance",
    title: "See the path from three directions",
    positions: Object.freeze([
      Object.freeze({ name: "Situation", subtitle: "What is present now", lead: "At the heart of the situation," }),
      Object.freeze({ name: "Challenge", subtitle: "What asks to be met", lead: "Within the challenge," }),
      Object.freeze({ name: "Guidance", subtitle: "What can help you move", lead: "As guidance," }),
    ]),
  }),
  mindBodySpirit: Object.freeze({
    label: "Mind · Body · Spirit",
    title: "Listen to each part of yourself",
    positions: Object.freeze([
      Object.freeze({ name: "Mind", subtitle: "Thoughts, beliefs, and perspective", lead: "For the mind," }),
      Object.freeze({ name: "Body", subtitle: "Needs, senses, and grounded action", lead: "For the body," }),
      Object.freeze({ name: "Spirit", subtitle: "Meaning, intuition, and inner direction", lead: "For the spirit," }),
    ]),
  }),
  relationship: Object.freeze({
    label: "You · Them · Connection",
    title: "Consider the space between you",
    positions: Object.freeze([
      Object.freeze({ name: "You", subtitle: "What you bring to the relationship", lead: "In your position," }),
      Object.freeze({ name: "Them", subtitle: "What the other person brings", lead: "In their position," }),
      Object.freeze({ name: "Connection", subtitle: "What lives between you", lead: "Within the connection," }),
    ]),
  }),
  crossroads: Object.freeze({
    label: "Five-card Crossroads",
    title: "Stand at the crossroads with every card",
    positions: Object.freeze([
      Object.freeze({ name: "Where You Stand", subtitle: "The ground beneath this choice", lead: "Where you stand," }),
      Object.freeze({ name: "Path One", subtitle: "The energy of one direction", lead: "Along the first path," }),
      Object.freeze({ name: "Path Two", subtitle: "The energy of another direction", lead: "Along the second path," }),
      Object.freeze({ name: "Hidden Influence", subtitle: "What may not yet be visible", lead: "As a hidden influence," }),
      Object.freeze({ name: "Guiding Star", subtitle: "What can help you choose", lead: "As your guiding star," }),
    ]),
  }),
  celticCross: Object.freeze({
    label: "Ten-card Celtic Cross",
    title: "Let the whole pattern unfold",
    positions: Object.freeze([
      Object.freeze({ name: "The Present", subtitle: "The heart of the matter", lead: "At the heart of the matter," }),
      Object.freeze({ name: "The Challenge", subtitle: "What crosses or tests you", lead: "As the force that crosses you," }),
      Object.freeze({ name: "The Foundation", subtitle: "What lies beneath the situation", lead: "At the foundation," }),
      Object.freeze({ name: "The Recent Past", subtitle: "What is moving behind you", lead: "In the recent past," }),
      Object.freeze({ name: "The Possibility", subtitle: "What may be consciously reached", lead: "As the possibility above you," }),
      Object.freeze({ name: "The Near Future", subtitle: "What is approaching", lead: "In the near future," }),
      Object.freeze({ name: "Your Stance", subtitle: "How you meet the situation", lead: "In the way you meet this moment," }),
      Object.freeze({ name: "External Influences", subtitle: "People, conditions, and atmosphere", lead: "Among the influences around you," }),
      Object.freeze({ name: "Hopes & Fears", subtitle: "What you desire or resist", lead: "Within your hopes and fears," }),
      Object.freeze({ name: "The Outcome", subtitle: "The direction of the present path", lead: "As the present path unfolds," }),
    ]),
  }),
});

const CUSTOM_SPREAD_MIN = 1;
const CUSTOM_SPREAD_MAX = 5;

const SUIT_PATTERNS = Object.freeze({
  Cups: "Cups gather around emotion, relationship, intuition, and the way the heart receives experience.",
  Pentacles: "Pentacles emphasize the material world: work, resources, health, home, and what can be patiently built.",
  Swords: "Swords concentrate the reading in thought, truth, communication, and the choices made under mental pressure.",
  Wands: "Wands bring creative fire, desire, initiative, and the question of where your energy wants to move.",
});

const COURT_RANKS = new Set(["Page", "Knight", "Queen", "King"]);
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const supportsVibration = typeof navigator.vibrate === "function";

const elements = {
  setupPanel: document.querySelector("#setupPanel"),
  spreadInputs: [...document.querySelectorAll('input[name="spread"]')],
  customSpreadBuilder: document.querySelector("#customSpreadBuilder"),
  customPositionList: document.querySelector("#customPositionList"),
  addCustomPositionButton: document.querySelector("#addCustomPositionButton"),
  customSpreadStatus: document.querySelector("#customSpreadStatus"),
  intention: document.querySelector("#intention"),
  characterCount: document.querySelector("#characterCount"),
  hapticOption: document.querySelector("#hapticOption"),
  hapticToggle: document.querySelector("#hapticToggle"),
  shuffleButton: document.querySelector("#shuffleButton"),
  shuffleButtonLabel: document.querySelector("#shuffleButton .button-label"),
  cutStage: document.querySelector("#cutStage"),
  cutTitle: document.querySelector("#cut-title"),
  cutPiles: document.querySelector("#cutPiles"),
  cutDropZone: document.querySelector("#cutDropZone"),
  cutStatus: document.querySelector("#cutStatus"),
  openExplorerButton: document.querySelector("#openExplorerButton"),
  cardExplorer: document.querySelector("#cardExplorer"),
  closeExplorerButton: document.querySelector("#closeExplorerButton"),
  cardGallery: document.querySelector("#cardGallery"),
  cardDetail: document.querySelector("#cardDetail"),
  detailCardImage: document.querySelector("#detailCardImage"),
  detailCardMeta: document.querySelector("#detailCardMeta"),
  detailCardName: document.querySelector("#detailCardName"),
  uprightKeywords: document.querySelector("#uprightKeywords"),
  uprightMeaning: document.querySelector("#uprightMeaning"),
  uprightGuidance: document.querySelector("#uprightGuidance"),
  reversedKeywords: document.querySelector("#reversedKeywords"),
  reversedMeaning: document.querySelector("#reversedMeaning"),
  reversedGuidance: document.querySelector("#reversedGuidance"),
  selectionStage: document.querySelector("#selectionStage"),
  selectionTitle: document.querySelector("#selection-title"),
  selectionInstructions: document.querySelector("#selectionInstructions"),
  selectionCount: document.querySelector("#selectionCount"),
  deckSpread: document.querySelector("#deckSpread"),
  readingStage: document.querySelector("#readingStage"),
  spreadLabel: document.querySelector("#spreadLabel"),
  readingTitle: document.querySelector("#reading-title"),
  intentionDisplay: document.querySelector("#intentionDisplay"),
  shuffleVisual: document.querySelector("#shuffleVisual"),
  cardTable: document.querySelector("#cardTable"),
  readingSummary: document.querySelector("#readingSummary"),
  summaryTitle: document.querySelector("#summary-title"),
  patternReading: document.querySelector("#patternReading"),
  closingReflection: document.querySelector("#closingReflection"),
  copyButton: document.querySelector("#copyButton"),
  resetButton: document.querySelector("#resetButton"),
  copyStatus: document.querySelector("#copyStatus"),
  statusMessage: document.querySelector("#statusMessage"),
};

const state = {
  phase: "setup",
  spreadKey: "single",
  spread: SPREADS.single,
  intention: "",
  spreadDeck: [],
  cutPiles: [],
  draw: [],
  revealedCount: 0,
  synthesis: null,
  explorerRendered: false,
};

let pilePointerDrag = null;

function validateDeck(deck) {
  if (!Array.isArray(deck) || deck.length !== 78) return false;
  const ids = new Set();
  return deck.every((item) => {
    const recordsAreComplete = [item.upright, item.reversed].every((face) => (
      face
      && Array.isArray(face.keywords)
      && face.keywords.length > 0
      && typeof face.meaning === "string"
      && face.meaning.length > 0
      && typeof face.guidance === "string"
      && face.guidance.length > 0
    ));
    const valid = item.id && item.name && item.image && item.arcana && recordsAreComplete && !ids.has(item.id);
    ids.add(item.id);
    return Boolean(valid);
  });
}

function setStatus(message) {
  elements.statusMessage.textContent = "";
  window.requestAnimationFrame(() => {
    elements.statusMessage.textContent = message;
  });
}

function selectedSpreadKey() {
  return elements.spreadInputs.find((input) => input.checked)?.value || "single";
}

function customPositionInputs() {
  return [...elements.customPositionList.querySelectorAll(".custom-position-name")];
}

function updateCustomBuilderControls(message = "") {
  const rows = [...elements.customPositionList.querySelectorAll(".custom-position-row")];
  elements.addCustomPositionButton.disabled = rows.length >= CUSTOM_SPREAD_MAX || state.phase !== "setup";
  rows.forEach((row, index) => {
    const input = row.querySelector(".custom-position-name");
    const removeButton = row.querySelector(".remove-custom-position");
    row.querySelector("label").textContent = `Position ${index + 1}`;
    input.id = `customPosition${index + 1}`;
    input.name = `customPosition${index + 1}`;
    row.querySelector("label").htmlFor = input.id;
    removeButton.setAttribute("aria-label", `Remove position ${index + 1}${input.value.trim() ? `, ${input.value.trim()}` : ""}`);
    removeButton.disabled = rows.length <= CUSTOM_SPREAD_MIN || state.phase !== "setup";
  });

  const countMessage = `${rows.length} of ${CUSTOM_SPREAD_MAX} positions added.`;
  elements.customSpreadStatus.textContent = message ? `${message} ${countMessage}` : countMessage;
}

function addCustomPosition(name = "") {
  if (customPositionInputs().length >= CUSTOM_SPREAD_MAX) return;

  const row = createElement("li", "custom-position-row");
  const field = createElement("div", "custom-position-field");
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "custom-position-name";
  input.maxLength = 40;
  input.required = true;
  input.value = name;
  input.placeholder = "Name this position";
  input.autocomplete = "off";

  const removeButton = createElement("button", "remove-custom-position", "Remove");
  removeButton.type = "button";
  input.addEventListener("input", () => {
    const positionNumber = [...elements.customPositionList.children].indexOf(row) + 1;
    removeButton.setAttribute("aria-label", `Remove position ${positionNumber}${input.value.trim() ? `, ${input.value.trim()}` : ""}`);
  });
  removeButton.addEventListener("click", () => {
    const nextFocus = row.previousElementSibling?.querySelector("input")
      || row.nextElementSibling?.querySelector("input")
      || elements.addCustomPositionButton;
    row.remove();
    updateCustomBuilderControls("Position removed.");
    nextFocus.focus({ preventScroll: true });
  });

  field.append(label, input);
  row.append(field, removeButton);
  elements.customPositionList.append(row);
  updateCustomBuilderControls();
  return input;
}

function toggleCustomSpreadBuilder() {
  const isCustom = selectedSpreadKey() === "custom";
  elements.customSpreadBuilder.hidden = !isCustom;
  if (isCustom) updateCustomBuilderControls();
}

function selectedSpread() {
  const spreadKey = selectedSpreadKey();
  if (spreadKey !== "custom") return SPREADS[spreadKey];

  const inputs = customPositionInputs();
  const emptyInput = inputs.find((input) => !input.value.trim());
  if (emptyInput) {
    elements.customSpreadStatus.textContent = "Name every position before shuffling.";
    emptyInput.focus({ preventScroll: false });
    return null;
  }

  const positions = inputs.map((input, index) => {
    const name = input.value.trim();
    return Object.freeze({
      name,
      subtitle: `Your chosen focus · Position ${index + 1}`,
      lead: `For ${name},`,
    });
  });

  return Object.freeze({
    label: `Custom spread · ${positions.length} ${positions.length === 1 ? "card" : "cards"}`,
    title: "Turn each card in the order you chose",
    positions: Object.freeze(positions),
  });
}

function normalizedIntention() {
  const value = elements.intention.value.slice(0, 240);
  if (elements.intention.value !== value) elements.intention.value = value;
  elements.characterCount.textContent = `${value.length} / 240`;
  return value.trim();
}

function pulseHaptics(pattern = 10) {
  if (!supportsVibration
    || !elements.hapticToggle.checked
    || prefersReducedMotion.matches
    || document.visibilityState !== "visible") return;

  try {
    navigator.vibrate(pattern);
  } catch {
    // The platform may expose the API while declining vibration requests.
  }
}

function cancelHaptics() {
  if (!supportsVibration) return;
  try {
    navigator.vibrate(0);
  } catch {
    // Device-level settings may reject the cancellation request as well.
  }
}

function secureRandomIndex(maxExclusive) {
  if (window.crypto?.getRandomValues) {
    const range = 0x100000000;
    const limit = Math.floor(range / maxExclusive) * maxExclusive;
    const sample = new Uint32Array(1);
    do {
      window.crypto.getRandomValues(sample);
    } while (sample[0] >= limit);
    return sample[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function shuffledDeck() {
  const cards = [...TAROT_DECK];
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomIndex(index + 1);
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }
  return cards;
}

function setSetupDisabled(disabled) {
  elements.spreadInputs.forEach((input) => { input.disabled = disabled; });
  customPositionInputs().forEach((input) => { input.disabled = disabled; });
  elements.intention.disabled = disabled;
  elements.hapticToggle.disabled = disabled;
  elements.shuffleButton.disabled = disabled;
  elements.openExplorerButton.disabled = disabled;
  updateCustomBuilderControls();
}

function preloadDraw(draw) {
  draw.forEach(({ card: drawnCard }) => {
    const image = new Image();
    image.src = drawnCard.image;
  });
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (typeof text === "string") element.textContent = text;
  return element;
}

function cardMeta(cardToDescribe) {
  if (cardToDescribe.arcana === "major") return "Major Arcana";
  return `Minor Arcana · ${cardToDescribe.suit}`;
}

function showCardDetails(cardToShow, selectedButton, scrollToDetails = true) {
  const previousSelection = elements.cardGallery.querySelector('[aria-pressed="true"]');
  if (previousSelection) {
    previousSelection.setAttribute("aria-pressed", "false");
  }
  selectedButton.setAttribute("aria-pressed", "true");

  elements.detailCardImage.src = cardToShow.image;
  elements.detailCardImage.alt = cardToShow.name;
  elements.detailCardMeta.textContent = cardMeta(cardToShow);
  elements.detailCardName.textContent = cardToShow.name;
  elements.uprightKeywords.textContent = cardToShow.upright.keywords.join(" · ");
  elements.uprightMeaning.textContent = cardToShow.upright.meaning;
  elements.uprightGuidance.textContent = cardToShow.upright.guidance;
  elements.reversedKeywords.textContent = cardToShow.reversed.keywords.join(" · ");
  elements.reversedMeaning.textContent = cardToShow.reversed.meaning;
  elements.reversedGuidance.textContent = cardToShow.reversed.guidance;

  if (scrollToDetails && window.matchMedia("(max-width: 760px)").matches) {
    elements.cardDetail.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "start",
    });
  }
}

function renderCardExplorer() {
  const galleryFragment = document.createDocumentFragment();

  TAROT_DECK.forEach((cardToShow, index) => {
    const button = createElement("button", "gallery-card");
    button.type = "button";
    button.setAttribute("aria-label", `View meanings for ${cardToShow.name}`);
    button.setAttribute("aria-pressed", "false");

    const image = document.createElement("img");
    image.src = cardToShow.image;
    image.alt = "";
    image.width = 120;
    image.height = 180;
    image.loading = "lazy";
    image.decoding = "async";

    button.append(image, createElement("span", "", cardToShow.name));
    button.addEventListener("click", () => showCardDetails(cardToShow, button));
    galleryFragment.append(button);

    if (index === 0) {
      showCardDetails(cardToShow, button, false);
    }
  });

  elements.cardGallery.append(galleryFragment);
  state.explorerRendered = true;
}

function openCardExplorer() {
  if (!state.explorerRendered) renderCardExplorer();
  elements.cardExplorer.showModal();
  elements.closeExplorerButton.focus({ preventScroll: true });
}

function closeCardExplorer() {
  elements.cardExplorer.close();
}

function drawReading() {
  if (state.phase !== "setup") return;

  const spread = selectedSpread();
  if (!spread) return;

  state.phase = "shuffling";
  state.spreadKey = selectedSpreadKey();
  state.spread = spread;
  state.intention = normalizedIntention();
  state.revealedCount = 0;
  state.synthesis = null;
  state.draw = [];
  state.spreadDeck = shuffledDeck();
  state.cutPiles = [];
  setSetupDisabled(true);
  elements.setupPanel.classList.add("is-shuffling");
  elements.shuffleButtonLabel.textContent = "Shuffling…";
  setStatus("The deck is being shuffled.");

  const shuffleDelay = prefersReducedMotion.matches ? 80 : 1050;
  window.setTimeout(showCutStage, shuffleDelay);
}

function splitDeckIntoPiles(deck) {
  const pileSize = Math.ceil(deck.length / 3);
  return [
    deck.slice(0, pileSize),
    deck.slice(pileSize, pileSize * 2),
    deck.slice(pileSize * 2),
  ];
}

function createCutPile(pileIndex) {
  const pileNames = ["First", "Middle", "Last"];
  const button = createElement("button", "deck-pile");
  button.type = "button";
  button.dataset.pileIndex = String(pileIndex);
  button.setAttribute("aria-label", `Choose the ${pileNames[pileIndex].toLowerCase()} pile to begin the reading`);

  const stack = createElement("span", "pile-stack");
  stack.setAttribute("aria-hidden", "true");
  stack.append(
    createElement("i", "pile-card"),
    createElement("i", "pile-card"),
    createElement("i", "pile-card"),
    createElement("b", "pile-symbol", "✦"),
  );
  button.append(stack, createElement("span", "pile-name", `${pileNames[pileIndex]} pile`));
  button.addEventListener("click", activateCutPile);
  button.addEventListener("pointerdown", beginPilePointerDrag);
  return button;
}

function renderCutPiles() {
  elements.cutPiles.replaceChildren();
  const fragment = document.createDocumentFragment();
  state.cutPiles.forEach((unusedPile, index) => fragment.append(createCutPile(index)));
  elements.cutPiles.append(fragment);
  elements.cutDropZone.classList.remove("is-ready", "is-over", "is-chosen");
  elements.cutStatus.textContent = "Choose one of the three piles.";
}

function showCutStage() {
  state.cutPiles = splitDeckIntoPiles(state.spreadDeck);
  elements.setupPanel.hidden = true;
  elements.setupPanel.classList.remove("is-shuffling");
  elements.shuffleButtonLabel.textContent = "Shuffle the deck";
  elements.cutStage.hidden = false;
  elements.selectionStage.hidden = true;
  renderCutPiles();
  state.phase = "cutting";
  elements.cutTitle.focus({ preventScroll: true });
  setStatus("The deck has been divided into three piles. Tap a pile, or drag one into the begin-here circle.");
}

function chooseCutPile(eventOrIndex) {
  if (state.phase !== "cutting") return;

  const pileIndex = typeof eventOrIndex === "number"
    ? eventOrIndex
    : Number(eventOrIndex.currentTarget.dataset.pileIndex);
  if (!Number.isInteger(pileIndex) || !state.cutPiles[pileIndex]) return;

  const reorderedPiles = [
    ...state.cutPiles.slice(pileIndex),
    ...state.cutPiles.slice(0, pileIndex),
  ];
  state.spreadDeck = reorderedPiles.flat();
  state.phase = "cut-complete";

  elements.cutPiles.querySelectorAll(".deck-pile").forEach((pileButton) => {
    const isChosen = Number(pileButton.dataset.pileIndex) === pileIndex;
    pileButton.disabled = true;
    pileButton.classList.toggle("is-selected", isChosen);
    pileButton.classList.toggle("is-dismissed", !isChosen);
  });
  elements.cutDropZone.classList.remove("is-ready", "is-over");
  elements.cutDropZone.classList.add("is-chosen");
  elements.cutStatus.textContent = "The cut is made. The cards are taking their places.";
  pulseHaptics(14);
  setStatus("Pile chosen. The cut is complete and the reading is being prepared.");
  window.setTimeout(showSelectionStage, prefersReducedMotion.matches ? 80 : 700);
}

function activateCutPile(event) {
  if (event.currentTarget.dataset.suppressClick === "true") {
    delete event.currentTarget.dataset.suppressClick;
    return;
  }
  chooseCutPile(event);
}

function beginPilePointerDrag(event) {
  if (state.phase !== "cutting" || (event.pointerType === "mouse" && event.button !== 0)) return;

  const button = event.currentTarget;
  pilePointerDrag = {
    button,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };
  button.setPointerCapture?.(event.pointerId);
  button.classList.add("is-dragging");
  elements.cutDropZone.classList.add("is-ready");
}

function isPointerOverDropZone(clientX, clientY) {
  const bounds = elements.cutDropZone.getBoundingClientRect();
  return clientX >= bounds.left
    && clientX <= bounds.right
    && clientY >= bounds.top
    && clientY <= bounds.bottom;
}

function movePilePointerDrag(event) {
  if (!pilePointerDrag || event.pointerId !== pilePointerDrag.pointerId) return;
  event.preventDefault();
  const offsetX = event.clientX - pilePointerDrag.startX;
  const offsetY = event.clientY - pilePointerDrag.startY;
  if (Math.hypot(offsetX, offsetY) > 6) {
    pilePointerDrag.moved = true;
    elements.cutStatus.textContent = "Release the pile inside the circle to begin there.";
  }
  pilePointerDrag.button.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(0.97)`;
  elements.cutDropZone.classList.toggle("is-over", isPointerOverDropZone(event.clientX, event.clientY));
}

function finishPilePointerDrag(event) {
  if (!pilePointerDrag || event.pointerId !== pilePointerDrag.pointerId) return;
  const { button, moved } = pilePointerDrag;
  const pileIndex = Number(button.dataset.pileIndex);
  const dropped = moved && isPointerOverDropZone(event.clientX, event.clientY);
  button.releasePointerCapture?.(event.pointerId);
  button.classList.remove("is-dragging");
  button.style.removeProperty("transform");
  elements.cutDropZone.classList.remove("is-ready", "is-over");
  pilePointerDrag = null;

  if (moved) button.dataset.suppressClick = "true";
  if (dropped) {
    chooseCutPile(pileIndex);
  } else if (state.phase === "cutting") {
    elements.cutStatus.textContent = "Choose one of the three piles.";
  }
}

function cancelPilePointerDrag(event) {
  if (!pilePointerDrag || event.pointerId !== pilePointerDrag.pointerId) return;
  const { button } = pilePointerDrag;
  button.classList.remove("is-dragging");
  button.style.removeProperty("transform");
  elements.cutDropZone.classList.remove("is-ready", "is-over");
  elements.cutStatus.textContent = "Choose one of the three piles.";
  pilePointerDrag = null;
}

function showSelectionStage() {
  const spread = state.spread;
  const targetCount = spread.positions.length;
  elements.setupPanel.hidden = true;
  elements.cutStage.hidden = true;
  elements.setupPanel.classList.remove("is-shuffling");
  elements.shuffleButtonLabel.textContent = "Shuffle the deck";
  elements.selectionStage.hidden = false;
  elements.selectionTitle.textContent = targetCount === 1 ? "Choose a card" : `Choose ${targetCount} cards`;
  elements.selectionInstructions.textContent = targetCount === 1
    ? "Move slowly and select the face-down card that draws your attention."
    : "Move slowly and choose one face-down card for each position in your spread.";
  elements.selectionCount.textContent = `0 of ${targetCount} ${targetCount === 1 ? "card" : "cards"} chosen`;
  renderDeckSpread();
  state.phase = "choosing";
  elements.selectionTitle.focus({ preventScroll: true });
  setStatus(`The full deck is spread face down. Choose ${targetCount === 1 ? "one card" : `${targetCount} cards`}.`);
}

function renderDeckSpread() {
  elements.deckSpread.replaceChildren();
  elements.deckSpread.classList.remove("is-complete");

  state.spreadDeck.forEach((unusedCard, index) => {
    const button = createElement("button", "deck-choice");
    button.type = "button";
    button.dataset.deckIndex = String(index);
    button.setAttribute("aria-label", `Choose card ${index + 1} of ${state.spreadDeck.length}`);
    button.style.setProperty("--tilt", `${((index % 7) - 3) * 0.35}deg`);
    button.style.setProperty("--deal-delay", `${Math.min(index * 8, 420)}ms`);
    button.append(createElement("span", "mini-card-symbol", "✦"));
    button.addEventListener("click", selectCard, { once: true });
    elements.deckSpread.append(button);
  });
}

function navigateDeck(event) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  const currentChoice = event.target.closest('.deck-choice');
  if (!currentChoice || currentChoice.disabled) return;

  const choices = [...elements.deckSpread.querySelectorAll('.deck-choice')];
  const currentIndex = choices.indexOf(currentChoice);
  const columnCount = getComputedStyle(elements.deckSpread).gridTemplateColumns.split(' ').length;
  const delta = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -columnCount,
    ArrowDown: columnCount,
  }[event.key];
  let nextIndex = currentIndex + delta;

  while (nextIndex >= 0 && nextIndex < choices.length && choices[nextIndex].disabled) {
    nextIndex += delta;
  }

  if (nextIndex < 0 || nextIndex >= choices.length) return;
  event.preventDefault();
  choices[nextIndex].focus({ preventScroll: false });
}

function selectCard(event) {
  if (state.phase !== "choosing") return;

  const button = event.currentTarget;
  const deckIndex = Number(button.dataset.deckIndex);
  const spread = state.spread;
  const position = spread.positions[state.draw.length];

  state.draw.push({
    card: state.spreadDeck[deckIndex],
    position,
    reversed: secureRandomIndex(2) === 1,
  });
  pulseHaptics(8);

  button.disabled = true;
  button.classList.add("is-selected");
  button.querySelector(".mini-card-symbol").textContent = "✓";
  button.setAttribute("aria-label", `Selected card ${state.draw.length} for ${position.name}`);

  const targetCount = spread.positions.length;
  const remaining = targetCount - state.draw.length;
  elements.selectionCount.textContent = `${state.draw.length} of ${targetCount} ${targetCount === 1 ? "card" : "cards"} chosen`;

  if (remaining > 0) {
    setStatus(`Card chosen for ${position.name}. Choose ${remaining === 1 ? "one more card" : `${remaining} more cards`}.`);
    const choices = [...elements.deckSpread.querySelectorAll(".deck-choice")];
    const nextChoice = choices.slice(deckIndex + 1).find((choice) => !choice.disabled)
      || choices.find((choice) => !choice.disabled);
    window.setTimeout(() => nextChoice?.focus({ preventScroll: true }), prefersReducedMotion.matches ? 20 : 180);
    return;
  }

  state.phase = "selection-complete";
  preloadDraw(state.draw);
  elements.selectionTitle.textContent = targetCount === 1 ? "Your card is chosen" : "Your cards are chosen";
  elements.selectionInstructions.textContent = "The cards will now take their places in the reading.";
  elements.deckSpread.classList.add("is-complete");
  elements.deckSpread.querySelectorAll(".deck-choice:not(.is-selected)").forEach((choice) => {
    choice.disabled = true;
  });
  setStatus(`${targetCount === 1 ? "Your card is" : "Your cards are"} chosen. Preparing the reading.`);
  window.setTimeout(showReadingStage, prefersReducedMotion.matches ? 80 : 850);
}

function showReadingStage() {
  const spread = state.spread;
  elements.setupPanel.hidden = true;
  elements.selectionStage.hidden = true;
  elements.setupPanel.classList.remove("is-shuffling");
  elements.shuffleButtonLabel.textContent = "Shuffle the deck";
  elements.readingStage.hidden = false;
  elements.spreadLabel.textContent = spread.label;
  elements.readingTitle.textContent = spread.title;
  elements.intentionDisplay.hidden = !state.intention;
  elements.intentionDisplay.textContent = state.intention ? `“${state.intention}”` : "";
  elements.shuffleVisual.hidden = true;
  elements.readingSummary.hidden = true;
  elements.copyStatus.textContent = "";
  renderCardTable();
  state.phase = "revealing";
  elements.readingTitle.focus({ preventScroll: true });
  setStatus(`${state.draw.length} ${state.draw.length === 1 ? "card is" : "cards are"} ready. Reveal the first card.`);
}

function renderCardTable() {
  elements.cardTable.replaceChildren();
  const isCelticCross = state.spreadKey === "celticCross";
  elements.cardTable.classList.toggle("single", state.draw.length === 1 && !isCelticCross);
  elements.cardTable.classList.toggle("multi", state.draw.length > 1 && !isCelticCross);
  elements.cardTable.classList.toggle("celtic-cross", isCelticCross);
  elements.cardTable.style.setProperty("--spread-count", String(state.draw.length));

  if (isCelticCross) {
    renderCelticCrossTable();
    return;
  }

  state.draw.forEach((drawn, index) => {
    elements.cardTable.append(createCardSlot(drawn, index));
  });
}

function renderCelticCrossTable() {
  const crossSection = createElement("section", "celtic-zone celtic-cross-zone");
  const crossHeading = createElement("div", "celtic-zone-heading");
  const crossTitle = createElement("h3", "", "The Cross");
  crossTitle.id = "celtic-cross-title";
  crossHeading.append(
    createElement("p", "step-label", "The inner situation"),
    crossTitle,
    createElement("p", "", "The forces forming the heart of the reading."),
  );
  crossSection.setAttribute("aria-labelledby", crossTitle.id);

  const crossField = createElement("div", "celtic-cross-field");
  state.draw.slice(0, 6).forEach((drawn, index) => {
    crossField.append(createCardSlot(drawn, index));
  });
  crossSection.append(crossHeading, crossField);

  const staffSection = createElement("section", "celtic-zone celtic-staff-zone");
  const staffHeading = createElement("div", "celtic-zone-heading");
  const staffTitle = createElement("h3", "", "The Staff");
  staffTitle.id = "celtic-staff-title";
  staffHeading.append(
    createElement("p", "step-label", "Your place within it"),
    staffTitle,
    createElement("p", "", "How you, the world around you, and the path ahead relate."),
  );
  staffSection.setAttribute("aria-labelledby", staffTitle.id);

  const staffField = createElement("div", "celtic-staff-field");
  state.draw.slice(6).forEach((drawn, offset) => {
    staffField.append(createCardSlot(drawn, offset + 6));
  });
  staffSection.append(staffHeading, staffField);

  elements.cardTable.append(crossSection, staffSection);
}

function createCardSlot(drawn, index) {
  const slot = createElement("article", "card-slot");
  slot.dataset.cardIndex = String(index);

  const positionLabel = createElement("p", "position-label", drawn.position.name);
  positionLabel.append(createElement("small", "", drawn.position.subtitle));

  const button = createElement("button", "reveal-button");
  button.type = "button";
  button.disabled = index !== 0;
  button.classList.toggle("is-next", index === 0);
  button.setAttribute("aria-label", `Reveal ${drawn.position.name.toLowerCase()} card`);
  button.dataset.cardIndex = String(index);

  const shell = createElement("span", "card-shell");
  const back = createElement("span", "card-face card-back");
  back.append(createElement("span", "card-back-symbol", "☾ ✦ ☽"));

  const front = createElement("span", "card-face card-front");
  front.setAttribute("aria-hidden", "true");
  const image = document.createElement("img");
  image.src = drawn.card.image;
  image.alt = "";
  image.width = 768;
  image.height = 1152;
  image.decoding = "async";
  if (drawn.reversed) image.classList.add("reversed");
  image.addEventListener("error", () => {
    setStatus(`The image for ${drawn.card.name} could not be loaded.`);
  }, { once: true });
  front.append(image);
  shell.append(back, front);
  button.append(shell);
  button.addEventListener("click", revealCard, { once: true });

  const prompt = createElement("p", "turn-prompt", index === 0 ? "Turn this card" : "Waiting in the spread");
  const interpretation = createElement("div", "card-interpretation");
  interpretation.hidden = true;

  slot.append(positionLabel, button, prompt, interpretation);
  return slot;
}

function revealCard(event) {
  if (state.phase !== "revealing") return;

  const button = event.currentTarget;
  const index = Number(button.dataset.cardIndex);
  if (index !== state.revealedCount) return;

  const drawn = state.draw[index];
  const slot = button.closest(".card-slot");
  const prompt = slot.querySelector(".turn-prompt");
  const interpretation = slot.querySelector(".card-interpretation");
  const front = slot.querySelector(".card-front");
  const image = front.querySelector("img");
  const face = drawn.reversed ? drawn.card.reversed : drawn.card.upright;

  button.classList.add("is-revealed");
  button.classList.remove("is-next");
  button.disabled = true;
  button.tabIndex = -1;
  button.setAttribute("aria-label", `${drawn.position.name}: ${drawn.card.name}, ${drawn.reversed ? "reversed" : "upright"}`);
  front.removeAttribute("aria-hidden");
  image.alt = `${drawn.card.name}${drawn.reversed ? ", reversed" : ""}`;
  prompt.hidden = true;

  interpretation.append(
    createElement("h3", "", drawn.card.name),
    createElement("p", "orientation", drawn.reversed ? "Reversed" : "Upright"),
    createElement("p", "keywords", face.keywords.join(" · ")),
    createElement("p", "card-meaning", `${drawn.position.lead} ${face.meaning} ${face.guidance}`),
  );
  interpretation.hidden = false;
  state.revealedCount += 1;

  if (state.revealedCount < state.draw.length) {
    const nextSlot = elements.cardTable.querySelector(`[data-card-index="${state.revealedCount}"]`);
    const nextButton = nextSlot.querySelector(".reveal-button");
    const nextPrompt = nextSlot.querySelector(".turn-prompt");
    nextButton.disabled = false;
    nextButton.classList.add("is-next");
    nextPrompt.textContent = "Turn this card";
    pulseHaptics(10);
    setStatus(`${drawn.card.name}, ${drawn.reversed ? "reversed" : "upright"}, revealed. The ${state.draw[state.revealedCount].position.name} card is ready.`);
    window.setTimeout(() => nextButton.focus({ preventScroll: false }), prefersReducedMotion.matches ? 20 : 420);
    return;
  }

  setStatus(`${drawn.card.name}, ${drawn.reversed ? "reversed" : "upright"}, revealed. The reading is complete.`);
  window.setTimeout(showSynthesis, prefersReducedMotion.matches ? 20 : 650);
}

function countBy(items, selectValue) {
  return items.reduce((counts, item) => {
    const value = selectValue(item);
    if (value) counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function buildSynthesis() {
  const drawSize = state.draw.length;
  const majorCount = state.draw.filter(({ card: drawnCard }) => drawnCard.arcana === "major").length;
  const reversedCount = state.draw.filter(({ reversed }) => reversed).length;
  const courtCards = state.draw.filter(({ card: drawnCard }) => COURT_RANKS.has(drawnCard.rank));
  const suitCounts = countBy(state.draw, ({ card: drawnCard }) => drawnCard.suit);
  const dominantSuitEntry = Object.entries(suitCounts).sort((a, b) => b[1] - a[1])[0];
  const hasDominantSuit = drawSize > 1 && dominantSuitEntry?.[1] >= 2;
  const paragraphs = [];

  if (state.intention) {
    paragraphs.push(`Held beside your intention—“${state.intention}”—these cards invite reflection rather than a fixed prediction.`);
  } else {
    paragraphs.push("Taken together, these cards describe a field of attention rather than a fixed prediction.");
  }

  if (drawSize === 1) {
    const [{ card: drawnCard, reversed }] = state.draw;
    if (drawnCard.arcana === "major") {
      paragraphs.push(`${drawnCard.name} is a Major Arcana card, so the focus reaches beyond a passing circumstance toward a larger lesson in how you are changing.`);
    } else {
      paragraphs.push(`${drawnCard.name} places the focus in the realm of ${drawnCard.suit.toLowerCase()}. ${SUIT_PATTERNS[drawnCard.suit]}`);
    }
    paragraphs.push(reversed
      ? "Its reversed orientation turns part of the lesson inward, pointing to a pattern that may need recognition, release, or a more deliberate expression."
      : "Its upright orientation suggests that the card's energy is available to meet directly and express through conscious action.");
  } else {
    if (majorCount === drawSize) {
      paragraphs.push("Every position is held by the Major Arcana. This is a concentrated reading about foundational change, with each stage participating in a larger turning point.");
    } else if (majorCount >= 2) {
      paragraphs.push(`${majorCount} Major Arcana cards give the spread unusual weight. The immediate situation is connected to a deeper lesson that may continue unfolding beyond a single decision.`);
    } else if (majorCount === 1) {
      const majorCard = state.draw.find(({ card: drawnCard }) => drawnCard.arcana === "major");
      paragraphs.push(`${majorCard.card.name} is the spread's single Major Arcana card, marking its ${majorCard.position.name.toLowerCase()} position as the larger hinge of the story.`);
    } else {
      paragraphs.push("With no Major Arcana cards, the reading stays close to everyday choices and conditions—an encouraging sign that practical responses can meaningfully shape what follows.");
    }

    if (hasDominantSuit) {
      paragraphs.push(`${dominantSuitEntry[0]} appears ${dominantSuitEntry[1]} times and becomes the spread's dominant language. ${SUIT_PATTERNS[dominantSuitEntry[0]]}`);
    } else {
      paragraphs.push("No single suit dominates, so the spread asks several parts of life to be considered together rather than reducing the matter to one theme.");
    }

    if (courtCards.length >= 2) {
      paragraphs.push(`${courtCards.length} court cards emphasize roles, personalities, and ways of carrying influence. Consider whether they describe people around you or qualities you are being asked to embody.`);
    } else if (courtCards.length === 1) {
      paragraphs.push(`${courtCards[0].card.name} adds a human role to the pattern: a way of behaving or relating that may matter more than circumstances alone.`);
    }

    if (reversedCount === drawSize) {
      paragraphs.push("Every card is reversed. The movement is strongly inward, suggesting that recognition, unlearning, and private adjustment should come before visible action.");
    } else if (reversedCount === 0) {
      paragraphs.push("Every card is upright. Their energy is relatively direct, favoring visible engagement with the choices and opportunities they describe.");
    } else {
      paragraphs.push(`${reversedCount} ${reversedCount === 1 ? "card is" : "cards are"} reversed, creating a conversation between outward events and inward work. Let the reversals show where reflection must accompany action.`);
    }
  }

  const finalDraw = state.draw[state.draw.length - 1];
  const finalFace = finalDraw.reversed ? finalDraw.card.reversed : finalDraw.card.upright;
  const closing = `A closing invitation from ${finalDraw.card.name}: ${finalFace.guidance}`;

  return { paragraphs, closing };
}

function showSynthesis() {
  state.phase = "complete";
  state.synthesis = buildSynthesis();
  elements.patternReading.replaceChildren();
  state.synthesis.paragraphs.forEach((paragraph) => {
    elements.patternReading.append(createElement("p", "", paragraph));
  });
  elements.closingReflection.textContent = state.synthesis.closing;
  elements.readingSummary.hidden = false;
  elements.summaryTitle.focus({ preventScroll: false });
}

function buildCopyText() {
  const spread = state.spread;
  const lines = [
    "MIDNIGHT TAROT",
    spread.label,
    "",
  ];

  if (state.intention) {
    lines.push(`Intention: ${state.intention}`, "");
  }

  state.draw.forEach((drawn) => {
    const face = drawn.reversed ? drawn.card.reversed : drawn.card.upright;
    lines.push(
      `${drawn.position.name.toUpperCase()} — ${drawn.card.name} (${drawn.reversed ? "Reversed" : "Upright"})`,
      `Keywords: ${face.keywords.join(", ")}`,
      `${drawn.position.lead} ${face.meaning} ${face.guidance}`,
      "",
    );
  });

  lines.push(
    "THE THREAD BETWEEN THE CARDS",
    ...state.synthesis.paragraphs,
    "",
    state.synthesis.closing,
    "",
    "For personal reflection and entertainment only; not medical, legal, financial, or mental-health advice.",
  );

  return lines.join("\n");
}

async function copyReading() {
  if (state.phase !== "complete" || !state.synthesis) return;
  const copyText = buildCopyText();

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(copyText);
    } else {
      const temporaryField = document.createElement("textarea");
      temporaryField.value = copyText;
      temporaryField.setAttribute("readonly", "");
      temporaryField.className = "sr-only";
      document.body.append(temporaryField);
      temporaryField.select();
      const copied = document.execCommand("copy");
      temporaryField.remove();
      if (!copied) throw new Error("Copy command was unavailable.");
    }
    elements.copyStatus.textContent = "Reading copied to your clipboard.";
  } catch {
    elements.copyStatus.textContent = "Copy was unavailable. You can select the reading text above instead.";
  }
}

function resetReading() {
  state.phase = "setup";
  state.spreadDeck = [];
  state.cutPiles = [];
  state.draw = [];
  state.revealedCount = 0;
  state.synthesis = null;
  elements.cardTable.replaceChildren();
  elements.deckSpread.replaceChildren();
  elements.cutPiles.replaceChildren();
  elements.deckSpread.classList.remove("is-complete");
  elements.patternReading.replaceChildren();
  elements.readingSummary.hidden = true;
  elements.readingStage.hidden = true;
  elements.selectionStage.hidden = true;
  elements.cutStage.hidden = true;
  elements.setupPanel.hidden = false;
  elements.intentionDisplay.hidden = true;
  elements.copyStatus.textContent = "";
  setSetupDisabled(false);
  elements.shuffleButton.focus({ preventScroll: false });
  setStatus("The deck is ready for another reading.");
}

elements.intention.addEventListener("input", () => {
  normalizedIntention();
});
elements.hapticToggle.addEventListener("change", () => {
  if (!elements.hapticToggle.checked) cancelHaptics();
  setStatus(elements.hapticToggle.checked
    ? "Gentle tactile feedback is on when supported by this device."
    : "Gentle tactile feedback is off.");
});
document.addEventListener("pointermove", movePilePointerDrag);
document.addEventListener("pointerup", finishPilePointerDrag);
document.addEventListener("pointercancel", cancelPilePointerDrag);
elements.spreadInputs.forEach((input) => {
  input.addEventListener("change", toggleCustomSpreadBuilder);
});
elements.addCustomPositionButton.addEventListener("click", () => {
  const input = addCustomPosition();
  input?.focus({ preventScroll: false });
});
elements.openExplorerButton.addEventListener("click", openCardExplorer);
elements.closeExplorerButton.addEventListener("click", closeCardExplorer);
elements.cardExplorer.addEventListener("click", (event) => {
  if (event.target === elements.cardExplorer) closeCardExplorer();
});
elements.deckSpread.addEventListener("keydown", navigateDeck);
elements.shuffleButton.addEventListener("click", drawReading);
elements.copyButton.addEventListener("click", copyReading);
elements.resetButton.addEventListener("click", resetReading);

Array.from({ length: 3 }, () => "").forEach(addCustomPosition);
toggleCustomSpreadBuilder();
elements.hapticOption.hidden = !supportsVibration;
prefersReducedMotion.addEventListener?.("change", ({ matches }) => {
  if (matches) cancelHaptics();
});

if (!validateDeck(TAROT_DECK)) {
  elements.shuffleButton.disabled = true;
  elements.shuffleButtonLabel.textContent = "Deck unavailable";
  setStatus("The tarot deck could not be prepared. Please try reloading the page.");
} else {
  setStatus("The 78-card deck is ready.");
}
