document.addEventListener('DOMContentLoaded', function() {
    const threadTypeSelect = document.getElementById('threadType');
    const prioritySelect = document.getElementById('priority');
    const createThreadButton = document.getElementById('createThread');
    const startSimulationButton = document.getElementById('startSimulation');
    const resetSimulationButton = document.getElementById('resetSimulation');
    const threadsList = document.getElementById('threadsList');
    const currentThread = document.getElementById('currentThread');
    const readyQueue = document.getElementById('readyQueue');
    const runningQueue = document.getElementById('runningQueue');
    const blockedQueue = document.getElementById('blockedQueue');
    const threadInfo = document.getElementById('threadInfo');
    const timeSlots = document.getElementById('timeSlots');
    const ganttContent = document.getElementById('ganttContent');
    const completionTimeSelect = document.getElementById('completionTime');

    let threads = [];
    let isSimulationRunning = false;
    let currentThreadIndex = 0;
    let threadCounter = 1;
    let currentTime = 0;
    let ganttData = [];
    const MAX_TIME_SLOTS = 30;
    const COMPLETION_THRESHOLD = 5;

    // Thread class
    class Thread {
        constructor(type, priority, completionThreshold) {
            this.id = threadCounter++;
            this.type = type;
            this.priority = priority;
            this.state = 'ready';
            this.creationTime = new Date();
            this.lastRunTime = null;
            this.totalRunTime = 0;
            this.waitingTime = 0;
            this.priorityValue = this.getPriorityValue();
            this.runCount = 0;
            this.completionTime = null;
            this.completionThreshold = completionThreshold;
        }

        getPriorityValue() {
            switch(this.priority) {
                case 'high': return 3;
                case 'medium': return 2;
                case 'low': return 1;
                default: return 1;
            }
        }

        getStateColor() {
            switch(this.state) {
                case 'ready': return 'thread-ready';
                case 'running': return 'thread-running';
                case 'blocked': return 'thread-blocked';
                default: return '';
            }
        }

        getDisplayName() {
            const status = this.isCompleted() ? ' ✓' : '';
            return `${this.type.toUpperCase()} ${this.id} (${this.priority})${status}`;
        }

        updateWaitingTime() {
            if (this.state === 'ready') {
                this.waitingTime += 100;
            }
        }

        isCompleted() {
            return this.runCount >= this.completionThreshold;
        }
    }

    function createThread() {
        const type = threadTypeSelect.value;
        const priority = prioritySelect.value;
        const completionThreshold = parseInt(completionTimeSelect.value);
        const thread = new Thread(type, priority, completionThreshold);
        threads.push(thread);
        updateThreadDisplay();
    }

    function updateThreadDisplay() {
        threadsList.innerHTML = '';
        threads.forEach(thread => {
            const threadElement = document.createElement('div');
            threadElement.className = `thread-item ${thread.getStateColor()}`;
            
            const runsLeft = thread.completionThreshold - thread.runCount;
            const status = thread.isCompleted() ? '✓' : `${runsLeft}/${thread.completionThreshold} runs`;
            
            threadElement.innerHTML = `
                <div>${thread.getDisplayName()}</div>
                <div class="thread-status">${status}</div>
            `;
            
            threadElement.addEventListener('click', () => showThreadInfo(thread));
            threadsList.appendChild(threadElement);
        });
    }

    function showThreadInfo(thread) {
        const info = `
            <h3>${thread.getDisplayName()}</h3>
            <p><strong>Type:</strong> ${thread.type === 'ult' ? 'User-Level Thread' : 'Kernel-Level Thread'}</p>
            <p><strong>Priority:</strong> ${thread.priority}</p>
            <p><strong>State:</strong> ${thread.state}</p>
            <p><strong>Created:</strong> ${thread.creationTime.toLocaleTimeString()}</p>
            <p><strong>Last Run:</strong> ${thread.lastRunTime ? thread.lastRunTime.toLocaleTimeString() : 'Never'}</p>
            <p><strong>Total Run Time:</strong> ${thread.totalRunTime}ms</p>
        `;
        threadInfo.innerHTML = info;
    }

    function updateQueues() {
        readyQueue.innerHTML = '';
        runningQueue.innerHTML = '';
        blockedQueue.innerHTML = '';

        threads.forEach(thread => {
            const queueItem = document.createElement('div');
            queueItem.className = `queue-item ${thread.getStateColor()}`;
            queueItem.textContent = thread.getDisplayName();

            switch(thread.state) {
                case 'ready':
                    readyQueue.appendChild(queueItem);
                    break;
                case 'running':
                    runningQueue.appendChild(queueItem);
                    break;
                case 'blocked':
                    blockedQueue.appendChild(queueItem);
                    break;
            }
        });
    }

    function updateGanttChart() {
        // Update time slots
        timeSlots.innerHTML = '';
        for (let i = 0; i <= currentTime; i++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = i;
            timeSlots.appendChild(timeSlot);
        }

        // Update thread rows
        ganttContent.innerHTML = '';
        threads.forEach(thread => {
            const row = document.createElement('div');
            row.className = 'gantt-row';
            
            const label = document.createElement('div');
            label.className = 'thread-label';
            label.textContent = thread.getDisplayName();
            row.appendChild(label);
            
            const blocks = document.createElement('div');
            blocks.className = 'gantt-blocks';
            
            // Create blocks for each time slot
            for (let i = 0; i <= currentTime; i++) {
                const block = document.createElement('div');
                block.className = 'gantt-block';
                
                // Find the state at this time
                const stateAtTime = ganttData.find(d => 
                    d.time === i && d.threadId === thread.id
                );
                
                if (stateAtTime) {
                    block.classList.add(stateAtTime.state);
                    if (thread.isCompleted() && i >= thread.completionTime) {
                        block.classList.add('completed');
                    }
                    block.textContent = stateAtTime.state.charAt(0).toUpperCase();
                } else {
                    block.classList.add('idle');
                }

                // Add completion time marker
                if (thread.completionTime === i) {
                    const completionMarker = document.createElement('div');
                    completionMarker.className = 'completion-time';
                    completionMarker.textContent = '✓';
                    block.appendChild(completionMarker);
                }
                
                blocks.appendChild(block);
            }
            
            row.appendChild(blocks);
            ganttContent.appendChild(row);
        });
    }

    function recordThreadState(thread, state) {
        // Remove any existing state for this thread at current time
        ganttData = ganttData.filter(d => !(d.time === currentTime && d.threadId === thread.id));
        
        // Add new state
        ganttData.push({
            time: currentTime,
            threadId: thread.id,
            state: state
        });
    }

    async function runSimulation() {
        if (isSimulationRunning || threads.length === 0) return;
        isSimulationRunning = true;
        startSimulationButton.disabled = true;
        currentTime = 0;
        ganttData = [];

        while (isSimulationRunning) {
            // Check if all threads are completed
            const allCompleted = threads.every(thread => thread.isCompleted());
            if (allCompleted) {
                isSimulationRunning = false;
                break;
            }

            // Update waiting times for all ready threads
            threads.forEach(thread => {
                if (!thread.isCompleted()) {
                    thread.updateWaitingTime();
                }
            });

            // Sort threads by priority and waiting time
            const sortedThreads = [...threads]
                .filter(thread => !thread.isCompleted())
                .sort((a, b) => {
                    if (a.priorityValue !== b.priorityValue) {
                        return b.priorityValue - a.priorityValue;
                    }
                    return b.waitingTime - a.waitingTime;
                });

            // Find next ready thread
            const nextThread = sortedThreads.find(t => t.state === 'ready');
            if (!nextThread) {
                // If no ready threads but some are not completed, continue
                if (threads.some(t => !t.isCompleted())) {
                    currentTime++;
                    updateGanttChart();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    continue;
                }
                break;
            }

            // Record current states
            threads.forEach(thread => {
                recordThreadState(thread, thread.state);
            });

            // Handle ULT vs KLT behavior
            if (nextThread.type === 'ult') {
                threads.forEach(t => {
                    if (t.type === 'ult' && !t.isCompleted()) {
                        if (t.state === 'running') t.state = 'ready';
                    }
                });
            } else {
                threads.forEach(t => {
                    if (!t.isCompleted() && t.state === 'running') {
                        t.state = 'ready';
                    }
                });
            }

            nextThread.state = 'running';
            nextThread.lastRunTime = new Date();
            nextThread.waitingTime = 0;
            nextThread.runCount++;

            // Check if thread is completed
            if (nextThread.isCompleted() && !nextThread.completionTime) {
                nextThread.completionTime = currentTime;
            }

            // Update display
            currentThread.textContent = nextThread.getDisplayName();
            updateThreadDisplay();
            updateQueues();
            updateGanttChart();

            // Simulate thread execution (shorter time)
            await new Promise(resolve => setTimeout(resolve, 1000));
            currentTime++;

            // Update run time
            nextThread.totalRunTime += 1000;

            // Handle blocking based on thread type
            if (!nextThread.isCompleted() && Math.random() < 0.3) {
                if (nextThread.type === 'ult') {
                    threads.forEach(t => {
                        if (t.type === 'ult' && !t.isCompleted()) {
                            t.state = 'blocked';
                        }
                    });
                } else {
                    nextThread.state = 'blocked';
                }
                
                updateThreadDisplay();
                updateQueues();
                updateGanttChart();
                
                // Simulate blocking (shorter time)
                const blockTime = 2 + Math.random() * 2;
                for (let i = 0; i < blockTime; i++) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    currentTime++;
                    updateGanttChart();
                }
                
                if (nextThread.type === 'ult') {
                    threads.forEach(t => {
                        if (t.type === 'ult' && !t.isCompleted()) {
                            t.state = 'ready';
                        }
                    });
                } else {
                    nextThread.state = 'ready';
                }
                
                updateThreadDisplay();
                updateQueues();
                updateGanttChart();
            }

            // Stop if we've reached max time slots
            if (currentTime >= MAX_TIME_SLOTS) {
                isSimulationRunning = false;
                break;
            }
        }

        isSimulationRunning = false;
        startSimulationButton.disabled = false;
        currentThread.textContent = 'Idle';
    }

    function resetSimulation() {
        threads = [];
        threadCounter = 1;
        isSimulationRunning = false;
        currentThreadIndex = 0;
        currentTime = 0;
        ganttData = [];
        currentThread.textContent = 'Idle';
        updateThreadDisplay();
        updateQueues();
        updateGanttChart();
        threadInfo.innerHTML = '<p>Select a thread to view its details</p>';
        startSimulationButton.disabled = false;
    }

    // Event listeners
    createThreadButton.addEventListener('click', createThread);
    startSimulationButton.addEventListener('click', runSimulation);
    resetSimulationButton.addEventListener('click', resetSimulation);
}); 