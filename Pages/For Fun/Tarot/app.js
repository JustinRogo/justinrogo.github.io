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
const usesMobileDeckLayout = window.matchMedia("(max-width: 440px)");
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
  gatherPilesButton: document.querySelector("#gatherPilesButton"),
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
  cutCount: 0,
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
  state.cutCount = 0;
  setSetupDisabled(true);
  elements.setupPanel.classList.add("is-shuffling");
  elements.shuffleButtonLabel.textContent = "Shuffling…";
  setStatus("The deck is being shuffled.");

  const shuffleDelay = prefersReducedMotion.matches ? 80 : 1050;
  window.setTimeout(showCutStage, shuffleDelay);
}

function cutPromptMessage() {
  if (state.cutCount === 0) {
    return "Tap the deck to make your first cut, or drag the whole deck to Begin here.";
  }
  if (state.cutCount === 1) {
    return "Tap a pile to cut once more, drag piles together, or drag a pile to Begin here.";
  }
  return "The deck has been cut twice. Drag piles together, or drag a pile to Begin here.";
}

function createCutPile(pile, pileIndex) {
  const isWholeDeck = state.cutPiles.length === 1;
  const pileName = isWholeDeck ? "Whole deck" : `Pile ${pileIndex + 1}`;
  const canCut = state.cutCount < 2 && pile.length > 1;
  const button = createElement("button", "deck-pile");
  button.type = "button";
  button.dataset.pileIndex = String(pileIndex);
  button.setAttribute("aria-label", canCut
    ? `${pileName}, ${pile.length} cards. Tap to cut this stack or drag it to begin.`
    : `${pileName}, ${pile.length} cards. Drag it onto another pile or to Begin here.`);

  const stack = createElement("span", "pile-stack");
  stack.setAttribute("aria-hidden", "true");
  stack.append(
    createElement("i", "pile-card"),
    createElement("i", "pile-card"),
    createElement("i", "pile-card"),
    createElement("b", "pile-symbol", "✦"),
  );
  button.append(stack, createElement("span", "pile-name", pileName));
  button.addEventListener("click", activateCutPile);
  button.addEventListener("pointerdown", beginPilePointerDrag);
  return button;
}

function renderCutPiles(message = cutPromptMessage()) {
  elements.cutPiles.replaceChildren();
  elements.cutPiles.style.setProperty("--pile-count", String(state.cutPiles.length));
  const fragment = document.createDocumentFragment();
  state.cutPiles.forEach((pile, index) => fragment.append(createCutPile(pile, index)));
  elements.cutPiles.append(fragment);
  elements.gatherPilesButton.hidden = state.cutPiles.length <= 1;
  elements.cutDropZone.classList.remove("is-ready", "is-over", "is-chosen");
  elements.cutStatus.textContent = message;
}

function showCutStage() {
  state.cutPiles = [state.spreadDeck];
  state.cutCount = 0;
  elements.setupPanel.hidden = true;
  elements.setupPanel.classList.remove("is-shuffling");
  elements.shuffleButtonLabel.textContent = "Shuffle the deck";
  elements.cutStage.hidden = false;
  elements.selectionStage.hidden = true;
  state.phase = "cutting";
  renderCutPiles();
  elements.cutTitle.focus({ preventScroll: true });
  setStatus("The shuffled deck is in one stack. Tap it to cut, or drag it into the begin-here circle.");
}

function cutPileAt(pileIndex) {
  if (state.phase !== "cutting" || state.cutCount >= 2) return;
  const pile = state.cutPiles[pileIndex];
  if (!pile || pile.length < 2) return;

  const cutPoint = Math.ceil(pile.length / 2);
  state.cutPiles.splice(pileIndex, 1, pile.slice(0, cutPoint), pile.slice(cutPoint));
  state.cutCount += 1;
  renderCutPiles(`Cut ${state.cutCount} of 2 complete. ${cutPromptMessage()}`);
  pulseHaptics(8);
  const firstNewPile = elements.cutPiles.querySelector(`[data-pile-index="${pileIndex}"]`);
  firstNewPile?.focus({ preventScroll: true });
  setStatus(`The deck has been cut ${state.cutCount === 1 ? "once" : "twice"}. ${state.cutPiles.length} piles are on the table.`);
}

function gatherCutPiles() {
  if (state.phase !== "cutting" || state.cutPiles.length <= 1) return;
  state.cutPiles = [state.cutPiles.flat()];
  renderCutPiles("The full deck is back in one stack. Drag it to Begin here.");
  pulseHaptics(10);
  elements.cutPiles.querySelector(".deck-pile")?.focus({ preventScroll: true });
  setStatus("All piles have been gathered into one deck.");
}

function mergeCutPiles(sourceIndex, targetIndex) {
  if (sourceIndex === targetIndex || !state.cutPiles[sourceIndex] || !state.cutPiles[targetIndex]) return;
  const draggedPile = state.cutPiles[sourceIndex];
  const remainingPiles = state.cutPiles.filter((unusedPile, index) => index !== sourceIndex);
  const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  remainingPiles[adjustedTargetIndex] = [...draggedPile, ...remainingPiles[adjustedTargetIndex]];
  state.cutPiles = remainingPiles;
  const pileWord = state.cutPiles.length === 1 ? "pile remains" : "piles remain";
  renderCutPiles(`The piles are restacked. ${state.cutPiles.length} ${pileWord}.`);
  pulseHaptics(10);
  elements.cutPiles.querySelector(`[data-pile-index="${adjustedTargetIndex}"]`)?.focus({ preventScroll: true });
  setStatus(`Two piles were restacked. ${state.cutPiles.length} ${pileWord}.`);
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
  const pileIndex = Number(event.currentTarget.dataset.pileIndex);
  if (state.cutCount < 2) {
    cutPileAt(pileIndex);
  } else {
    elements.cutStatus.textContent = cutPromptMessage();
  }
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

function pileIndexAtPoint(clientX, clientY, excludedIndex) {
  const pileButtons = [...elements.cutPiles.querySelectorAll(".deck-pile")];
  const target = pileButtons.find((pileButton) => {
    const pileIndex = Number(pileButton.dataset.pileIndex);
    if (pileIndex === excludedIndex) return false;
    const bounds = pileButton.getBoundingClientRect();
    return clientX >= bounds.left
      && clientX <= bounds.right
      && clientY >= bounds.top
      && clientY <= bounds.bottom;
  });
  return target ? Number(target.dataset.pileIndex) : -1;
}

function clearPileDropTargets() {
  elements.cutPiles.querySelectorAll(".is-drop-target").forEach((pile) => {
    pile.classList.remove("is-drop-target");
  });
}

function movePilePointerDrag(event) {
  if (!pilePointerDrag || event.pointerId !== pilePointerDrag.pointerId) return;
  event.preventDefault();
  const offsetX = event.clientX - pilePointerDrag.startX;
  const offsetY = event.clientY - pilePointerDrag.startY;
  if (Math.hypot(offsetX, offsetY) > 6) {
    pilePointerDrag.moved = true;
    elements.cutStatus.textContent = "Release over another pile to restack, or inside the circle to begin.";
  }
  pilePointerDrag.button.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(0.97)`;
  const sourceIndex = Number(pilePointerDrag.button.dataset.pileIndex);
  const overBegin = isPointerOverDropZone(event.clientX, event.clientY);
  const targetPileIndex = overBegin ? -1 : pileIndexAtPoint(event.clientX, event.clientY, sourceIndex);
  elements.cutDropZone.classList.toggle("is-over", overBegin);
  clearPileDropTargets();
  if (targetPileIndex >= 0) {
    elements.cutPiles.querySelector(`[data-pile-index="${targetPileIndex}"]`)?.classList.add("is-drop-target");
  }
}

function finishPilePointerDrag(event) {
  if (!pilePointerDrag || event.pointerId !== pilePointerDrag.pointerId) return;
  const { button, moved } = pilePointerDrag;
  const pileIndex = Number(button.dataset.pileIndex);
  const droppedToBegin = moved && isPointerOverDropZone(event.clientX, event.clientY);
  const targetPileIndex = moved && !droppedToBegin
    ? pileIndexAtPoint(event.clientX, event.clientY, pileIndex)
    : -1;
  button.releasePointerCapture?.(event.pointerId);
  button.classList.remove("is-dragging");
  button.style.removeProperty("transform");
  elements.cutDropZone.classList.remove("is-ready", "is-over");
  clearPileDropTargets();
  pilePointerDrag = null;

  if (moved) button.dataset.suppressClick = "true";
  if (droppedToBegin) {
    chooseCutPile(pileIndex);
  } else if (targetPileIndex >= 0) {
    mergeCutPiles(pileIndex, targetPileIndex);
  } else if (state.phase === "cutting") {
    elements.cutStatus.textContent = cutPromptMessage();
  }
}

function cancelPilePointerDrag(event) {
  if (!pilePointerDrag || event.pointerId !== pilePointerDrag.pointerId) return;
  const { button } = pilePointerDrag;
  button.classList.remove("is-dragging");
  button.style.removeProperty("transform");
  elements.cutDropZone.classList.remove("is-ready", "is-over");
  clearPileDropTargets();
  elements.cutStatus.textContent = cutPromptMessage();
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
  if (usesMobileDeckLayout.matches) {
    elements.selectionInstructions.textContent = targetCount === 1
      ? "Scroll down through the deck, then select the face-down card that draws your attention."
      : "Scroll down through the deck and choose one face-down card for each position in your spread.";
  } else {
    elements.selectionInstructions.textContent = targetCount === 1
      ? "The full deck is fanned before you. Select the face-down card that draws your attention."
      : "The full deck is fanned before you. Choose one face-down card for each position in your spread.";
  }
  elements.selectionCount.textContent = `0 of ${targetCount} ${targetCount === 1 ? "card" : "cards"} chosen`;
  renderDeckSpread();
  state.phase = "choosing";
  elements.selectionTitle.focus({ preventScroll: true });
  if (usesMobileDeckLayout.matches) {
    elements.selectionStage.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "start",
    });
  }
  setStatus(`The full deck is spread face down. Choose ${targetCount === 1 ? "one card" : `${targetCount} cards`}.`);
}

function renderDeckSpread() {
  elements.deckSpread.replaceChildren();
  elements.deckSpread.classList.remove("is-complete");
  const fanCenter = (state.spreadDeck.length - 1) / 2;
  const mobileRowStep = 2.8;
  const mobileRows = Math.ceil(state.spreadDeck.length / 2);
  elements.deckSpread.style.setProperty("--mobile-stack-height", `${((mobileRows - 1) * mobileRowStep) + 13}rem`);

  state.spreadDeck.forEach((unusedCard, index) => {
    const button = createElement("button", "deck-choice");
    const normalizedPosition = (index - fanCenter) / fanCenter;
    const mobileColumn = index % 2;
    const mobileRow = Math.floor(index / 2);
    button.type = "button";
    button.dataset.deckIndex = String(index);
    button.setAttribute("aria-label", `Choose card ${index + 1} of ${state.spreadDeck.length}`);
    button.style.setProperty("--fan-angle", `${normalizedPosition * 80}deg`);
    button.style.setProperty("--fan-angle-tablet", `${normalizedPosition * 72}deg`);
    button.style.setProperty("--fan-angle-mobile", `${normalizedPosition * 68}deg`);
    button.style.setProperty("--mobile-top", `${mobileRow * mobileRowStep}rem`);
    button.style.setProperty("--mobile-column-offset", `${mobileColumn ? 4.15 : -4.15}rem`);
    button.style.setProperty("--mobile-tilt", `${mobileColumn ? 2.5 : -2.5}deg`);
    button.style.setProperty("--stack-order", String(index + 1));
    button.style.setProperty("--deal-delay", `${Math.min(index * 5, 300)}ms`);
    button.append(createElement("span", "mini-card-symbol", "✦"));
    button.addEventListener("click", selectCard, { once: true });
    elements.deckSpread.append(button);
  });
}

function navigateDeck(event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const currentChoice = event.target.closest('.deck-choice');
  if (!currentChoice || currentChoice.disabled) return;

  const choices = [...elements.deckSpread.querySelectorAll('.deck-choice')];
  const currentIndex = choices.indexOf(currentChoice);
  let nextIndex = event.key === "Home" ? 0 : event.key === "End" ? choices.length - 1 : currentIndex;
  const delta = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
  if (delta) nextIndex += delta;

  while (nextIndex >= 0 && nextIndex < choices.length && choices[nextIndex].disabled) {
    nextIndex += delta || (event.key === "Home" ? 1 : -1);
  }

  if (nextIndex < 0 || nextIndex >= choices.length) return;
  event.preventDefault();
  choices[nextIndex].focus({ preventScroll: true });
  if (usesMobileDeckLayout.matches) {
    choices[nextIndex].scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "center",
    });
  }
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
    window.setTimeout(() => {
      nextChoice?.focus({ preventScroll: true });
      if (nextChoice && usesMobileDeckLayout.matches) {
        nextChoice.scrollIntoView({
          behavior: prefersReducedMotion.matches ? "auto" : "smooth",
          block: "center",
        });
      }
    }, prefersReducedMotion.matches ? 20 : 180);
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
  if (usesMobileDeckLayout.matches) {
    const firstSlot = elements.cardTable.querySelector('[data-card-index="0"]');
    const firstRevealButton = firstSlot?.querySelector(".reveal-button");
    firstSlot?.scrollIntoView({ behavior: "auto", block: "start" });
    firstRevealButton?.focus({ preventScroll: true });
  } else {
    elements.readingTitle.focus({ preventScroll: true });
  }
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

function readableList(items) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function faceForDraw(drawn) {
  return drawn.reversed ? drawn.card.reversed : drawn.card.upright;
}

function drawLabel(drawn) {
  return `${drawn.card.name}${drawn.reversed ? " reversed" : " upright"}`;
}

function lowerFirst(value) {
  if (!value) return "";
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

function transitionLead(previous, current) {
  if (previous.card.suit && previous.card.suit === current.card.suit) {
    return `Continuing the ${current.card.suit} thread`;
  }
  if (previous.reversed && !current.reversed) {
    return "Turning from inward work toward visible movement";
  }
  if (!previous.reversed && current.reversed) {
    return "Turning from outward movement toward something more private";
  }
  if (previous.card.arcana !== "major" && current.card.arcana === "major") {
    return "Widening the question into a larger life lesson";
  }
  if (previous.card.arcana === "major" && current.card.arcana !== "major") {
    return "Bringing that larger lesson into everyday life";
  }
  return "Moving the story forward";
}

function buildPatternParagraphs(entries) {
  const paragraphs = [];
  const majorEntries = entries.filter(({ card }) => card.arcana === "major");
  const reversedEntries = entries.filter(({ reversed }) => reversed);
  const uprightEntries = entries.filter(({ reversed }) => !reversed);
  const suitCounts = countBy(entries, ({ card }) => card.suit);
  const dominantSuitEntry = Object.entries(suitCounts).sort((a, b) => b[1] - a[1])[0];
  const courtEntries = entries.filter(({ card }) => COURT_RANKS.has(card.rank));

  if (majorEntries.length === 1) {
    const [major] = majorEntries;
    paragraphs.push(`${major.card.name} is the reading's Major Arcana hinge. Its place in ${major.position.name} gives that part of the spread a larger, longer-running lesson than the surrounding circumstances alone.`);
  } else if (majorEntries.length > 1) {
    const names = readableList(majorEntries.map(({ card }) => card.name));
    const positions = readableList(majorEntries.map(({ position }) => position.name));
    paragraphs.push(`The Major Arcana cards—${names}—occupy ${positions}. Those positions carry the reading's deepest changes, suggesting that their themes may outlast the immediate choice or conversation.`);
  }

  if (reversedEntries.length === entries.length) {
    paragraphs.push(`Every card turns inward: ${readableList(reversedEntries.map(drawLabel))}. The spread is asking for recognition and adjustment before it asks for a visible result.`);
  } else if (reversedEntries.length > 0) {
    const reversedNames = readableList(reversedEntries.map(({ card }) => card.name));
    const reversedPositions = readableList(reversedEntries.map(({ position }) => position.name));
    const uprightNames = readableList(uprightEntries.map(({ card }) => card.name));
    const reversedSubject = reversedEntries.length === 1 ? "The reversal" : "The reversals";
    const uprightSubject = uprightEntries.length === 1 ? "The upright card" : "The upright cards";
    paragraphs.push(`${reversedSubject}—${reversedNames}—${reversedEntries.length === 1 ? "sits" : "sit"} in ${reversedPositions}, locating ${reversedEntries.length === 1 ? "the place" : "the places"} where reflection or release may need to come first. ${uprightSubject}—${uprightNames}—${uprightEntries.length === 1 ? "shows" : "show"} where the reading has more direct outward momentum.`);
  }

  if (dominantSuitEntry?.[1] >= 2) {
    const [suit, count] = dominantSuitEntry;
    const suitEntries = entries.filter(({ card }) => card.suit === suit);
    const positions = readableList(suitEntries.map(({ position }) => position.name));
    paragraphs.push(`${suit} appears ${count} times, specifically in ${positions}. ${SUIT_PATTERNS[suit]} This repeated suit ties those positions together as one practical thread.`);
  }

  if (courtEntries.length > 0) {
    const names = readableList(courtEntries.map(({ card }) => card.name));
    paragraphs.push(`${names} ${courtEntries.length === 1 ? "adds" : "add"} a human role to the pattern. Consider whether ${courtEntries.length === 1 ? "this card describes a person around you or a quality" : "these cards describe people around you or qualities"} you are being asked to embody.`);
  }

  if (entries.length === 1 && entries[0].card.suit) {
    const [entry] = entries;
    paragraphs.push(`${entry.card.name} speaks through the suit of ${entry.card.suit}. ${SUIT_PATTERNS[entry.card.suit]} This grounds the card's message in a recognizable part of daily life.`);
  }

  if (paragraphs.length === 0 && entries.length > 1) {
    const firstKeywords = readableList(faceForDraw(entries[0]).keywords.slice(0, 2));
    const finalKeywords = readableList(faceForDraw(entries.at(-1)).keywords.slice(0, 2));
    paragraphs.push(`Across the full sequence, the language moves from ${firstKeywords} toward ${finalKeywords}. That shift is the spread's clearest pattern: the final position answers the atmosphere established by the first.`);
  }

  return paragraphs;
}

function buildSynthesis() {
  const entries = state.draw;
  const drawSize = entries.length;
  const paragraphs = [];
  const opening = entries[0];
  const openingFace = faceForDraw(opening);
  const openingContext = state.intention
    ? `With “${state.intention}” in mind`
    : `In this ${state.spread.label} reading`;

  paragraphs.push(`${openingContext}, ${drawLabel(opening)} occupies ${opening.position.name}, the place of ${lowerFirst(opening.position.subtitle)}. ${openingFace.meaning} Its keywords—${readableList(openingFace.keywords.slice(0, 3))}—name the atmosphere that the rest of the reading must answer.`);

  if (drawSize === 1) {
    paragraphs.push(`${opening.reversed ? "Because the card is reversed, its invitation begins with inward recognition" : "Because the card is upright, its invitation can be met through direct engagement"}. Its counsel is: ${openingFace.guidance}`);
    paragraphs.push(...buildPatternParagraphs(entries));
  } else {
    const groupSize = drawSize <= 5 ? 1 : drawSize <= 7 ? 2 : 3;
    for (let start = 1; start < entries.length; start += groupSize) {
      const group = entries.slice(start, start + groupSize);
      const sentences = group.map((entry, groupIndex) => {
        const absoluteIndex = start + groupIndex;
        const previous = entries[absoluteIndex - 1];
        const face = faceForDraw(entry);
        const orientationCounsel = entry.reversed
          ? `Reversed, its counsel turns inward: ${face.guidance}`
          : `Upright, it offers a direct way to respond: ${face.guidance}`;
        return `${transitionLead(previous, entry)}, ${drawLabel(entry)} enters ${entry.position.name}, a position concerned with ${lowerFirst(entry.position.subtitle)}. ${face.meaning} ${orientationCounsel}`;
      });
      paragraphs.push(sentences.join(" "));
    }

    paragraphs.push(...buildPatternParagraphs(entries));
  }

  const finalDraw = entries.at(-1);
  const finalFace = faceForDraw(finalDraw);
  const closing = drawSize === 1
    ? `A question to carry from ${finalDraw.card.name}: What would it look like to practice this counsel today? ${finalFace.guidance}`
    : `A question to carry from ${finalDraw.card.name}: How might its counsel reshape what ${opening.card.name} first brought into view in ${opening.position.name}? ${finalFace.guidance}`;

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
  state.cutCount = 0;
  state.draw = [];
  state.revealedCount = 0;
  state.synthesis = null;
  elements.cardTable.replaceChildren();
  elements.deckSpread.replaceChildren();
  elements.cutPiles.replaceChildren();
  elements.gatherPilesButton.hidden = true;
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
elements.gatherPilesButton.addEventListener("click", gatherCutPiles);
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

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" })
      .then(() => {
        document.documentElement.dataset.pwaStatus = "ready";
      })
      .catch(() => {
        document.documentElement.dataset.pwaStatus = "unavailable";
      });
  });
}
