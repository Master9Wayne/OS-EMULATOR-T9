document.addEventListener('DOMContentLoaded', function() {
    const processTypeSelect = document.getElementById('processType');
    const processCountInput = document.getElementById('processCount');
    const addProcessButton = document.getElementById('addProcess');
    const interruptTypeSelect = document.getElementById('interruptType');
    const prioritySelect = document.getElementById('priority');
    const interruptCountInput = document.getElementById('interruptCount');
    const addInterruptButton = document.getElementById('addInterrupt');
    const startDemoButton = document.getElementById('startDemo');
    const resetDemoButton = document.getElementById('resetDemo');
    const processQueuePreview = document.getElementById('processQueuePreview');
    const interruptQueuePreview = document.getElementById('interruptQueuePreview');
    const currentProcess = document.getElementById('currentProcess');
    const interruptStatus = document.getElementById('interruptStatus');
    const timelineContent = document.getElementById('timelineContent');
    const interruptInfo = document.getElementById('interruptInfo');

    let processes = [];
    let interrupts = [];
    let isDemoRunning = false;
    let currentTime = 0;
    let timelineData = [];

    // Process class
    class Process {
        constructor(type) {
            this.id = processCounter++;
            this.type = type;
            this.state = 'ready';
            this.arrivalTime = currentTime;
            this.burstTime = type === 'cpu' ? 5 : 3; // CPU-bound processes take longer
            this.remainingTime = this.burstTime;
            this.completionTime = null;
        }

        getDisplayName() {
            return `${this.type.toUpperCase()} Process ${this.id}`;
        }

        getStateColor() {
            switch(this.state) {
                case 'ready': return 'process-ready';
                case 'running': return 'process-running';
                case 'blocked': return 'process-blocked';
                case 'completed': return 'process-completed';
                default: return '';
            }
        }
    }

    // Interrupt class (updated)
    class Interrupt {
        constructor(type, priority) {
            this.id = interruptCounter++;
            this.type = type;
            this.priority = priority;
            this.state = 'pending';
            this.arrivalTime = currentTime;
            this.serviceTime = null;
            this.completionTime = null;
            this.priorityValue = this.getPriorityValue();
            this.affectedProcess = null;
        }

        getPriorityValue() {
            switch(this.priority) {
                case 'high': return 3;
                case 'medium': return 2;
                case 'low': return 1;
                default: return 1;
            }
        }

        getDisplayName() {
            return `${this.type.toUpperCase()} ${this.id} (${this.priority})`;
        }

        getStateColor() {
            switch(this.state) {
                case 'pending': return 'interrupt-pending';
                case 'servicing': return 'interrupt-servicing';
                case 'completed': return 'interrupt-completed';
                default: return '';
            }
        }
    }

    let processCounter = 1;
    let interruptCounter = 1;

    function addProcess() {
        const type = processTypeSelect.value;
        const count = parseInt(processCountInput.value);
        
        if (count < 1 || count > 5) {
            alert('Please enter a number between 1 and 5');
            return;
        }

        for (let i = 0; i < count; i++) {
            const process = new Process(type);
            processes.push(process);
        }

        updateProcessQueuePreview();
    }

    function addInterrupt() {
        const type = interruptTypeSelect.value;
        const priority = prioritySelect.value;
        const count = parseInt(interruptCountInput.value);
        
        if (count < 1 || count > 10) {
            alert('Please enter a number between 1 and 10');
            return;
        }

        for (let i = 0; i < count; i++) {
            const interrupt = new Interrupt(type, priority);
            interrupts.push(interrupt);
        }

        sortInterrupts();
        updateInterruptQueuePreview();
    }

    function sortInterrupts() {
        interrupts.sort((a, b) => {
            if (a.priorityValue !== b.priorityValue) {
                return b.priorityValue - a.priorityValue; // Higher priority first
            }
            return a.id - b.id; // If same priority, earlier interrupts first
        });
    }

    function updateProcessQueuePreview() {
        processQueuePreview.innerHTML = '';
        processes.forEach(process => {
            const processElement = document.createElement('div');
            processElement.className = `queue-preview-item ${process.getStateColor()}`;
            processElement.textContent = process.getDisplayName();
            processElement.style.cursor = 'pointer';
            processElement.addEventListener('click', () => showProcessDetails(process));
            processQueuePreview.appendChild(processElement);
        });
    }

    function updateInterruptQueuePreview() {
        interruptQueuePreview.innerHTML = '';
        interrupts.forEach(interrupt => {
            const interruptElement = document.createElement('div');
            interruptElement.className = `queue-preview-item ${interrupt.getStateColor()}`;
            interruptElement.textContent = interrupt.getDisplayName();
            interruptElement.style.cursor = 'pointer';
            interruptElement.addEventListener('click', () => showInterruptDetails(interrupt));
            interruptQueuePreview.appendChild(interruptElement);
        });
    }

    function showProcessDetails(process) {
        const details = `
            <h3>Process Details</h3>
            <p><strong>Type:</strong> ${process.type}</p>
            <p><strong>State:</strong> ${process.state}</p>
            <p><strong>Arrival Time:</strong> ${process.arrivalTime}</p>
            <p><strong>Burst Time:</strong> ${process.burstTime}</p>
            <p><strong>Remaining Time:</strong> ${process.remainingTime}</p>
            <p><strong>Completion Time:</strong> ${process.completionTime || 'Not completed'}</p>
        `;
        
        interruptInfo.innerHTML = details;
        interruptInfo.style.display = 'block';
    }

    function showInterruptDetails(interrupt) {
        const details = `
            <h3>Interrupt Details</h3>
            <p><strong>Type:</strong> ${interrupt.type}</p>
            <p><strong>Priority:</strong> ${interrupt.priority}</p>
            <p><strong>State:</strong> ${interrupt.state}</p>
            <p><strong>Arrival Time:</strong> ${interrupt.arrivalTime}</p>
            <p><strong>Completion Time:</strong> ${interrupt.completionTime || 'Not completed'}</p>
            <p><strong>Service Time:</strong> ${interrupt.serviceTime || 'Not serviced'}</p>
            <p><strong>Affected Process:</strong> ${interrupt.affectedProcess ? interrupt.affectedProcess.getDisplayName() : 'None'}</p>
        `;
        
        interruptInfo.innerHTML = details;
        interruptInfo.style.display = 'block';
    }

    function updateTimeline() {
        timelineContent.innerHTML = '';
        const timelineEvents = document.createElement('div');
        timelineEvents.className = 'timeline-events';

        timelineData.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = `timeline-event ${event.type}`;
            eventElement.innerHTML = `
                <div class="event-time">${event.time}</div>
                <div class="event-description">${event.description}</div>
            `;
            timelineEvents.appendChild(eventElement);
        });

        timelineContent.appendChild(timelineEvents);
    }

    function recordTimelineEvent(type, description) {
        timelineData.push({
            time: currentTime,
            type: type,
            description: description
        });
    }

    async function runDemo() {
        if (isDemoRunning || (processes.length === 0 && interrupts.length === 0)) return;
        isDemoRunning = true;
        startDemoButton.disabled = true;
        currentTime = 0;
        timelineData = [];

        while (processes.some(p => p.state !== 'completed') || interrupts.length > 0) {
            if (!isDemoRunning) break;

            // Check for interrupts first
            if (interrupts.length > 0) {
                const interrupt = interrupts[0];
                const currentProcess = processes.find(p => p.state === 'running');
                
                if (currentProcess) {
                    currentProcess.state = 'blocked';
                    interrupt.affectedProcess = currentProcess;
                }

                // Handle interrupt
                interrupt.state = 'servicing';
                recordTimelineEvent('interrupt', `Interrupt ${interrupt.getDisplayName()} occurred during ${currentProcess ? currentProcess.getDisplayName() : 'idle'}`);
                updateProcessQueuePreview();
                updateInterruptQueuePreview();

                // Simulate interrupt handling
                await new Promise(resolve => setTimeout(resolve, 1000));
                document.getElementById('step1').classList.add('active');
                await new Promise(resolve => setTimeout(resolve, 500));
                document.getElementById('step2').classList.add('active');
                await new Promise(resolve => setTimeout(resolve, 500));
                document.getElementById('step3').classList.add('active');
                await new Promise(resolve => setTimeout(resolve, 500));
                document.getElementById('step4').classList.add('active');
                await new Promise(resolve => setTimeout(resolve, 500));
                document.getElementById('step5').classList.add('active');
                await new Promise(resolve => setTimeout(resolve, 500));

                interrupt.state = 'completed';
                interrupt.completionTime = currentTime;
                interrupts.shift();

                if (currentProcess) {
                    currentProcess.state = 'ready';
                }

                document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
            }

            // Process scheduling
            const readyProcess = processes.find(p => p.state === 'ready');
            if (readyProcess) {
                readyProcess.state = 'running';
                recordTimelineEvent('process', `${readyProcess.getDisplayName()} started running`);
                updateProcessQueuePreview();

                // Simulate process execution
                await new Promise(resolve => setTimeout(resolve, 1000));
                readyProcess.remainingTime--;

                if (readyProcess.remainingTime <= 0) {
                    readyProcess.state = 'completed';
                    readyProcess.completionTime = currentTime;
                    recordTimelineEvent('process', `${readyProcess.getDisplayName()} completed`);
                } else {
                    readyProcess.state = 'ready';
                }
            }

            currentTime++;
            updateTimeline();
        }

        isDemoRunning = false;
        startDemoButton.disabled = false;
    }

    function resetDemo() {
        processes = [];
        interrupts = [];
        processCounter = 1;
        interruptCounter = 1;
        isDemoRunning = false;
        currentTime = 0;
        timelineData = [];
        currentProcess.textContent = 'Idle';
        interruptStatus.textContent = 'No Interrupt';
        document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
        updateProcessQueuePreview();
        updateInterruptQueuePreview();
        updateTimeline();
        startDemoButton.disabled = false;
    }

    addProcessButton.addEventListener('click', addProcess);
    addInterruptButton.addEventListener('click', addInterrupt);
    startDemoButton.addEventListener('click', runDemo);
    resetDemoButton.addEventListener('click', resetDemo);
}); 