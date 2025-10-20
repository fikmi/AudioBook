/* global speechSynthesis, SpeechSynthesisUtterance */
(function () {
  const uploadForm = document.getElementById('upload-form');
  const fileInput = document.getElementById('file');
  const messages = document.getElementById('messages');
  const meta = document.getElementById('meta');
  const reader = document.getElementById('reader');
  const voiceSelect = document.getElementById('voice');
  const rateSlider = document.getElementById('rate');
  const pitchSlider = document.getElementById('pitch');
  const volumeSlider = document.getElementById('volume');
  const rateValue = document.getElementById('rate-value');
  const pitchValue = document.getElementById('pitch-value');
  const volumeValue = document.getElementById('volume-value');
  const playBtn = document.getElementById('play');
  const pauseBtn = document.getElementById('pause');
  const resumeBtn = document.getElementById('resume');
  const stopBtn = document.getElementById('stop');

  const sentenceRegex = /(?<=[.!?])\s+|\n+/g;
  const speechSupported = 'speechSynthesis' in window;

  const state = {
    sentences: [],
    spans: [],
    currentIndex: 0,
    utterance: null,
    speaking: false,
    stopping: false
  };

  function showMessage(type, text) {
    messages.innerHTML = `<div class="alert alert-${type}" role="status">${text}</div>`;
  }

  function clearMessage() {
    messages.innerHTML = '';
  }

  function formDataIsValid() {
    if (!fileInput.files.length) {
      showMessage('warning', 'Veuillez choisir un fichier.');
      return false;
    }
    return true;
  }

  function categorizeVoice(name) {
    const lower = name.toLowerCase();
    if (/[ck]id|child|enfant/.test(lower)) {
      return 'Voix enfant';
    }
    if (/female|femme|woman|girl/.test(lower)) {
      return 'Voix féminines';
    }
    if (/male|homme|man|boy/.test(lower)) {
      return 'Voix masculines';
    }
    return 'Autres voix';
  }

  function populateVoices() {
    const voices = speechSynthesis.getVoices();
    if (!voices.length) {
      voiceSelect.innerHTML = '<option value="">Aucune voix disponible</option>';
      return;
    }
    const groups = new Map();
    voices.forEach((voice) => {
      const group = categorizeVoice(voice.name);
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group).push(voice);
    });

    voiceSelect.innerHTML = '';
    groups.forEach((groupVoices, label) => {
      const optGroup = document.createElement('optgroup');
      optGroup.label = label;
      groupVoices
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((voice) => {
          const option = document.createElement('option');
          option.value = voice.name;
          option.textContent = `${voice.name}${voice.lang ? ' (' + voice.lang + ')' : ''}`;
          optGroup.appendChild(option);
        });
      voiceSelect.appendChild(optGroup);
    });

    if (!voiceSelect.value && voices[0]) {
      voiceSelect.value = voices[0].name;
    }
  }

  function renderText(text) {
    reader.innerHTML = '';
    state.sentences = [];
    state.spans = [];
    state.currentIndex = 0;

    const paragraphs = text.split(/\n\n+/);
    paragraphs.forEach((paragraph) => {
      const p = document.createElement('p');
      p.setAttribute('role', 'presentation');
      const sentences = paragraph.split(sentenceRegex).filter((part) => part.trim().length);
      sentences.forEach((sentence, index) => {
        const span = document.createElement('span');
        span.className = 'sentence';
        span.dataset.index = String(state.sentences.length);
        span.textContent = sentence.trim() + (index < sentences.length - 1 ? ' ' : '');
        p.appendChild(span);
        state.sentences.push(span.textContent.trim());
        state.spans.push(span);
      });
      reader.appendChild(p);
    });
  }

  function highlightSentence(index) {
    state.spans.forEach((span) => span.classList.remove('current'));
    const target = state.spans[index];
    if (target) {
      target.classList.add('current');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function resetHighlight() {
    state.spans.forEach((span) => span.classList.remove('current'));
  }

  function getSelectedVoice() {
    const selected = voiceSelect.value;
    return speechSynthesis.getVoices().find((voice) => voice.name === selected) || null;
  }

  function cancelSpeech(resetIndex = true) {
    state.stopping = true;
    if (speechSupported) {
      speechSynthesis.cancel();
    }
    if (resetIndex) {
      state.currentIndex = 0;
    }
    state.speaking = false;
    state.utterance = null;
    resetHighlight();
    window.setTimeout(() => {
      state.stopping = false;
    }, 100);
  }

  function speakSentence(index) {
    if (index >= state.sentences.length) {
      cancelSpeech();
      return;
    }

    state.currentIndex = index;
    const sentence = state.sentences[index];
    if (!sentence) {
      cancelSpeech();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentence);
    const voice = getSelectedVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = parseFloat(rateSlider.value);
    utterance.pitch = parseFloat(pitchSlider.value);
    utterance.volume = parseFloat(volumeSlider.value);

    utterance.onstart = () => {
      state.speaking = true;
      highlightSentence(index);
    };

    utterance.onend = () => {
      if (state.stopping) {
        return;
      }
      speakSentence(index + 1);
    };

    utterance.onerror = (event) => {
      console.error('Erreur de synthèse vocale', event);
      showMessage('danger', 'Erreur de synthèse vocale : ' + (event.error || 'inconnue'));
      cancelSpeech();
    };

    state.utterance = utterance;
    speechSynthesis.speak(utterance);
  }

  function startReading() {
    if (!state.sentences.length) {
      showMessage('warning', 'Veuillez d\'abord extraire un document.');
      return;
    }
    cancelSpeech(false);
    speakSentence(state.currentIndex);
  }

  function pauseReading() {
    if (speechSupported && speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
    }
  }

  function resumeReading() {
    if (speechSupported && speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  }

  function stopReading() {
    if (speechSupported) {
      cancelSpeech();
    }
  }

  function restartCurrentSentence() {
    if (!state.speaking) {
      return;
    }
    const index = state.currentIndex;
    cancelSpeech(false);
    state.currentIndex = index;
    speakSentence(index);
  }

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage();
    if (!formDataIsValid()) {
      return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    showMessage('info', 'Extraction en cours...');

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Échec de l\'extraction.');
      }
      renderText(payload.text);
      meta.innerHTML = `Fichier : <strong>${payload.meta.filename}</strong><br>` +
        `Format : ${payload.meta.format.toUpperCase()}<br>` +
        `Longueur : ${payload.meta.length} caractères`;
      showMessage('success', 'Texte extrait avec succès.');
      reader.focus();
    } catch (error) {
      console.error(error);
      showMessage('danger', error.message || 'Erreur inconnue.');
      meta.textContent = '';
      reader.innerHTML = '';
      state.sentences = [];
      state.spans = [];
      cancelSpeech();
    }
  });

  playBtn.addEventListener('click', startReading);
  pauseBtn.addEventListener('click', pauseReading);
  resumeBtn.addEventListener('click', resumeReading);
  stopBtn.addEventListener('click', stopReading);

  [rateSlider, pitchSlider, volumeSlider].forEach((slider) => {
    slider.addEventListener('input', (event) => {
      const value = event.target.value;
      if (event.target === rateSlider) {
        rateValue.textContent = value;
      } else if (event.target === pitchSlider) {
        pitchValue.textContent = value;
      } else if (event.target === volumeSlider) {
        volumeValue.textContent = value;
      }
    });
    slider.addEventListener('change', restartCurrentSentence);
  });

  voiceSelect.addEventListener('change', restartCurrentSentence);

  if (speechSupported) {
    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;
  } else {
    voiceSelect.innerHTML = '<option value="">Synthèse vocale non supportée</option>';
    playBtn.disabled = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;
    showMessage('danger', 'Votre navigateur ne supporte pas la Web Speech API.');
  }
})();
