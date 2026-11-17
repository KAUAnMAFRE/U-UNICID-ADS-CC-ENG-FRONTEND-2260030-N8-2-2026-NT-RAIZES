(() => {
  const main = document.querySelector('main');
  const menu = document.querySelector('nav');
  const widget = document.createElement('div');
  widget.className = 'accessibility-toolbar';
  widget.innerHTML = `
    <button class="accessibility-launcher" type="button" aria-expanded="false" aria-controls="accessibility-panel">
      Acessibilidade
    </button>
    <section class="accessibility-panel" id="accessibility-panel" aria-label="Opções de acessibilidade" hidden>
      <h2>Opções de acessibilidade</h2>
      <div class="accessibility-controls">
        <button type="button" data-action="contrast" aria-pressed="false">Alto contraste</button>
        <button type="button" data-action="dark" aria-pressed="false">Modo escuro</button>
        <button type="button" data-action="font-increase">Aumentar texto</button>
        <button type="button" data-action="font-decrease">Diminuir texto</button>
        <button type="button" data-action="spacing" aria-pressed="false">Espaçamento</button>
        <button type="button" data-action="font" aria-pressed="false">Fonte legível</button>
        <button type="button" data-action="read">Ler conteúdo</button>
        <button type="button" data-action="stop" disabled>Parar leitura</button>
      </div>
      <p class="accessibility-shortcuts">Atalhos: Alt+1 vai ao conteúdo; Alt+2 vai ao menu.</p>
      <a class="accessibility-page-link" href="/acessibilidade.html">Página de acessibilidade</a>
    </section>
    <p class="accessibility-status" aria-live="polite" aria-atomic="true"></p>
  `;
  const skipLink = document.querySelector('.skip-link');
  if (skipLink) skipLink.after(widget);
  else document.body.append(widget);

  const launcher = widget.querySelector('.accessibility-launcher');
  const panel = widget.querySelector('.accessibility-panel');
  const status = widget.querySelector('.accessibility-status');
  const buttons = new Map(
    [...panel.querySelectorAll('button[data-action]')].map(button => [button.dataset.action, button])
  );
  let fontScale = 100;
  let utterance;

  document.querySelectorAll('form').forEach(form => {
    form.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('invalid', () => {
        field.setAttribute('aria-invalid', 'true');
        const label = [...form.querySelectorAll('label[for]')].find(item => item.htmlFor === field.id);
        const fieldName = label ? label.innerText.trim() : field.name;
        announce(`${fieldName}: ${field.validationMessage}`);
      });
      field.addEventListener('input', () => {
        if (field.checkValidity()) field.removeAttribute('aria-invalid');
      });
      field.addEventListener('change', () => {
        if (field.checkValidity()) field.removeAttribute('aria-invalid');
      });
    });
  });

  const announce = message => {
    status.textContent = '';
    window.setTimeout(() => {
      status.textContent = message;
    }, 20);
  };

  function closePanel() {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
  }

  launcher.addEventListener('click', () => {
    const opening = panel.hidden;
    panel.hidden = !opening;
    launcher.setAttribute('aria-expanded', String(opening));
    if (opening) panel.querySelector('button:not(:disabled)').focus();
  });

  document.addEventListener('click', event => {
    if (!widget.contains(event.target) && !panel.hidden) closePanel();
  });

  // Permite fechar o painel com Esc e navegar ao conteudo ou menu usando Alt+1 e Alt+2.
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      closePanel();
      launcher.focus();
      return;
    }

    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === '1' && main) {
      event.preventDefault();
      main.setAttribute('tabindex', '-1');
      main.focus();
    } else if (event.key === '2' && menu) {
      event.preventDefault();
      const target = menu.querySelector('a, button');
      if (target) target.focus();
    }
  });

  buttons.get('contrast').addEventListener('click', event => {
    const enabled = document.body.classList.toggle('a11y-contrast');
    event.currentTarget.setAttribute('aria-pressed', String(enabled));
    event.currentTarget.textContent = `Alto contraste: ${enabled ? 'ativado' : 'desativado'}`;
    announce(enabled ? 'Alto contraste ativado.' : 'Alto contraste desativado.');
  });

  buttons.get('dark').addEventListener('click', event => {
    const enabled = document.body.classList.toggle('a11y-dark');
    event.currentTarget.setAttribute('aria-pressed', String(enabled));
    event.currentTarget.textContent = `Modo escuro: ${enabled ? 'ativado' : 'desativado'}`;
    announce(enabled ? 'Modo escuro ativado.' : 'Modo escuro desativado.');
  });

  buttons.get('font-increase').addEventListener('click', () => {
    fontScale = Math.min(200, fontScale + 10);
    document.documentElement.style.setProperty('--a11y-font-scale', `${fontScale}%`);
    announce(`Tamanho do texto: ${fontScale} por cento.`);
  });

  buttons.get('font-decrease').addEventListener('click', () => {
    fontScale = Math.max(100, fontScale - 10);
    document.documentElement.style.setProperty('--a11y-font-scale', `${fontScale}%`);
    announce(`Tamanho do texto: ${fontScale} por cento.`);
  });

  buttons.get('spacing').addEventListener('click', event => {
    const enabled = document.body.classList.toggle('a11y-spacing');
    event.currentTarget.setAttribute('aria-pressed', String(enabled));
    event.currentTarget.textContent = enabled ? 'Espaçamento ampliado' : 'Espaçamento padrão';
    announce(enabled ? 'Espaçamento ampliado.' : 'Espaçamento padrão restaurado.');
  });

  buttons.get('font').addEventListener('click', event => {
    const enabled = document.body.classList.toggle('a11y-readable-font');
    event.currentTarget.setAttribute('aria-pressed', String(enabled));
    event.currentTarget.textContent = enabled ? 'Fonte legível: ativada' : 'Fonte legível: desativada';
    announce(enabled ? 'Fonte legível ativada.' : 'Fonte original restaurada.');
  });

  buttons.get('read').addEventListener('click', () => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      announce('A leitura em voz alta não está disponível neste navegador.');
      return;
    }

    const content = main || document.body;
    const text = [...content.querySelectorAll('h1, h2, h3, h4, p, li, figcaption, label, button, a, img[alt]:not([alt=""])')]
      .filter(element => !widget.contains(element) && !element.closest('[hidden], [aria-hidden="true"]'))
      .map(element => element.innerText.trim())
      .filter(Boolean)
      .join('. ');
    if (!text) {
      announce('Não foi encontrado conteúdo para ler nesta página.');
      return;
    }

    utterance = null;
    window.speechSynthesis.cancel();
    const currentUtterance = new SpeechSynthesisUtterance(text);
    utterance = currentUtterance;
    currentUtterance.lang = document.documentElement.lang || 'pt-BR';
    currentUtterance.onend = () => {
      if (utterance !== currentUtterance) return;
      utterance = null;
      buttons.get('stop').disabled = true;
      announce('Leitura concluída.');
    };
    currentUtterance.onerror = () => {
      if (utterance !== currentUtterance) return;
      utterance = null;
      buttons.get('stop').disabled = true;
      announce('Não foi possível concluir a leitura em voz alta.');
    };
    buttons.get('stop').disabled = false;
    window.speechSynthesis.speak(currentUtterance);
    announce('Leitura em voz alta iniciada.');
  });

  buttons.get('stop').addEventListener('click', () => {
    utterance = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    buttons.get('stop').disabled = true;
    announce('Leitura em voz alta parada.');
  });
})();
