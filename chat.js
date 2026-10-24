// Website assistant widget. Talks to /api/chat; the conversation lives only in this page.
(function () {
  var PHONE = '781-331-2226';
  var PHONE_LINK = 'tel:7813312226';
  var GREETING = 'Hi! I can answer questions about our office, doctors, and what to expect at a visit. What would you like to know?';
  var FALLBACK = 'Sorry, the assistant isn\'t available right now. Please call us at ' + PHONE + '.';
  var SUGGESTIONS = ['Where are you located?', 'What happens at the first visit?', 'Do you take insurance?'];

  var history = [];
  var busy = false;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function build() {
    var launcher = el('button', 'chat-launcher', 'Questions? Ask us');
    launcher.type = 'button';
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-controls', 'chat-panel');

    var panel = el('div', 'chat-panel');
    panel.id = 'chat-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Website assistant');

    var header = el('div', 'chat-header');
    var title = el('div', 'chat-title');
    title.appendChild(el('strong', null, 'Weymouth Acupuncture'));
    title.appendChild(el('span', null, 'Automated assistant'));
    var close = el('button', 'chat-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close chat');
    header.appendChild(title);
    header.appendChild(close);

    var notice = el('div', 'chat-notice');
    notice.appendChild(el('p', null, 'This automated assistant answers general questions about our office. It can\'t give medical advice or book appointments.'));
    notice.appendChild(el('p', null, 'Please don\'t share personal health information here. For medical questions, call us at ' + PHONE + '. In an emergency, call 911.'));
    var agree = el('button', 'btn btn-primary chat-agree', 'OK, start chat');
    agree.type = 'button';
    notice.appendChild(agree);

    var log = el('div', 'chat-log');
    log.setAttribute('aria-live', 'polite');
    log.hidden = true;

    var form = el('form', 'chat-form');
    form.hidden = true;
    var input = el('input');
    input.type = 'text';
    input.maxLength = 500;
    input.placeholder = 'Type a question…';
    input.setAttribute('aria-label', 'Your question');
    input.autocomplete = 'off';
    var send = el('button', 'chat-send', 'Send');
    send.type = 'submit';
    form.appendChild(input);
    form.appendChild(send);

    var footer = el('a', 'chat-call', 'Call ' + PHONE);
    footer.href = PHONE_LINK;

    panel.appendChild(header);
    panel.appendChild(notice);
    panel.appendChild(log);
    panel.appendChild(form);
    panel.appendChild(footer);
    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    function setOpen(open) {
      panel.hidden = !open;
      launcher.hidden = open;
      launcher.setAttribute('aria-expanded', String(open));
      if (open) (form.hidden ? agree : input).focus();
      else launcher.focus();
    }

    function addMessage(role, text) {
      var bubble = el('div', 'chat-msg chat-msg-' + role, text);
      log.appendChild(bubble);
      log.scrollTop = log.scrollHeight;
      return bubble;
    }

    function ask(text) {
      if (busy || !text) return;
      busy = true;
      send.disabled = true;
      var chips = log.querySelector('.chat-suggestions');
      if (chips) chips.remove();

      addMessage('user', text);
      history.push({ role: 'user', content: text });
      var pending = addMessage('assistant', '…');
      pending.classList.add('chat-pending');

      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (data) {
          pending.textContent = data.reply;
          history.push({ role: 'assistant', content: data.reply });
        })
        .catch(function () {
          pending.textContent = FALLBACK;
          history.pop();
        })
        .then(function () {
          pending.classList.remove('chat-pending');
          log.scrollTop = log.scrollHeight;
          busy = false;
          send.disabled = false;
          input.focus();
        });
    }

    launcher.addEventListener('click', function () { setOpen(true); });
    close.addEventListener('click', function () { setOpen(false); });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });

    agree.addEventListener('click', function () {
      notice.hidden = true;
      log.hidden = false;
      form.hidden = false;
      addMessage('assistant', GREETING);
      var chips = el('div', 'chat-suggestions');
      SUGGESTIONS.forEach(function (q) {
        var chip = el('button', 'chat-chip', q);
        chip.type = 'button';
        chip.addEventListener('click', function () { ask(q); });
        chips.appendChild(chip);
      });
      log.appendChild(chips);
      input.focus();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value.trim();
      input.value = '';
      ask(text);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
