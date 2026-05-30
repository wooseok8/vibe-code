const display = document.getElementById('display');
const history = [];

function append(value) {
  display.value += value;
}

function clearAll() {
  display.value = '';
}

function backspace() {
  display.value = display.value.slice(0, -1);
}

function calculate() {
  const expression = display.value.trim();
  if (!expression) return;

  try {
    // * 와 / 는 eval이 처리, 화면 표시용 ÷ × − 는 변환 불필요 (버튼이 실제 기호 사용)
    const result = eval(expression);

    if (!isFinite(result)) throw new Error('infinity');

    const record = { expression, result };
    history.push(record);
    if (history.length > 5) history.shift();

    console.log('📋 최근 계산 기록:', history.map((h) => `${h.expression} = ${h.result}`));

    display.value = result;
  } catch {
    display.classList.add('shake');
    display.value = 'Error';
    setTimeout(() => {
      display.classList.remove('shake');
      display.value = '';
    }, 800);
  }
}

// 버튼 클릭
document.querySelectorAll('.btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.value;
    if (v === 'C') clearAll();
    else if (v === '⌫') backspace();
    else if (v === '=') calculate();
    else append(v);
  });
});

// 키보드 입력
document.addEventListener('keydown', (e) => {
  if (/^[0-9.]$/.test(e.key))          append(e.key);
  else if (['+', '-', '*', '/'].includes(e.key)) append(e.key);
  else if (e.key === '(' || e.key === ')') append(e.key);
  else if (e.key === 'Enter')           { e.preventDefault(); calculate(); }
  else if (e.key === 'Backspace')       backspace();
  else if (e.key === 'Escape')          clearAll();
});
