document.addEventListener('DOMContentLoaded', function () {

  /* ─────────────────────────── initial state ─────────────────────────── */
  let processes = [
    { id: 1, name: "P1", arrivalTime: 0, burstTime: 10, priority: 2, color: "#FF5733", remainingTime: 10 },
    { id: 2, name: "P2", arrivalTime: 1, burstTime: 4,  priority: 1, color: "#33FF57", remainingTime: 4  },
    { id: 3, name: "P3", arrivalTime: 2, burstTime: 2,  priority: 3, color: "#3357FF", remainingTime: 2  },
    { id: 4, name: "P4", arrivalTime: 3, burstTime: 6,  priority: 4, color: "#F3FF33", remainingTime: 6  },
  ];

  let algorithm        = "fcfs";
  let isPreemptive     = false;
  let timeQuantum      = 2;
  let currentTime      = 0;
  let isRunning        = false;
  let speed            = 1000;
  let ganttChart       = [];
  let completionInfo   = [];
  let simulationComplete = false;

  /* RR-specific state */
  let rrQueue          = [];   // processes waiting their turn
  let currentProcess   = null; // process currently on CPU
  let quantumProgress  = 0;    // ticks used in current quantum
  let simulationTimer;

  const colors = [
    "#FF5733","#33FF57","#3357FF","#F3FF33",
    "#FF33F3","#33FFF3","#F333FF","#C70039",
    "#900C3F","#581845","#FFC300","#DAF7A6"
  ];

  /* ─────────────────────────── DOM refs ──────────────────────────────── */
  const algorithmSelect        = document.getElementById('algorithm');
  const preemptiveContainer    = document.getElementById('preemptive-container');
  const preemptiveSelect       = document.getElementById('preemptive');
  const timeQuantumContainer   = document.getElementById('time-quantum-container');
  const timeQuantumInput       = document.getElementById('time-quantum');
  const speedInput             = document.getElementById('speed');
  const speedValue             = document.getElementById('speed-value');
  const processNameInput       = document.getElementById('process-name');
  const arrivalTimeInput       = document.getElementById('arrival-time');
  const burstTimeInput         = document.getElementById('burst-time');
  const priorityInput          = document.getElementById('priority');
  const addProcessBtn          = document.getElementById('add-process-btn');
  const startBtn               = document.getElementById('start-btn');
  const stopBtn                = document.getElementById('stop-btn');
  const resetBtn               = document.getElementById('reset-btn');
  const processesTable         = document.getElementById('processes-tbody');
  const ganttChartEl           = document.getElementById('gantt-chart');
  const currentTimeEl          = document.getElementById('current-time');
  const currentProcessInfo     = document.getElementById('current-process-info');
  const queueDisplay           = document.getElementById('queue-display');
  const outputCard             = document.getElementById('output-card');
  const outputTable            = document.getElementById('output-tbody');

  /* ─────────────────────────── UI listeners ───────────────────────────── */
  algorithmSelect.addEventListener('change', function () {
    algorithm = this.value;
    preemptiveContainer.style.display  = (algorithm === 'fcfs' || algorithm === 'rr') ? 'none' : 'block';
    timeQuantumContainer.style.display = (algorithm === 'rr') ? 'block' : 'none';
  });

  preemptiveSelect.addEventListener('change', function () {
    isPreemptive = this.value === 'true';
  });

  timeQuantumInput.addEventListener('change', function () {
    timeQuantum = parseInt(this.value) || 1;
    if (timeQuantum < 1) { timeQuantum = 1; this.value = 1; }
  });

  speedInput.addEventListener('input', function () {
    speed = parseInt(this.value);
    speedValue.textContent = speed + 'ms';
  });

  addProcessBtn.addEventListener('click', function () {
    const name        = processNameInput.value.trim();
    const arrivalTime = parseInt(arrivalTimeInput.value) || 0;
    const burstTime   = parseInt(burstTimeInput.value)   || 1;
    const priority    = parseInt(priorityInput.value)    || 1;

    if (name && burstTime > 0) {
      const newId        = processes.length > 0 ? Math.max(...processes.map(p => p.id)) + 1 : 1;
      const processColor = colors[newId % colors.length];
      processes.push({ id: newId, name, arrivalTime, burstTime, priority, color: processColor, remainingTime: burstTime });
      processNameInput.value = '';
      updateProcessesTable();
    }
  });

  startBtn.addEventListener('click', function () {
    resetSimulation();
    isRunning = true;
    updateButtons();
    runSimulation();
  });

  stopBtn.addEventListener('click', function () {
    isRunning = false;
    updateButtons();
    clearTimeout(simulationTimer);
  });

  resetBtn.addEventListener('click', function () {
    resetSimulation();
    updateButtons();
  });

  /* ─────────────────────────── reset ──────────────────────────────────── */
  function resetSimulation() {
    currentTime      = 0;
    ganttChart       = [];
    isRunning        = false;
    simulationComplete = false;
    completionInfo   = [];
    currentProcess   = null;
    quantumProgress  = 0;
    rrQueue          = [];
    clearTimeout(simulationTimer);

    processes = processes.map(p => ({ ...p, remainingTime: p.burstTime }));

    updateCurrentTime();
    updateProcessesTable();
    updateGanttChart();
    updateCurrentProcessInfo();
    updateQueueDisplay();
    updateOutputTable();
  }

  function updateButtons() {
    startBtn.disabled = isRunning || processes.length === 0;
    stopBtn.disabled  = !isRunning;
  }

  function removeProcess(id) {
    processes = processes.filter(p => p.id !== id);
    updateProcessesTable();
  }

  /* ─────────────────────────── render helpers ────────────────────────── */
  function updateProcessesTable() {
    processesTable.innerHTML = '';
    processes.forEach(process => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      const nameDiv  = document.createElement('div');
      nameDiv.style.display    = 'flex';
      nameDiv.style.alignItems = 'center';
      const colorDiv = document.createElement('div');
      colorDiv.classList.add('process-color');
      colorDiv.style.backgroundColor = process.color;
      nameDiv.appendChild(colorDiv);
      nameDiv.appendChild(document.createTextNode(process.name));
      nameCell.appendChild(nameDiv);
      row.appendChild(nameCell);

      ['arrivalTime','burstTime','priority'].forEach(key => {
        const td = document.createElement('td');
        td.textContent = process[key];
        row.appendChild(td);
      });

      const remainingCell = document.createElement('td');
      const progressBar   = document.createElement('div');
      progressBar.classList.add('progress-bar');
      const progressFill = document.createElement('div');
      progressFill.classList.add('progress-bar-fill');
      progressFill.style.width           = `${(process.burstTime - process.remainingTime) / process.burstTime * 100}%`;
      progressFill.style.backgroundColor = process.color;
      const progressText = document.createElement('div');
      progressText.classList.add('progress-text');
      progressText.textContent = `${process.remainingTime}/${process.burstTime}`;
      progressBar.appendChild(progressFill);
      remainingCell.appendChild(progressBar);
      remainingCell.appendChild(progressText);
      row.appendChild(remainingCell);

      const actionsCell = document.createElement('td');
      const removeBtn   = document.createElement('button');
      removeBtn.classList.add('remove-btn');
      removeBtn.textContent = 'Remove';
      removeBtn.disabled    = isRunning;
      removeBtn.addEventListener('click', () => removeProcess(process.id));
      actionsCell.appendChild(removeBtn);
      row.appendChild(actionsCell);

      processesTable.appendChild(row);
    });
    updateButtons();
  }

  function updateGanttChart() {
    ganttChartEl.innerHTML = '';
    if (ganttChart.length === 0) {
      const msg = document.createElement('div');
      msg.classList.add('text-center','text-gray');
      msg.style.padding   = '16px';
      msg.textContent     = 'Gantt chart will appear here when simulation starts';
      ganttChartEl.appendChild(msg);
      return;
    }
    ganttChart.forEach((item, index) => {
      const ganttItem = document.createElement('div');
      ganttItem.classList.add('gantt-item');
      ganttItem.style.backgroundColor = item.color;
      ganttItem.style.minWidth        = '60px';

      const nameEl = document.createElement('div');
      nameEl.classList.add('gantt-process-name');
      nameEl.textContent = item.processName;
      nameEl.style.color = item.processId === "idle" ? "#000" : getContrastColor(item.color);

      const timeEl = document.createElement('div');
      timeEl.classList.add('gantt-time');
      timeEl.textContent = `${item.startTime} - ${item.endTime}`;
      timeEl.style.color = item.processId === "idle" ? "#000" : getContrastColor(item.color);

      ganttItem.appendChild(nameEl);
      ganttItem.appendChild(timeEl);

      const startMarker = document.createElement('div');
      startMarker.classList.add('time-marker');
      startMarker.style.left = '0';
      const startLabel = document.createElement('div');
      startLabel.classList.add('time-marker-label');
      startLabel.textContent = item.startTime;
      startLabel.style.left  = '0';
      ganttItem.appendChild(startMarker);
      ganttItem.appendChild(startLabel);

      if (index === ganttChart.length - 1) {
        const endMarker = document.createElement('div');
        endMarker.classList.add('time-marker');
        endMarker.style.right = '0';
        const endLabel = document.createElement('div');
        endLabel.classList.add('time-marker-label');
        endLabel.textContent = item.endTime;
        endLabel.style.right  = '0';
        ganttItem.appendChild(endMarker);
        ganttItem.appendChild(endLabel);
      }

      ganttChartEl.appendChild(ganttItem);
    });
  }

  function updateCurrentTime()        { currentTimeEl.textContent = currentTime; }

  function updateCurrentProcessInfo() {
    currentProcessInfo.innerHTML = '';
    if (!currentProcess) return;

    const infoDiv = document.createElement('div');
    infoDiv.classList.add('current-process-info');

    const nameDiv = document.createElement('div');
    nameDiv.style.fontWeight = '500';
    nameDiv.textContent = `Current Process: ${currentProcess.name}`;
    infoDiv.appendChild(nameDiv);

    if (algorithm === 'rr') {
      const qDiv = document.createElement('div');
      qDiv.style.fontSize = '14px';
      qDiv.classList.add('quantum-progress');
      qDiv.textContent = `Quantum Progress: ${quantumProgress}/${timeQuantum}`;

      const qBar  = document.createElement('div');
      qBar.classList.add('quantum-bar');
      const qFill = document.createElement('div');
      qFill.classList.add('quantum-bar-fill');
      qFill.style.width = `${(quantumProgress / timeQuantum) * 100}%`;
      qBar.appendChild(qFill);
      qDiv.appendChild(qBar);
      infoDiv.appendChild(qDiv);
    }

    currentProcessInfo.appendChild(infoDiv);
  }

  function updateQueueDisplay() {
    queueDisplay.innerHTML = '';
    if (algorithm !== 'rr' || rrQueue.length === 0) return;

    const queueDiv  = document.createElement('div');
    queueDiv.classList.add('queue-display');
    const titleDiv  = document.createElement('div');
    titleDiv.classList.add('queue-title');
    titleDiv.textContent = 'Ready Queue:';
    queueDiv.appendChild(titleDiv);

    const itemsDiv = document.createElement('div');
    itemsDiv.classList.add('queue-items');
    rrQueue.forEach(p => {
      const itemDiv = document.createElement('div');
      itemDiv.classList.add('queue-item');
      itemDiv.style.backgroundColor = p.color;
      itemDiv.style.color            = getContrastColor(p.color);
      itemDiv.textContent            = `${p.name} (${p.remainingTime})`;
      itemsDiv.appendChild(itemDiv);
    });

    queueDiv.appendChild(itemsDiv);
    queueDisplay.appendChild(queueDiv);
  }

  function updateOutputTable() {
    outputTable.innerHTML = '';
    if (completionInfo.length === 0) { outputCard.style.display = 'none'; return; }

    outputCard.style.display = 'block';
    completionInfo.forEach(info => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      const nameDiv  = document.createElement('div');
      nameDiv.style.display    = 'flex';
      nameDiv.style.alignItems = 'center';
      const colorDiv = document.createElement('div');
      colorDiv.classList.add('process-color');
      const proc = processes.find(p => p.id === info.id);
      colorDiv.style.backgroundColor = proc ? proc.color : 'gray';
      nameDiv.appendChild(colorDiv);
      nameDiv.appendChild(document.createTextNode(info.name));
      nameCell.appendChild(nameDiv);
      row.appendChild(nameCell);

      [info.completionTime, info.turnaroundTime, info.waitingTime].forEach(val => {
        const td = document.createElement('td');
        td.textContent = val;
        row.appendChild(td);
      });

      outputTable.appendChild(row);
    });

    const avg = calculateAverages();
    const avgRow = document.createElement('tr');
    avgRow.style.backgroundColor = '#f3f4f6';
    avgRow.style.fontWeight      = '500';
    [['Average'], ['-'], [avg.avgTurnaround], [avg.avgWaiting]].forEach(([v]) => {
      const td = document.createElement('td');
      td.textContent = v;
      avgRow.appendChild(td);
    });
    outputTable.appendChild(avgRow);
  }

  function calculateAverages() {
    if (completionInfo.length === 0) return { avgTurnaround: 0, avgWaiting: 0 };
    const tt = completionInfo.reduce((s, p) => s + p.turnaroundTime, 0);
    const wt = completionInfo.reduce((s, p) => s + p.waitingTime,    0);
    return {
      avgTurnaround: (tt / completionInfo.length).toFixed(2),
      avgWaiting:    (wt / completionInfo.length).toFixed(2)
    };
  }

  function getContrastColor(hex) {
    const r = parseInt(hex.substr(1,2),16);
    const g = parseInt(hex.substr(3,2),16);
    const b = parseInt(hex.substr(5,2),16);
    return ((0.299*r + 0.587*g + 0.114*b)/255) > 0.5 ? '#000000' : '#FFFFFF';
  }

  /* ═══════════════════════════════════════════════════════════════════════
     SIMULATION CORE
     ═══════════════════════════════════════════════════════════════════════ */

  function runSimulation() {
    if (!isRunning) return;

    /* all done? */
    if (processes.every(p => p.remainingTime === 0)) {
      isRunning = false;
      updateButtons();
      simulationComplete = true;
      updateOutputTable();
      return;
    }

    /* processes that have arrived AND still need CPU time */
    const arrived = processes.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);

    if (arrived.length === 0) {
      /* CPU idle */
      currentProcess = null;
      const last = ganttChart[ganttChart.length - 1];
      if (last && last.processId === "idle") {
        last.endTime = currentTime + 1;
      } else {
        ganttChart.push({ processId:"idle", processName:"Idle", startTime:currentTime, endTime:currentTime+1, color:"#E5E7EB" });
      }
      currentTime++;
      updateCurrentTime();
      updateGanttChart();
      simulationTimer = setTimeout(runSimulation, speed);
      return;
    }

    let next;
    switch (algorithm) {
      case 'fcfs':     next = pickFCFS(arrived);               break;
      case 'sjf':      next = pickSJF(arrived);                break;
      case 'priority': next = pickPriority(arrived);           break;
      case 'rr':       next = pickRoundRobin(arrived);         break;
      default:         next = pickFCFS(arrived);
    }

    if (next) executeProcess(next);

    simulationTimer = setTimeout(runSimulation, speed);
  }

  /* ── FCFS ── non-preemptive ──────────────────────────────────────────── */
  function pickFCFS(arrived) {
    if (currentProcess && currentProcess.remainingTime > 0) return currentProcess;
    const winner = arrived.slice().sort((a,b) => a.arrivalTime - b.arrivalTime)[0];
    currentProcess = winner;
    return winner;
  }

  /* ── SJF / SRTF ──────────────────────────────────────────────────────── */
  function pickSJF(arrived) {
    // Non-preemptive: keep running current process until it finishes
    if (!isPreemptive && currentProcess && currentProcess.remainingTime > 0) return currentProcess;

    // Preemptive (SRTF): every tick, pick the process with shortest remaining time
    const sorted = arrived.slice().sort((a,b) => {
      if (a.remainingTime !== b.remainingTime) return a.remainingTime - b.remainingTime;
      // On tie: prefer the already-running process to avoid needless context switch
      if (currentProcess) {
        if (a.id === currentProcess.id) return -1;
        if (b.id === currentProcess.id) return  1;
      }
      return a.arrivalTime - b.arrivalTime;
    });

    const winner = sorted[0];
    // KEY FIX: update currentProcess HERE so next tick's preemption check sees the right runner
    currentProcess = winner;
    return winner;
  }

  /* ── Priority ────────────────────────────────────────────────────────── */
  function pickPriority(arrived) {
    // Non-preemptive: keep running current process until it finishes
    if (!isPreemptive && currentProcess && currentProcess.remainingTime > 0) return currentProcess;

    // Preemptive: every tick, pick the highest-priority (lowest number) arrived process
    const sorted = arrived.slice().sort((a,b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      // On tie: prefer the already-running process
      if (currentProcess) {
        if (a.id === currentProcess.id) return -1;
        if (b.id === currentProcess.id) return  1;
      }
      return a.arrivalTime - b.arrivalTime;
    });

    const winner = sorted[0];
    // KEY FIX: update currentProcess HERE so next tick's preemption check sees the right runner
    currentProcess = winner;
    return winner;
  }

  /* ── Round Robin ─────────────────────────────────────────────────────── */
  /*
   * BUG FIXES:
   * 1. Enqueue newly arrived processes ONCE using a Set-like guard.
   * 2. Processes that are already complete (remainingTime === 0) are never enqueued.
   * 3. Context switch decision is clean: swap only when quantum expires or process finishes.
   * 4. After re-queuing the preempted process we immediately fetch the head of queue.
   * 5. quantumProgress incremented in executeProcess (after the tick), not here.
   */
  const rrEnqueued = new Set(); // track IDs ever added to the queue

  function pickRoundRobin(arrived) {
    /* Enqueue every newly arrived process exactly once */
    arrived.forEach(p => {
      if (!rrEnqueued.has(p.id)) {
        rrEnqueued.add(p.id);
        /* Don't add the process currently on the CPU – it's already "active" */
        if (!currentProcess || p.id !== currentProcess.id) {
          rrQueue.push(p);
        }
      }
    });

    const quantumExpired  = quantumProgress >= timeQuantum;
    const processDone     = currentProcess && currentProcess.remainingTime === 0;
    const noCurrent       = !currentProcess;

    const needSwitch = noCurrent || quantumExpired || processDone;

    if (needSwitch) {
      /* Re-queue current process if it was preempted mid-burst */
      if (currentProcess && currentProcess.remainingTime > 0 && quantumExpired) {
        rrQueue.push(currentProcess);
      }

      quantumProgress = 0;
      currentProcess  = null; // clear so executeProcess opens a new Gantt bar

      const next = rrQueue.shift() || null;
      currentProcess = next;
      updateQueueDisplay();
      return next;
    }

    updateQueueDisplay();
    return currentProcess;
  }

  /* ── Tick executor ───────────────────────────────────────────────────── */
  function executeProcess(process) {
    if (!process) return;

    const last = ganttChart[ganttChart.length - 1];

    if (last && last.processId === process.id) {
      last.endTime = currentTime + 1;          // extend existing segment
    } else {
      ganttChart.push({                        // open a new segment
        processId:   process.id,
        processName: process.name,
        startTime:   currentTime,
        endTime:     currentTime + 1,
        color:       process.color
      });
    }

    // currentProcess is set by pick functions (FCFS/SJF/Priority).
    // For RR, pickRoundRobin already sets currentProcess before returning.
    process.remainingTime--;
    currentTime++;

    if (algorithm === 'rr') quantumProgress++;

    if (process.remainingTime === 0) {
      const ct = currentTime;
      completionInfo.push({
        id:             process.id,
        name:           process.name,
        completionTime: ct,
        turnaroundTime: ct - process.arrivalTime,
        waitingTime:    ct - process.arrivalTime - process.burstTime
      });
      // Clear currentProcess so the next tick's pick function selects a new one.
      // This is needed for ALL algorithms — finished process must not be re-selected.
      currentProcess  = null;
      quantumProgress = 0;
    }

    updateCurrentTime();
    updateProcessesTable();
    updateGanttChart();
    updateCurrentProcessInfo();
  }

  /* ─────────────────────────── init ───────────────────────────────────── */
  updateProcessesTable();
  updateGanttChart();
});